import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../cold-storage/package.json',import.meta.url));
const {Window}=require('happy-dom');
const code=await readFile(new URL('../mobile/registration-handoff.js',import.meta.url),'utf8');
const runId='0x'+'ab'.repeat(32),id='a'.repeat(43),key='devfridge:mobile:scores:v1';
function fixture(saved){
 const window=new Window({url:'https://world.devfridge.cool/world/game-v2/index.html'}),calls=[];
 if(saved)window.localStorage.setItem(key,saved);
 let responder=()=>new Response('{}');
 window.fetch=async(url,init)=>responder(url,init);
 window.DevFridgeMobile={pause(){},async openRegistration(id){calls.push(id);}};
 vm.runInNewContext(code,{window,document:window.document,location:window.location,localStorage:window.localStorage,URL,AbortSignal,Date,Map,console});
 window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
 return {window,calls,setResponse:fn=>responder=fn,rows:()=>JSON.parse(window.localStorage.getItem(key)||'[]'),close:()=>window.happyDOM.abort()};
}
async function finish(f,score=42){
 f.setResponse(()=>Response.json({liveVersion:2,ticket:'sealed-ticket',runId,season:1}));
 await f.window.fetch('/api/world/topshelf/register',{method:'POST',body:JSON.stringify({action:'start',wallet:'solana-wallet'})});
 f.setResponse(()=>Response.json({final:{score,ticks:500}}));
 await f.window.fetch('/api/world/topshelf/register',{method:'POST',body:JSON.stringify({action:'finish',ticket:'sealed-ticket',score:42,tick:500})});
}
test('captures only matching server-confirmed final results and restores them after restart',async()=>{
 const f=fixture();await finish(f,999);assert.equal(f.rows().length,0);await finish(f);assert.equal(f.rows()[0].score,42);
 const g=fixture(f.window.localStorage.getItem(key));g.window.DevFridgeRegistration.show();assert.match(g.window.document.body.textContent,/42 points/);assert.equal(g.calls.length,0);await f.close();await g.close();
});
test('persists the handoff before opening Phantom and never opens a mismatched run',async()=>{
 const f=fixture();await finish(f);f.window.DevFridgeRegistration.show();
 f.setResponse(url=>Response.json(String(url).includes('status=1')?{runId,registered:false}:{id,runId:'0x'+'11'.repeat(32),score:42,expires:Date.now()+10000}));
 await f.window.document.querySelector('section button').onclick();assert.equal(f.calls.length,0);
 f.setResponse(url=>Response.json(String(url).includes('status=1')?{runId,registered:false}:{id,runId,score:42,expires:Date.now()+10000}));
 await f.window.document.querySelector('section button').onclick();assert.deepEqual(f.calls,[id]);assert.equal(f.rows()[0].id,id);await f.close();
});
test('on-chain confirmation prevents another launch; a failed status request stays unconfirmed',async()=>{
 const f=fixture();await finish(f);const rows=f.rows();rows[0].id=id;f.window.localStorage.setItem(key,JSON.stringify(rows));f.window.DevFridgeRegistration.show();
 f.setResponse(()=>{throw Error('offline');});await f.window.document.querySelector('section button').onclick();assert.equal(f.calls.length,0);assert.ok(!f.rows()[0].registered);
 f.setResponse(()=>Response.json({runId,score:42,registered:true}));await f.window.document.querySelector('section button').onclick();assert.equal(f.calls.length,0);assert.equal(f.rows()[0].registered,true);await f.close();
});

test('native return requires a saved run, explicit approval and the original wallet before delivery',async()=>{
 const f=fixture();await finish(f);const rows=f.rows();rows[0].id=id;f.window.localStorage.setItem(key,JSON.stringify(rows));
 const request='b'.repeat(43),posted=[];let signatures=0;
 f.window.DevFridgeMobile.signRegistration=async(wallet,message)=>{assert.equal(wallet,'solana-wallet');assert.equal(message,'Exact score and EVM authorization');signatures++;return 'signed-by-original-wallet';};
 f.setResponse((url,options)=>{
   if(options.method==='POST'){posted.push(JSON.parse(options.body));return Response.json({approved:true,runId,request});}
   return Response.json({request,runId,wallet:'solana-wallet',score:42,season:1,expires:Date.now()+60000,message:'Exact score and EVM authorization',signature:null});
 });
 await f.window.DevFridgeRegistration.receive(request,runId);assert.equal(signatures,0);assert.equal(posted.length,0);
 const dialog=f.window.document.querySelector('dialog');await dialog.querySelector('button').onclick();
 assert.equal(signatures,1);assert.equal(posted[0].request,request);assert.equal(posted[0].action,'complete');
 assert.match(dialog.textContent,/Return to Phantom/);assert.equal(f.calls.length,0);await f.close();
});

test('native return refuses a response for a different wallet',async()=>{
 const f=fixture();await finish(f);const rows=f.rows();rows[0].id=id;f.window.localStorage.setItem(key,JSON.stringify(rows));
 f.setResponse(()=>Response.json({request:'b'.repeat(43),runId,wallet:'attacker',score:42,season:1,expires:Date.now()+60000,message:'malicious message'}));
 await f.window.DevFridgeRegistration.receive('b'.repeat(43),runId);
 const dialog=f.window.document.querySelector('dialog');assert.equal(dialog.querySelector('button').disabled,true);
 assert.match(dialog.textContent,/does not match/);await f.close();
});
