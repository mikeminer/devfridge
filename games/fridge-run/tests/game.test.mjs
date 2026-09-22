import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,step,STEP,PICKUPS,HOME} from '../src/simulation.mjs';
import {evaluateTimelocks} from '../src/timelock-gate.mjs';
import {LockReader,fixtureGate} from '../src/access.mjs';
test('courier completes a route with real fixed-step steering and can restart',()=>{
 const s=newRun();
 for(const [x,z] of [...PICKUPS,[HOME.x,HOME.z]]){
  for(let i=0;i<1500&&s.status==='playing';i++){
   const dx=x-s.x,dz=z-s.z;if(Math.hypot(dx,dz)<.45)break;
   step(s,{x:dx,z:dz,brake:Math.hypot(dx,dz)<.7});
  }
 }
 assert.equal(s.status,'won');assert.equal(s.cargo,6);assert.ok(s.score>600);assert.ok(s.time>0);
 assert.deepEqual(newRun().collected,Array(6).fill(false));
});
test('idle run loses and cannot gain more time after expiry',()=>{const s=newRun();for(let i=0;i<4600;i++)step(s,{x:0,z:0,brake:false});assert.equal(s.status,'lost');assert.equal(s.time,0);step(s,{x:1,z:1});assert.equal(s.time,0);});
test('diagonal speed is bounded and a heat contact has cooldown',()=>{const s=newRun();for(let i=0;i<120;i++)step(s,{x:1,z:1});assert.ok(Math.hypot(s.vx,s.vz)<4.1);s.x=-2.5;s.z=-2;s.vx=s.vz=0;step(s,{x:0,z:0});const t=s.time;step(s,{x:0,z:0});assert.ok(t-s.time<STEP*2);assert.equal(s.hits,1);});
test('chosen PASTA rules enforce threshold, original duration, partial expiry, wallet and mint',()=>{
 const now=1000000,wallet='wallet',mint='mint',policy={wallet,mint,minimumRaw:100000000n,minOriginalSeconds:86400,minRemainingSeconds:60,aggregation:'sum'};
 const lock=(address,amount,unlockAt=now+60)=>({address,depositor:wallet,mint,amount,createdAt:now-86400,unlockAt});
 const evidence={wallet,mint,ts:now,activeLocks:[lock('a','40000000'),lock('b','60000000',now+120)]};
 assert.equal(evaluateTimelocks(evidence,policy,now).eligible,true);
 assert.equal(evaluateTimelocks(evidence,policy,now+1).eligible,false);
 assert.equal(evaluateTimelocks({...evidence,activeLocks:[{...lock('a','100000000'),createdAt:now-100}]},policy,now).eligible,false);
 assert.throws(()=>evaluateTimelocks({...evidence,wallet:'attacker'},policy,now));
 assert.throws(()=>evaluateTimelocks({...evidence,activeLocks:[{...lock('a','100000000'),mint:'other'}]},policy,now));
});
test('fixtures are explicit and never turn stale evidence into an eligible result',()=>{assert.equal(fixtureGate('pass').eligible,true);assert.equal(fixtureGate('insufficient').eligible,false);assert.equal(fixtureGate('expired').eligible,false);assert.throws(()=>fixtureGate('stale'));});
test('lock requests coalesce, reject stale data and back off after 429',async()=>{
 let calls=0;let release;const reader=new LockReader(async()=>{calls++;await new Promise(r=>release=r);return{ok:true,json:async()=>({wallet:'w',mint:'m',ts:Math.floor(Date.now()/1000),activeLocks:[]})};});
 const a=reader.read('w','m'),b=reader.read('w','m');release();assert.deepEqual(await a,await b);assert.equal(calls,1);
 const limited=new LockReader(async()=>({ok:false,status:429,headers:{get:()=> '30'}}));await assert.rejects(limited.read('w','m'),/429/);await assert.rejects(limited.read('w','m'),/cooling down/);
 const stale=new LockReader(async()=>({ok:true,json:async()=>({wallet:'w',mint:'m',ts:1,activeLocks:[]})}));await assert.rejects(stale.read('w','m'),/stale/);
 const timeout=new LockReader(async()=>{throw Error('timeout');});await assert.rejects(timeout.read('w','m'),/timeout/);
});
