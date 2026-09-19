import {createHash, createHmac} from 'node:crypto';
import {RegistrationError} from './registration-security';
import type {RunTicket} from './score-protocol';

export type MobileDraft = {ticket:string;runId:string;wallet:string;character:number;seed:number;season:number;score:number;ticks:number;hash:string;expires:number};
type Dependencies = {
  secret:string; contract:string; rules:string;
  unseal:(value:unknown)=>RunTicket;
  finish:(ticket:RunTicket,body:Record<string,unknown>)=>Promise<{score:number;ticks:number;hash:string}>;
  store:(command:(string|number)[])=>Promise<any>;
  now?:()=>number;
};
export function handoffKey(id:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(id))throw new RegistrationError('Invalid mobile registration link.',400);
  return `topshelf:mobile:${createHash('sha256').update(id).digest('hex')}`;
}
export async function createMobileDraft(body:Record<string,unknown>,d:Dependencies) {
  const t=d.unseal(body.ticket),now=(d.now??Date.now)();
  if(t.liveVersion!==2||t.contract.toLowerCase()!==d.contract.toLowerCase()||t.rules!==d.rules||t.expires<=now)
    throw new RegistrationError('This run is no longer eligible for registration.',409);
  const final=await d.finish(t,body);
  const draft:MobileDraft={ticket:String(body.ticket),runId:t.runId,wallet:t.wallet,character:t.character,seed:t.seed,season:t.season,
    score:final.score,ticks:final.ticks,hash:final.hash,expires:t.expires};
  // Retries produce the same capability and never extend the original run's lifetime.
  const id=createHmac('sha256',d.secret).update('mobile-handoff-v1\0'+draft.ticket).digest('base64url');
  await d.store(['SET',handoffKey(id),JSON.stringify(draft),'PX',Math.max(1,t.expires-now)]);
  return {id,runId:t.runId,score:final.score,expires:t.expires};
}
export async function readMobileDraft(id:string,store:Dependencies['store'],now=Date.now()):Promise<MobileDraft> {
  const raw=await store(['GET',handoffKey(id)]);
  if(!raw)throw new RegistrationError('This registration link expired. Return to the game.',410);
  const draft:MobileDraft=JSON.parse(raw);
  if(draft.expires<=now)throw new RegistrationError('This registration link expired. Return to the game.',410);
  return draft;
}
