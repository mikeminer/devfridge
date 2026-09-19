const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {NextRequest}=require('next/server');
const {Keypair}=require('@solana/web3.js'),nacl=require('tweetnacl');

function fixture(options={}){
  const secret='test-secret-for-native-relay-at-least-32',contract='0x'+'34'.repeat(20),id='a'.repeat(43),memory=new Map(),commands=[];
  const env={NODE_ENV:'production',VERCEL:'1',TOPSHELF_RUN_SECRET:secret,TOPSHELF_CONTRACT_ADDRESS:contract,KV_REST_API_URL:'https://storage.invalid',KV_REST_API_TOKEN:'test',...options.env};
  const cache=new Map();
  function load(file){
    file=path.resolve(__dirname,file);if(cache.has(file))return cache.get(file);
    const exports={};cache.set(file,exports);
    const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{exports,Buffer,Date,URL,Response,AbortSignal,process:{env},fetch:async(url,init)=>{
      assert.equal(url,'https://storage.invalid');if(options.storageFailure)throw Error('private storage detail');
      const c=JSON.parse(init.body);commands.push(c);let result;
      if(c[0]==='EVAL')result=[options.rateCount??1,30];
      else if(c[0]==='GET')result=memory.get(c[1])??null;
      else if(c[0]==='SET'){if(c.includes('NX')&&memory.has(c[1]))result=null;else {memory.set(c[1],c[2]);result='OK';}}
      else throw Error('Unexpected command');return Response.json({result});
    },require:name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name)},{filename:file});return exports;
  }
  const route=load('../app/api/world/topshelf/mobile/signature/route.ts'),security=load('../lib/topshelf/registration-security.ts');
  const handoff=load('../lib/topshelf/mobile-handoff.ts'),protocol=load('../lib/topshelf/score-protocol.ts');
  const solana=Keypair.generate(),now=Date.now();
  const draft={ticket:'existing-server-ticket',runId:'0x'+'12'.repeat(32),wallet:solana.publicKey.toBase58(),character:1,seed:9,season:2,score:123,ticks:1000,hash:'0x'+'56'.repeat(32),expires:now+600000};
  memory.set(handoff.handoffKey(id),JSON.stringify(draft));
  const challenge={kind:'score',runId:draft.runId,wallet:draft.wallet,player:'0x'+'78'.repeat(20),season:2,hash:draft.hash,token:'0x'+'90'.repeat(20),amount:'100',score:123,ticks:1000,expires:now+300000,contract};
  const sealed=c=>security.seal(c,secret);
  const post=(body,cap=id,headers={})=>route.POST(new NextRequest('https://world.devfridge.cool/api/world/topshelf/mobile/signature',{method:'POST',headers:{origin:'https://world.devfridge.cool','content-type':'application/json',authorization:'Bearer '+cap,...headers},body:typeof body==='string'?body:JSON.stringify(body)}));
  const get=(request,cap=id)=>route.GET(new NextRequest('https://world.devfridge.cool/api/world/topshelf/mobile/signature?request='+request,{headers:{authorization:'Bearer '+cap}}));
  const prepare=async(c=challenge)=>{const response=await post({action:'prepare',challenge:sealed(c)});return {response,data:await response.json()};};
  const sign=(c=challenge,key=solana)=>Buffer.from(nacl.sign.detached(Buffer.from(protocol.registrationMessage(c)),key.secretKey)).toString('base64');
  return {id,draft,challenge,post,get,prepare,sign,sealed,memory,commands,handoff};
}

test('Seed Vault identity signs while a different EVM wallet remains the payment recipient',async()=>{
  const f=fixture(),{response,data}=await f.prepare();assert.equal(response.status,200);
  const pending=await(await f.get(data.request)).json();assert.equal(pending.wallet,f.draft.wallet);assert.equal(pending.player,f.challenge.player);assert.equal(pending.signature,null);
  assert.match(pending.message,/This message does not transfer tokens/);
  const signed=await f.post({action:'complete',request:data.request,signature:f.sign()});assert.equal(signed.status,200);assert.equal((await signed.json()).approved,true);
  assert.equal((await(await f.get(data.request)).json()).signature,f.sign());
  const retry=await f.prepare();assert.equal(retry.data.request,data.request);assert.equal((await(await f.get(data.request)).json()).signature,f.sign());
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
});
for(const field of ['runId','wallet','season','hash','score','ticks','contract'])test(`sealed challenge for another ${field} is rejected`,async()=>{
  const f=fixture(),old=f.challenge[field],value=typeof old==='number'?old+1:field==='contract'?'0x'+'ff'.repeat(20):'other';
  assert.equal((await f.prepare({...f.challenge,[field]:value})).response.status,403);
});
test('forged challenges, expired challenges and missing local capabilities cannot start signing',async()=>{
  const f=fixture();assert.equal((await f.post({action:'prepare',challenge:f.sealed(f.challenge)+'x'})).status,400);
  assert.equal((await f.prepare({...f.challenge,expires:Date.now()-1})).response.status,400);
  assert.equal((await f.post({action:'prepare',challenge:f.sealed(f.challenge)},'b'.repeat(43))).status,410);
});
test('another Solana wallet or a signature for a different EVM wallet, fee or token is rejected',async()=>{
  const f=fixture(),{data}=await f.prepare();
  const {Keypair}=require('@solana/web3.js');
  const signatures=[f.sign(f.challenge,Keypair.generate()),...['player','token','amount'].map(field=>f.sign({...f.challenge,[field]:field==='amount'?'999':'0x'+'aa'.repeat(20)}))];
  for(const signature of signatures)assert.equal((await f.post({action:'complete',request:data.request,signature})).status,403);
  assert.equal((await(await f.get(data.request)).json()).signature,null);
});
test('requests are bound to their bearer capability and expire with the original run',async()=>{
  const f=fixture(),{data}=await f.prepare(),other='b'.repeat(43);
  f.memory.set(f.handoff.handoffKey(other),JSON.stringify(f.draft));
  assert.equal((await f.get(data.request,other)).status,410);
  assert.equal((await f.get('x'.repeat(43))).status,410);
  f.memory.set(f.handoff.handoffKey(f.id),JSON.stringify({...f.draft,expires:Date.now()-1}));
  assert.equal((await f.get(data.request)).status,410);
  assert.equal((await f.post({action:'complete',request:data.request,signature:f.sign()})).status,410);
  const writes=f.commands.filter(c=>c[0]==='SET');for(const c of writes){assert.ok(c.includes('NX'));assert.ok(c.at(-1)>0&&c.at(-1)<=300000);}
});
test('origin, body size, malformed inputs, rate limits and unavailable storage fail closed',async()=>{
  const f=fixture();assert.equal((await f.post({},f.id,{origin:'https://evil.test'})).status,403);
  assert.equal((await f.post({},f.id,{'content-type':'text/plain'})).status,415);
  assert.equal((await f.post('x'.repeat(8193))).status,413);
  for(const body of ['{','null','[]'])assert.equal((await f.post(body)).status,400);
  assert.equal((await f.get('../bad')).status,400);assert.equal((await f.get('a'.repeat(43),'')).status,400);
  assert.equal((await fixture({rateCount:241}).prepare()).response.status,429);
  const failed=await fixture({storageFailure:true}).prepare();assert.equal(failed.response.status,503);assert.doesNotMatch(JSON.stringify(failed.data),/private storage/);
});
