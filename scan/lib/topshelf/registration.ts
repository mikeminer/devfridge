import {randomBytes} from 'node:crypto';
import {Wallet, getAddress, hexlify, keccak256, toUtf8Bytes, ZeroAddress, ZeroHash} from 'ethers';
import {PublicKey} from '@solana/web3.js';
import nacl from 'tweetnacl';
import {locksForDepositor} from '../fridge';
import {shelfConnection} from './server';
import {TOPSHELF_CHAIN} from './config';
import {RegistrationError, seal, unseal, scoreStore, scoreRateLimit} from './registration-security';
import {SCORE_TYPES, registrationMessage, type RunTicket, type ScoreChallenge} from './score-protocol';
import rules from './engine/rules.json';
import tokens from './engine/tokens.json';
import {dailySeed} from './engine/core';
import {createLiveRun,advanceLiveRun,finishedLiveRun} from './live-run';
import {assertNotExcluded,appendLog} from '../world-compliance';

function credentials() {
 const key=process.env.TOPSHELF_VERIFIER_PRIVATE_KEY,secret=process.env.TOPSHELF_RUN_SECRET;
 if(!key||!secret||secret.length<32||!process.env.KV_REST_API_URL||!process.env.KV_REST_API_TOKEN)throw new RegistrationError('Score registration is being configured. Playing is free.',503);
 return {signer:new Wallet(key),secret};
}
type Connection=NonNullable<ReturnType<typeof shelfConnection>>;
let readyCache:{season:number;expires:number}|null=null;
async function ready(c:Connection,signer:Wallet) {
 if(readyCache&&readyCache.expires>Date.now())return readyCache.season;
 const [chain,verifier,season,paused]=await Promise.all([c.provider.send('eth_chainId',[]),c.contract.verifier(),c.contract.currentSeason(),c.contract.paused()]);
 if(Number(BigInt(chain))!==TOPSHELF_CHAIN)throw new RegistrationError('Score network unavailable.',503);
 if(getAddress(verifier)!==signer.address)throw new RegistrationError('Score registration is awaiting owner activation. Playing is free.',503);
 if(paused||Number((await c.contract.seasons(season)).phase)!==0)throw new RegistrationError('Score registration is paused for this season.',409);
 readyCache={season:Number(season),expires:Date.now()+10_000};
 return readyCache.season;
}
const lockOk=new Map<string,{expires:number}>();
async function timelock(wallet:string,character:number) {
 const token=tokens.find(t=>t.tier===character);if(!token)throw new RegistrationError('Invalid character');
 const cacheKey=`${wallet}:${token.mint}`;
 const cached=lockOk.get(cacheKey);
 if(cached&&cached.expires>Date.now())return;
 const locks=await locksForDepositor(wallet),seen=new Set<string>();let amount=0n;
 for(const lock of locks)if(lock.depositor===wallet&&lock.mint===token.mint&&lock.unlockAt>Date.now()/1000&&!seen.has(lock.address)) {seen.add(lock.address);amount+=BigInt(lock.amount);}
 if(amount<500000n*10n**BigInt(token.decimals))throw new RegistrationError('Could not verify 500,000 active timelocked tokens of this character in DevFridge.',403);
 lockOk.set(cacheKey,{expires:Date.now()+15_000});
}
function walletAddress(value:unknown) {
 try {if(typeof value!=='string')throw Error();const key=new PublicKey(value);if(!PublicKey.isOnCurve(key.toBytes()))throw Error();return key.toBase58();}catch{throw new RegistrationError('Invalid Solana wallet');}
}
function evmAddress(value:unknown) {try {if(typeof value!=='string')throw Error();const a=getAddress(value);if(a===ZeroAddress)throw Error();return a;}catch{throw new RegistrationError('Invalid Robinhood address');}}
async function quote(c:Connection,token:string) {
 const [enabled,fee]=await Promise.all([c.contract.acceptedToken(token),c.contract.feeAmount(token)]);
 if(!enabled||fee<=0n)throw new RegistrationError('This payment token is disabled. Refresh the token list.',409);
 return String(fee);
}
async function checkLink(c:Connection,t:RunTicket,player:string) {
 const solana=hexlify(new PublicKey(t.wallet).toBytes());
 const [used,linkedSolana,linkedPlayer]=await Promise.all([c.contract.usedRun(t.runId),c.contract.playerSolana(player),c.contract.solanaPlayer(solana)]);
 if(used)throw new RegistrationError('This run is already registered. No new payment is needed.',409);
 if((linkedSolana!==ZeroHash&&linkedSolana.toLowerCase()!==solana.toLowerCase())||(linkedPlayer!==ZeroAddress&&getAddress(linkedPlayer)!==player))throw new RegistrationError('These wallets do not match the permanent TopShelf wallet link.',409);
 return solana;
}
async function insertionHint(c:Connection,season:number,player:string,score:number) {
 const block=await c.provider.getBlockNumber(),opts={blockTag:block};
 const own=await c.contract.players(season,player,opts);
 if(own.runs>0n&&BigInt(score)<=own.bestScore)return ZeroAddress;
 let cursor=ZeroAddress,previous=ZeroAddress;const started=Date.now();
 do {
  const page=await c.contract.leaderboard(season,cursor,100,opts);
  for(let i=0;i<page[0].length;i++) {
   const who=getAddress(page[0][i]);if(who===player)continue;
   if(page[1][i]<BigInt(score)||(page[1][i]===BigInt(score)&&BigInt(who)>BigInt(player)))return previous;
   previous=who;
  }
  cursor=page[2];if(Date.now()-started>15000)throw new RegistrationError('The leaderboard is busy. Please retry.',503);
 }while(cursor!==ZeroAddress);
 return previous;
}
export async function registrationStatus() {
 let c:Connection|null=null;
 try {
  const {signer}=credentials();c=shelfConnection();if(!c)throw new RegistrationError('TopShelf is not configured.',503);
  const season=await ready(c,signer);
  return {ready:true,season,address:c.address,chainId:TOPSHELF_CHAIN,verifier:signer.address,rules:rules.id};
 }catch(e){return {ready:false,reason:e instanceof RegistrationError?e.message:'Score verification is temporarily unavailable. Playing is free.',rules:rules.id};}
 finally{c?.provider.destroy();}
}
export async function registerAction(body:Record<string,unknown>,ip:string) {
 const {signer,secret}=credentials();
 const live=body.action==='move'||body.action==='finish';
 await scoreRateLimit(`ip:${live?'live:':''}${ip}`,live?1200:120);
 const c=shelfConnection();if(!c)throw new RegistrationError('TopShelf is not configured.',503);
 try {
  if(body.action==='start') {
   const wallet=walletAddress(body.wallet),character=Number(body.character);
   if(body.liveVersion!==2||!Number.isInteger(character)||character<1||character>10||body.rules!==rules.id||body.seed!==dailySeed())throw new RegistrationError('The game has updated. Reload before starting a live run.',409);
   await scoreRateLimit(`start:${wallet}`,20);
   await assertNotExcluded(wallet);
   const season=await ready(c,signer);await timelock(wallet,character);
   const issued=Date.now();
   const ticket:RunTicket={kind:'run',liveVersion:2,runId:hexlify(randomBytes(32)),wallet,character,seed:Number(body.seed),season,rules:rules.id,issued,expires:issued+6*3600000,contract:c.address};
   const liveState=await createLiveRun(ticket);
   return {ticket:seal(ticket,secret),runId:ticket.runId,season,expires:ticket.expires,liveVersion:2,...liveState};
  }
  if(!live&&body.action!=='challenge'&&body.action!=='authorize')throw new RegistrationError('Unknown registration action');
  const t=unseal<RunTicket>(body.ticket,secret,'run');
  if(t.liveVersion!==2||t.rules!==rules.id||t.contract!==c.address)throw new RegistrationError('This run predates live verification. Start a new run.',409);
  if(live){
    await scoreRateLimit(`live:${t.runId}`,240);
    await assertNotExcluded(t.wallet);
    const ack=await advanceLiveRun(t,body);
    try { await appendLog(t.runId,{action:body.action,tick:body.tick,x:body.x,score:body.score,sequence:body.sequence}); } catch {}
    return ack;
  }
  const input=await finishedLiveRun(t,body);
  if(body.action==='challenge') {
   const player=evmAddress(body.player),token=evmAddress(body.token);
   if(await ready(c,signer)!==t.season)throw new RegistrationError('This run belongs to a closed season.',409);
   await checkLink(c,t,player);
   const amount=await quote(c,token);
   const challenge:ScoreChallenge={kind:'score',runId:t.runId,wallet:t.wallet,player,season:t.season,hash:input.hash,token,amount,score:input.score,ticks:input.ticks,expires:Date.now()+5*60000,contract:c.address};
   return {challenge:seal(challenge,secret),message:registrationMessage(challenge),amount};
  }
  const challenge=unseal<ScoreChallenge>(body.challenge,secret,'score');
  if(challenge.runId!==t.runId||challenge.wallet!==t.wallet||challenge.season!==t.season||challenge.contract!==c.address||challenge.hash!==input.hash||challenge.ticks!==input.ticks||challenge.score!==input.score)throw new RegistrationError('Score authorization does not match this run.');
  const signature=typeof body.signature==='string'&&body.signature.length<200?Buffer.from(body.signature,'base64'):new Uint8Array();
  if(signature.length!==64||!nacl.sign.detached.verify(toUtf8Bytes(registrationMessage(challenge)),signature,new PublicKey(t.wallet).toBytes()))throw new RegistrationError('Solana wallet signature could not be verified.',403);
  await scoreRateLimit(`verify:${t.wallet}`,20);
  if(await ready(c,signer)!==t.season)throw new RegistrationError('This run belongs to a closed season.',409);
  const solanaWallet=await checkLink(c,t,challenge.player);
  await timelock(t.wallet,t.character);
  const proofKey=`topshelf:proof:${TOPSHELF_CHAIN}:${c.address}:${t.runId}`,lockKey=`${proofKey}:lock`,lockValue=hexlify(randomBytes(16));
  if(await scoreStore(['SET',lockKey,lockValue,'NX','EX',120])!=='OK')throw new RegistrationError('This run is already being verified. Please wait.',409);
  try {
   let proof=await scoreStore(['GET',proofKey]);
   const matches=(saved:string)=>{const p=JSON.parse(saved);if(p.hash!==input.hash||p.player!==challenge.player||p.score!==input.score)throw new RegistrationError('A different result is already bound to this run.',409);};
   if(proof)matches(proof);
   else {
    const verified=JSON.stringify({hash:input.hash,player:challenge.player,score:input.score,replay:input.replay,ticks:input.ticks,wallet:t.wallet,rules:t.rules,liveVersion:2,verifiedAt:Date.now()});
    if(await scoreStore(['SET',proofKey,verified,'NX','EX',90*86400])!=='OK') {proof=await scoreStore(['GET',proofKey]);if(!proof)throw new RegistrationError('Verification storage is unavailable.',503);matches(proof);}
   }
   if(await ready(c,signer)!==t.season)throw new RegistrationError('Season changed. This run cannot be registered.',409);
   if(await quote(c,challenge.token)!==challenge.amount)throw new RegistrationError('The owner changed this fee. Refresh and approve the new quote.',409);
   const receipt={runId:t.runId,solanaWallet,player:challenge.player,season:t.season,score:input.score,seed:t.seed,character:t.character,replayHash:input.hash,token:challenge.token,amount:challenge.amount,deadline:Math.floor(Date.now()/1000)+300};
   const previousHint=await insertionHint(c,t.season,challenge.player,input.score);
   const signed=await signer.signTypedData({name:'TopShelf',version:'1',chainId:TOPSHELF_CHAIN,verifyingContract:c.address},SCORE_TYPES,receipt);
   return {receipt,signature:signed,previousHint,address:c.address,chainId:TOPSHELF_CHAIN,verifier:signer.address};
  }finally {await scoreStore(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,lockKey,lockValue]);}
 }finally{c.provider.destroy();}
}
