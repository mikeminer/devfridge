import test from 'node:test';
import assert from 'node:assert/strict';
import {KitchenPool,topPoolJars,type PoolState} from '../src/kitchen-pool';
const token=(id:number,balance='1000000',decimals=6)=>({address:'0x'+id.toString(16).padStart(40,'0'),symbol:'TOKEN'+id,balance,decimals});
const tokens=[token(1),token(2),token(3),token(4),token(5),token(6)];
const pool={configured:true,tokens};
const quotes={prices:Object.fromEntries(tokens.map((t,i)=>[t.address,(i+1)*2]))};
test('four jars match leaderboard USD ordering, not token counts',()=>{
  const result=topPoolJars({...pool,tokens:[token(1,'900000000',6),...tokens.slice(1)]},{prices:{...quotes.prices,[tokens[0].address]:.00001}});
  assert.deepEqual(result.jars.map(t=>t.symbol),['TOKEN6','TOKEN5','TOKEN4','TOKEN3']);
  assert.equal(result.jars[0].tvlUsd,12);
});
test('ties use address order and unknown prices remain after valued jars',()=>{
  const result=topPoolJars({configured:true,tokens:[token(3),token(2),token(1),token(4,'0')]},{prices:{[token(2).address]:1,[token(1).address]:1}});
  assert.deepEqual(result.jars.map(t=>[t.symbol,t.tvlUsd]),[['TOKEN1',1],['TOKEN2',1],['TOKEN4',0],['TOKEN3',null]]);
  assert.throws(()=>topPoolJars({...pool,tokens:[token(1),token(1)]},quotes));
  assert.throws(()=>topPoolJars({...pool,tokens:[{...token(1),address:'not-a-token'}]},quotes));
});
test('polls only while in kitchen, reuses fresh data on return, fails without invented jars',async()=>{
  let now=0,calls=0,fail=false;const states:PoolState[]=[];
  const client=new KitchenPool(state=>states.push(state),(async(url)=>{calls++;return new Response(JSON.stringify(String(url).endsWith('/prices')?quotes:pool),{status:fail?503:200});}) as typeof fetch,()=>now);
  await client.refresh();assert.equal(calls,0);
  client.setActive(true);await new Promise(r=>setTimeout(r,0));assert.equal(calls,2);assert.equal(states.at(-1)?.jars.length,4);
  client.setActive(false);client.setActive(true);await client.refresh();assert.equal(calls,2);
  now=60000;fail=true;await client.refresh();assert.equal(calls,4);assert.deepEqual(states.at(-1),{status:'unavailable',jars:[]});client.setActive(false);
});
test('leaving cancels pending updates; re-entry can immediately retry',async()=>{
  const pending:((response:Response)=>void)[]=[];const states:PoolState[]=[];
  const client=new KitchenPool(state=>states.push(state),(()=>new Promise<Response>(resolve=>pending.push(resolve))) as typeof fetch);
  client.setActive(true);client.setActive(false);client.setActive(true);
  for(const i of [0,1])pending[i](new Response(JSON.stringify(i%2?quotes:pool)));
  await new Promise(r=>setTimeout(r,0));assert.equal(states.length,0);
  for(const i of [2,3])pending[i](new Response(JSON.stringify(i%2?quotes:pool)));
  await new Promise(r=>setTimeout(r,0));assert.equal(states.length,1);client.setActive(false);
});
