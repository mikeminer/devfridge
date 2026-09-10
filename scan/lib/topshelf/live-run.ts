import {randomBytes,randomInt} from 'node:crypto';
import {keccak256,toUtf8Bytes} from 'ethers';
import {scoreStore,RegistrationError} from './registration-security';
import type {RunTicket} from './score-protocol';
import {initPhysics,MergeGame,checkpointPhysics} from './engine/core';
import {MAX_RUN_TICKS} from './engine/verify-replay';
import {advancePhysics,capturePhysics,type PhysicsState} from './live-physics';

export type LiveMove={tick:number;x:number;tier:number};
export type LiveState={version:2;revision:number;nonce:string;nextTier:number;previewTier:number;issued:number;lastAt:number;moves:LiveMove[];snapshot?:PhysicsState;lastRequest:string;final?:{ticks:number;score:number;hash:string}};
const randomNonce=()=>randomBytes(32).toString('hex');
const nextTier=()=>{const n=randomInt(100);return n<48?1:n<80?2:3;};
function key(t:RunTicket){return `topshelf:live:v2:${t.contract}:${t.runId}`;}
function ack(s:LiveState){return {sequence:s.revision,nonce:s.nonce,nextTier:s.nextTier,previewTier:s.previewTier,final:s.final??null};}
export function initialLiveState(t:RunTicket):LiveState {return {version:2,revision:0,nonce:randomNonce(),nextTier:t.character===10?1:t.character,previewTier:nextTier(),issued:t.issued,lastAt:t.issued,moves:[],lastRequest:''};}
export async function createLiveRun(t:RunTicket) {
 const s=initialLiveState(t);if(await scoreStore(['SET',key(t),JSON.stringify(s),'NX','EX',21600])!=='OK')throw new RegistrationError('Could not initialize live verification.',503);return ack(s);
}
function liveTiming(s:LiveState,tick:number,now:number) {
 if(!Number.isSafeInteger(tick)||tick<0||tick>MAX_RUN_TICKS||tick/60>(now-s.issued)/1000+2)throw new RegistrationError('Live run timing is invalid.',409);
 const previous=s.moves[s.moves.length-1];
 if(previous&&(tick-previous.tick)/60>(now-s.lastAt)/1000+2)throw new RegistrationError('Live input timing is invalid.',409);
}
export async function replayLive(t:RunTicket,moves:LiveMove[],tick:number,finish=false) {
 await initPhysics();const g=new MergeGame(t.seed,t.character),started=performance.now();let index=0;
 try {
  while(g.tick<tick&&g.status==='playing') {
   const move=moves[index];if(move?.tick===g.tick){g.queue[0]=move.tier;if(!g.drop(move.x)||g.inputs[g.inputs.length-1]?.x!==move.x)throw new RegistrationError('Invalid server-recorded move.',422);checkpointPhysics(g);index++;}
   g.step();g.events.length=0;if(g.tick%600===0&&performance.now()-started>15000)throw new RegistrationError('Live verification is busy. Retry this move.',503);
  }
  if(g.tick!==tick||index!==moves.length||(finish&&g.status==='playing'))throw new RegistrationError('Run is not at the expected completed state.',422);
  return g;
 }catch(e){g.dispose();throw e;}
}
export async function transitionLive(t:RunTicket,s:LiveState,body:Record<string,unknown>,now=Date.now(),entropy=nextTier):Promise<LiveState> {
 if(s.version!==2)throw new RegistrationError('This run needs a new live session.',409);
 if(body.sequence!==s.revision||body.nonce!==s.nonce)throw new RegistrationError('Stale or branched live input.',409);
 if(s.final)throw new RegistrationError('This run is already closed.',409);
 const tick=Number(body.tick);liveTiming(s,tick,now);
 if(body.action==='move') {
  if(s.moves.length>=8000||!Number.isFinite(body.x)||Math.abs(Number(body.x))>3)throw new RegistrationError('Invalid live move');
  const g=await advancePhysics(t,s.snapshot,s.moves,tick);
  try {
   g.queue[0]=s.nextTier;const x=Math.round(g.clampX(Number(body.x))*1000)/1000;
   if(x!==body.x||!g.drop(x))throw new RegistrationError('This drop is not legal at this time.',422);
   return {...s,revision:s.revision+1,nonce:randomNonce(),nextTier:s.previewTier,previewTier:entropy(),lastAt:now,moves:[...s.moves,{tick,x,tier:s.nextTier}],snapshot:capturePhysics(g)};
  }finally{g.dispose();}
 }
 if(body.action!=='finish')throw new RegistrationError('Invalid live action');
 if(!s.moves.length)throw new RegistrationError('No live moves were recorded.',422);
 const g=await replayLive(t,s.moves,tick,true);
 try {
  if(body.score!==g.score)throw new RegistrationError('Score does not match the live game.',422);
  const hash=keccak256(toUtf8Bytes(JSON.stringify({version:2,runId:t.runId,rules:t.rules,seed:t.seed,character:t.character,moves:s.moves,ticks:g.tick})));
  return {...s,revision:s.revision+1,nonce:randomNonce(),final:{ticks:g.tick,score:g.score,hash}};
 }finally{g.dispose();}
}
export async function advanceLiveRun(t:RunTicket,body:Record<string,unknown>) {
 if('replay' in body||'inputs' in body||'moves' in body)throw new RegistrationError('Replay uploads are not accepted. Play a live run.',400);
 const runKey=key(t),raw=await scoreStore(['GET',runKey]);if(!raw)throw new RegistrationError('Live session expired. Start a new run.',409);
 const s:LiveState=JSON.parse(raw);
 const fingerprint=keccak256(toUtf8Bytes(JSON.stringify({action:body.action,sequence:body.sequence,nonce:body.nonce,tick:body.tick,x:body.x,score:body.score})));
 // A lost response may be retried verbatim. It can never reveal an additional piece or branch the run.
 if(s.lastRequest===fingerprint)return ack(s);
 const updated=await transitionLive(t,s,body);updated.lastRequest=fingerprint;
 const result=await scoreStore(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL'); return 1 else return 0 end",1,runKey,raw,JSON.stringify(updated)]);
 if(result!==1)throw new RegistrationError('Another input already advanced this run. Retry the same move.',409);
 return ack(updated);
}
export async function finishedLiveRun(t:RunTicket,body:Record<string,unknown>) {
 if('replay' in body||'inputs' in body||'moves' in body)throw new RegistrationError('Replay uploads are no longer accepted. Start a live run.',400);
 const raw=await scoreStore(['GET',key(t)]);if(!raw)throw new RegistrationError('No live run was recorded.',409);
 const s:LiveState=JSON.parse(raw);if(s.version!==2||!s.final)throw new RegistrationError('Complete and verify the live run first.',409);
 if(body.score!==s.final.score||body.ticks!==s.final.ticks)throw new RegistrationError('Result does not match the server-recorded game.',422);
 return {...s.final,replay:{version:2,seed:t.seed,favourite:t.character,inputs:s.moves},live:true as const};
}
