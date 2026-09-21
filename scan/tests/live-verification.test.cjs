require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {initPhysics, MergeGame, checkpointPhysics, seededRandom} = require('../lib/topshelf/engine/core.ts');
const {initialLiveState, transitionLive, advanceLiveRun, createLiveRun, finishedLiveRun} = require('../lib/topshelf/live-run.ts');
const {rememberWorld, forgetWorld} = require('../lib/topshelf/live-cache.ts');
const {scoreRateLimit} = require('../lib/topshelf/registration-security.ts');
const ticket = (character=1) => ({kind:'run', liveVersion:2, runId:'test', wallet:'test', character, seed:264, season:1, rules:'test', issued:0, expires:21600000, contract:'test'});
const pieces = g => [...g.pieces.values()].map(p => [p.id,p.tier,{...p.body.translation()},p.danger]);

for (const mode of ['warm','cold','mixed']) test(`${mode} server physics matches the ranked client and final replay for all 10 characters`, async () => {
 await initPhysics();
 for(let character=1;character<=10;character++) {
  const t=ticket(character), client=new MergeGame(t.seed,character), random=seededRandom(264+character);
  let s=initialLiveState(t);s.previewTier=2;
  try {
   while(client.status==='playing' && client.tick<20000) {
    if(client.tick%40===0 && client.ready) {
     client.queue[0]=s.nextTier;
     const x=Math.round(client.clampX(random()*5-2.5)*1000)/1000;
     const next=await transitionLive(t,s,{action:'move',sequence:s.revision,nonce:s.nonce,tick:client.tick,x},client.tick*1000/60,()=>1+Math.floor(random()*3));
     s=next.state;
     assert.ok(client.drop(x));checkpointPhysics(client);client.queue[0]=s.nextTier;client.queue[1]=s.previewTier;
     try {
      assert.equal(client.score,next.game.score);
      assert.deepEqual(pieces(client),pieces(next.game),`${mode}, character ${character}, tick ${client.tick}`);
     } catch(error) {next.game.dispose();throw error;}
     if(mode==='warm'||mode==='mixed'&&s.revision%3)rememberWorld(t,s.revision,next.game);else next.game.dispose();
    }
    client.step();client.events.length=0;
   }
   assert.notEqual(client.status,'playing');
   const body={action:'finish',sequence:s.revision,nonce:s.nonce,tick:client.tick,score:client.score};
   await assert.rejects(transitionLive(t,s,{...body,score:client.score+1},client.tick*1000/60),/does not match/);
   const result=await transitionLive(t,s,body,client.tick*1000/60);
   assert.equal(result.state.final.score,client.score);
  } finally {client.dispose();forgetWorld(t);}
 }
});

test('lost responses and concurrent identical moves are idempotent, while branches and replay uploads remain rejected',async context=>{
 const previousFetch=global.fetch,env={...process.env},db=new Map();
 process.env.KV_REST_API_URL='https://test.invalid';process.env.KV_REST_API_TOKEN='test';
 global.fetch=async(_url,init)=>{
  const [op,...a]=JSON.parse(init.body);let result=null;
  if(op==='GET')result=db.get(a[0])??null;
  if(op==='SET'&&!db.has(a[0])){db.set(a[0],a[1]);result='OK';}
  if(op==='EVAL'){if(db.get(a[2])===a[3]){db.set(a[2],a[4]);result=1;}else result=0;}
  return Response.json({result});
 };
 const t={...ticket(),issued:Date.now()};
 context.after(()=>{global.fetch=previousFetch;process.env=env;forgetWorld(t);});
 const first=await createLiveRun(t),body={action:'move',sequence:0,nonce:first.nonce,tick:0,x:0};
 const pair=await Promise.all([advanceLiveRun(t,body),advanceLiveRun(t,body)]);
 assert.deepEqual(pair[0],pair[1]);assert.equal(pair[0].sequence,1);
 assert.deepEqual(await advanceLiveRun(t,body),pair[0]);
 await assert.rejects(advanceLiveRun(t,{...body,x:1}),/Stale/);
 await assert.rejects(advanceLiveRun(t,{...body,replay:{inputs:[]}}),/uploads/);
 await assert.rejects(finishedLiveRun(t,{score:999999,ticks:100}),/Complete/);
 const fast={action:'move',sequence:1,nonce:pair[0].nonce,tick:10000,x:0};
 await assert.rejects(advanceLiveRun(t,fast),/timing/);
});

test('gateway and worker allow the physical maximum without double-counting, and both still enforce limits',async context=>{
 const previousFetch=global.fetch,env={...process.env},counts=new Map();
 process.env.KV_REST_API_URL='https://test.invalid';process.env.KV_REST_API_TOKEN='test';process.env.TOPSHELF_RUN_SECRET='test-secret';
 global.fetch=async(_url,init)=>{const command=JSON.parse(init.body),key=command[3],count=(counts.get(key)||0)+1;counts.set(key,count);return Response.json({result:[count,60]});};
 context.after(()=>{global.fetch=previousFetch;process.env=env;});
 // 28 ticks between drops means at most 129 legitimate drops in a minute.
 for(let i=0;i<240;i++){await scoreRateLimit('live:run',240);await scoreRateLimit('worker:live:run',240);}
 assert.equal(counts.size,2);
 for(const key of ['live:run','worker:live:run'])await assert.rejects(scoreRateLimit(key,240),error=>error.status===429&&error.retryAfter===60);
 const fs=require('node:fs'),path=require('node:path');
 const worker=fs.readFileSync(path.join(__dirname,'../world-live/server.ts'),'utf8');
 assert.ok(worker.includes('`worker:live:${ticket.runId}`'));assert.ok(worker.includes('`worker:ip:live:${ip}`'));
});
