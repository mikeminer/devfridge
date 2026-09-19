import {createHash,createHmac} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import nacl from 'tweetnacl';
import {readMobileDraft,type MobileDraft} from './mobile-handoff';
import {RegistrationError} from './registration-security';
import {registrationMessage,type ScoreChallenge} from './score-protocol';

type Store=(command:(string|number)[])=>Promise<any>;
type Dependencies={secret:string;contract:string;store:Store;unseal:(value:unknown)=>ScoreChallenge;now?:()=>number};
function requestKey(id:string,request:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(request))throw new RegistrationError('Invalid signing request.',400);
  return `topshelf:mobile-sign:${createHash('sha256').update(id+'\0'+request).digest('hex')}`;
}
function boundChallenge(value:unknown,draft:MobileDraft,d:Dependencies){
  const c=d.unseal(value),now=(d.now??Date.now)();
  if(c.kind!=='score'||c.runId!==draft.runId||c.wallet!==draft.wallet||c.season!==draft.season||c.hash!==draft.hash||c.score!==draft.score||c.ticks!==draft.ticks||c.contract.toLowerCase()!==d.contract.toLowerCase())
    throw new RegistrationError('Signing request does not match this verified run.',403);
  if(c.expires<=now||draft.expires<=now)throw new RegistrationError('Signing request expired. Verify your score again.',410);
  return c;
}
export async function prepareMobileSignature(id:string,value:unknown,d:Dependencies){
  const draft=await readMobileDraft(id,d.store,(d.now??Date.now)());
  const c=boundChallenge(value,draft,d),challenge=String(value);
  const request=createHmac('sha256',d.secret).update('mobile-sign-v1\0'+id+'\0'+challenge).digest('base64url');
  const expires=Math.min(c.expires,draft.expires);
  // Stable retries cannot replace an approved challenge or extend its lifetime.
  await d.store(['SET',requestKey(id,request),challenge,'NX','PX',Math.max(1,expires-(d.now??Date.now)())]);
  return {request,runId:draft.runId,expires};
}
export async function readMobileSignature(id:string,request:string,d:Dependencies){
  const draft=await readMobileDraft(id,d.store,(d.now??Date.now)()),key=requestKey(id,request);
  const challenge=await d.store(['GET',key]);
  if(!challenge)throw new RegistrationError('Signing request expired. Verify your score again.',410);
  const c=boundChallenge(challenge,draft,d);
  const signature=await d.store(['GET',key+':signature']);
  return {request,runId:c.runId,wallet:c.wallet,player:c.player,token:c.token,amount:c.amount,score:c.score,season:c.season,
    expires:Math.min(c.expires,draft.expires),message:registrationMessage(c),signature:signature||null};
}
export async function completeMobileSignature(id:string,request:string,value:unknown,d:Dependencies){
  const pending=await readMobileSignature(id,request,d);
  if(typeof value!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(value))throw new RegistrationError('Invalid Solana signature.',400);
  const bytes=Buffer.from(value,'base64');
  if(bytes.length!==64||!nacl.sign.detached.verify(Buffer.from(pending.message,'utf8'),bytes,new PublicKey(pending.wallet).toBytes()))
    throw new RegistrationError('The original Solana wallet must approve this request.',403);
  const ttl=pending.expires-(d.now??Date.now)();
  if(ttl<=0)throw new RegistrationError('Signing request expired. Verify your score again.',410);
  await d.store(['SET',requestKey(id,request)+':signature',value,'NX','PX',ttl]);
  return {request,runId:pending.runId,approved:true};
}
