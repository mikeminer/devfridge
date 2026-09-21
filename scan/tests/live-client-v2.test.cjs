require('tsx/cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {initPhysics,MergeGame,checkpointPhysics}=require('../lib/topshelf/engine/core.ts');

test('shipped V2 retries identical live input and retains its kitchen and renderer hooks',async()=>{
 await initPhysics();
 const bundle=fs.readFileSync(path.join(__dirname,'../public/world/game-v2/assets/cold-storage.js'),'utf8');
 const start=bundle.indexOf('async function Dk('),end=bundle.indexOf('var Fk=',start);
 assert.ok(start>0&&end>start);
 const sent=[];
 const api=vm.runInNewContext(bundle.slice(start,end)+';({start:Ok,drop:Nk,wait:kk,sync:Ak,cancel:jk,message:worldLiveSyncMessage})',{
  wk:new WeakMap(),Tk:new WeakMap(),gk:'/test',mk:{id:'test'},Cr:checkpointPhysics,AbortSignal,AbortController,setTimeout,clearTimeout,Error,
  Ek:class extends Error{constructor(message,status,retryAfter=0){super(message);Object.assign(this,{status,retryAfter});}},
  fetch:async(url,init)=>{
   const body=JSON.parse(init.body);if(body.action==='start')return Response.json({ticket:'test',liveVersion:2,sequence:0,nonce:'n',nextTier:1,previewTier:2});
   sent.push(body);return sent.length===1?Response.json({error:'Busy'},{status:503}):Response.json({sequence:1,nonce:'next',nextTier:2,previewTier:3});
  },
 });
 const game=new MergeGame(264,1);
 try {
  api.start(game,{address:'test'});await api.wait(game);const result=api.drop(game,.4);
  await new Promise(resolve=>setImmediate(resolve));assert.ok(api.sync(game));assert.match(api.message(game),/reconnecting/);assert.equal(game.inputs.length,0);
  assert.equal(await result,true);assert.deepEqual(sent[0],sent[1]);assert.equal(game.inputs.length,1);assert.equal(api.sync(game),false);
 }finally{api.cancel(game);game.dispose();}
 assert.ok(bundle.includes('setPixelRatio(Math.min(devicePixelRatio||1,1.6))'));assert.ok(bundle.includes('tickKitchenShelf()'));
 assert.ok(bundle.includes('worldLiveSyncMessage(Q)'));
});
