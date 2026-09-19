// Exercise the real route, ticket validation and completed-run lookup with isolated providers.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {NextRequest} = require('next/server');

function harness(options = {}) {
  const secret = 'local-test-only-secret-at-least-32-bytes';
  const contract = '0x' + '34'.repeat(20), memory = new Map(), commands = [];
  const env = {NODE_ENV:'production', VERCEL:'1', TOPSHELF_RUN_SECRET:secret, TOPSHELF_CONTRACT_ADDRESS:contract,
    KV_REST_API_URL:'https://storage.invalid', KV_REST_API_TOKEN:'local-test', ...options.env};
  let destroyed = 0, rpcCalls = 0;
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, relative);
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const compiled = ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(compiled, {exports, Buffer, Date, URL, Response, AbortSignal, process:{env},
      fetch: async (url, init) => {
        assert.equal(url, 'https://storage.invalid');
        if (options.storageFailure) throw Error('private-provider-detail');
        const command = JSON.parse(init.body); commands.push(command);
        let result;
        if (command[0] === 'EVAL') result = [options.rateCount ?? 1, 45];
        else if (command[0] === 'GET') result = memory.get(command[1]) ?? null;
        else if (command[0] === 'SET') {memory.set(command[1], command[2]); result = 'OK';}
        else throw Error('Unexpected storage command');
        return Response.json({result});
      },
      require: name => {
        if (name.startsWith('.') && name.endsWith('/server')) return {shelfConnection:()=>({address:contract, provider:{
          send:async()=>{rpcCalls++; if(options.rpcFailure)throw Error('private-rpc-detail'); return options.chain ?? '0x1237';},
          destroy:()=>{destroyed++;}}, contract:{usedRun:async()=>Boolean(options.registered)}})};
        if (name === './engine/core' || name === './engine/verify-replay' || name === './live-physics' || name === './live-cache') return {};
        if (!name.startsWith('.')) return require(name);
        const resolved = path.resolve(path.dirname(file), name);
        if (name.endsWith('.json')) return JSON.parse(readFileSync(resolved,'utf8'));
        return load(resolved + '.ts');
      },
    }, {filename:file});
    return exports;
  }
  const route = load('../app/api/world/topshelf/mobile/route.ts');
  const security = load('../lib/topshelf/registration-security.ts');
  const now = Date.now();
  const ticket = {kind:'run',liveVersion:2,runId:'0x'+'12'.repeat(32),wallet:'test-solana-wallet',character:1,seed:10,
    season:2,rules:require('../lib/topshelf/engine/rules.json').id,issued:now,expires:now+60000,contract};
  memory.set(`topshelf:live:v2:${contract}:${ticket.runId}`,JSON.stringify({version:2,moves:[],final:{score:123,ticks:1000,hash:'0x'+'56'.repeat(32)}}));
  const seal = t => security.seal(t,secret);
  const body = {ticket:seal(ticket),score:123,ticks:1000};
  const post = (data=body,headers={}) => route.POST(new NextRequest('https://world.devfridge.cool/api/world/topshelf/mobile',{
    method:'POST',headers:{origin:'https://world.devfridge.cool','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.10',...headers},
    body:typeof data==='string'?data:JSON.stringify(data)}));
  const get = (id='',query='') => route.GET(new NextRequest('https://world.devfridge.cool/api/world/topshelf/mobile'+query,{headers:{authorization:`Bearer ${id}`}}));
  return {post,get,body,ticket,seal,memory,commands,stats:()=>({destroyed,rpcCalls})};
}

test('completed run creates a retry-stable, expiring handoff and retains the original wallet',async()=>{
  const h=harness(),a=await h.post(),first=await a.json(),second=await(await h.post()).json();
  assert.equal(a.status,200);assert.equal(first.id,second.id);assert.match(first.id,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(a.headers.get('cache-control'),'no-store');assert.equal(a.headers.get('referrer-policy'),'no-referrer');
  const draft=await(await h.get(first.id)).json();assert.equal(draft.wallet,h.ticket.wallet);assert.equal(draft.score,123);
  for(const command of h.commands.filter(c=>c[0]==='SET')){
    assert.ok(!command[1].includes(first.id));assert.equal(command[3],'PX');assert.ok(command[4]>0&&command[4]<=60000);
  }
});

for(const [name,change,status] of [
  ['tampered authorization',h=>({...h.body,ticket:h.body.ticket+'x'}),400],
  ['changed score',h=>({...h.body,score:999}),422],
  ['changed ticks',h=>({...h.body,ticks:999}),422],
  ['expired run',h=>({...h.body,ticket:h.seal({...h.ticket,expires:Date.now()-1})}),400],
  ['different contract',h=>({...h.body,ticket:h.seal({...h.ticket,contract:'0x'+'98'.repeat(20)})}),409],
  ['different rules',h=>({...h.body,ticket:h.seal({...h.ticket,rules:'other'})}),409],
  ['uploaded replay',h=>({...h.body,replay:[]}),400],
]) test(`${name} cannot create a mobile handoff`,async()=>{
  const h=harness(),response=await h.post(change(h));assert.equal(response.status,status);
  assert.equal(h.commands.filter(c=>c[0]==='SET').length,0);
});

test('unfinished or absent live runs cannot create a handoff',async()=>{
  for(const absent of [true,false]){const h=harness();for(const key of h.memory.keys())absent?h.memory.delete(key):h.memory.set(key,JSON.stringify({version:2}));
    assert.equal((await h.post()).status,409);assert.equal(h.commands.filter(c=>c[0]==='SET').length,0);}
});

test('request origin, content type, size and JSON shape are enforced',async()=>{
  const h=harness();
  assert.equal((await h.post(h.body,{origin:'https://example.com'})).status,403);
  assert.equal((await h.post(h.body,{'content-type':'text/plain'})).status,415);
  assert.equal((await h.post('x'.repeat(16385))).status,413);
  for(const body of ['{broken','null','[]'])assert.equal((await h.post(body)).status,400);
});

test('invalid, missing and expired bearer capabilities are rejected',async()=>{
  const h=harness();assert.equal((await h.get('../../secret')).status,400);assert.equal((await h.get('a'.repeat(43))).status,410);
  const result=await(await h.post()).json();const key=[...h.memory.keys()].find(k=>k.startsWith('topshelf:mobile:'));
  h.memory.set(key,JSON.stringify({...JSON.parse(h.memory.get(key)),expires:Date.now()-1}));assert.equal((await h.get(result.id)).status,410);
});

test('public reconciliation uses chain state and closes the RPC provider',async()=>{
  for(const registered of [false,true]){const h=harness({registered});const response=await h.get('',`?status=1&run=${h.ticket.runId}`);
    assert.equal(response.status,200);assert.equal((await response.json()).registered,registered);assert.deepEqual(h.stats(),{destroyed:1,rpcCalls:1});}
  const h=harness({chain:'0x1'});assert.equal((await h.get('',`?status=1&run=${h.ticket.runId}`)).status,503);assert.equal(h.stats().destroyed,1);
});

test('unconfigured, rate-limited and failed providers do not return successful drafts',async()=>{
  for(const [options,status] of [[{env:{TOPSHELF_RUN_SECRET:''}},503],[{rateCount:121},429],[{storageFailure:true},503]]){
    const h=harness(options),response=await h.post();assert.equal(response.status,status);assert.doesNotMatch(await response.text(),/private-provider-detail/);
    assert.equal(h.commands.filter(c=>c[0]==='SET').length,0);
  }
});
