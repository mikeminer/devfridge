import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobileDraft,readMobileDraft,handoffKey} from '../../devfridge/scan/lib/topshelf/mobile-handoff';
import {seal,unseal} from '../../devfridge/scan/lib/topshelf/registration-security';
import type {RunTicket} from '../../devfridge/scan/lib/topshelf/score-protocol';
const secret='test-only-secret-with-at-least-32-bytes';
function fixture(){
 const now=Date.now(),ticket:RunTicket={kind:'run',liveVersion:2,runId:'0x'+'12'.repeat(32),wallet:'test-wallet',character:1,seed:10,season:2,rules:'rules-v2',issued:now,expires:now+60000,contract:'0x'+'34'.repeat(20)};
 const memory=new Map<string,string>();let finishes=0;
 const d={secret,contract:ticket.contract,rules:ticket.rules,now:()=>now,unseal:(value:unknown)=>unseal<RunTicket>(value,secret,'run'),
  async finish(t:RunTicket,b:Record<string,unknown>){finishes++;assert.equal(t.runId,ticket.runId);if(b.score!==123||b.ticks!==1000)throw Error('server result mismatch');return {score:123,ticks:1000,hash:'0x'+'56'.repeat(32)};},
  async store(command:(string|number)[]){if(command[0]==='GET')return memory.get(String(command[1]))??null;memory.set(String(command[1]),String(command[2]));return 'OK';}};
 return {ticket,d,memory,body:{ticket:seal(ticket,secret),score:123,ticks:1000},finishes:()=>finishes};
}
test('handoff validates server completion and resumes with the same capability',async()=>{
 const f=fixture(),a=await createMobileDraft(f.body,f.d),b=await createMobileDraft(f.body,f.d);
 assert.equal(a.id,b.id);assert.equal(f.finishes(),2);assert.equal(f.memory.size,1);
 const stored=await readMobileDraft(a.id,f.d.store);assert.equal(stored.wallet,f.ticket.wallet);assert.equal(stored.score,123);assert.equal(stored.expires,f.ticket.expires);
 assert.ok(!handoffKey(a.id).includes(a.id),'Redis key does not contain the bearer capability');
});
test('tampered tickets, changed scores, wrong contracts and wrong rules cannot create handoffs',async()=>{
 const f=fixture();await assert.rejects(createMobileDraft({...f.body,ticket:f.body.ticket+'x'},f.d));
 await assert.rejects(createMobileDraft({...f.body,score:999},f.d));
 await assert.rejects(createMobileDraft(f.body,{...f.d,contract:'0x'+'98'.repeat(20)}));
 await assert.rejects(createMobileDraft(f.body,{...f.d,rules:'different'}));assert.equal(f.memory.size,0);
});
test('expired, missing and malformed capabilities cannot retrieve a draft',async()=>{
 const f=fixture(),result=await createMobileDraft(f.body,f.d);
 await assert.rejects(readMobileDraft(result.id,f.d.store,f.ticket.expires+1));
 await assert.rejects(readMobileDraft('A'.repeat(43),f.d.store));
 await assert.rejects(readMobileDraft('../../secret',f.d.store));
 await assert.rejects(createMobileDraft(f.body,{...f.d,now:()=>f.ticket.expires+1}));
});
