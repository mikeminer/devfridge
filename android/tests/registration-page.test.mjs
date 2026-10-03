import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../package.json',import.meta.url));
const {Window}=require('happy-dom');
let source;
if (process.env.REGISTRATION_BUNDLE) source=await readFile(process.env.REGISTRATION_BUNDLE,'utf8');
else {
 for(const candidate of [
  new URL('../../scan/public/world/mobile-register/registration.js',import.meta.url),
  new URL('../../devfridge-mobile-release/scan/public/world/mobile-register/registration.js',import.meta.url),
  new URL('../../devfridge/scan/public/world/mobile-register/registration.js',import.meta.url),
 ]) { try { source=await readFile(candidate,'utf8'); break; } catch(error) { if(error?.code!=='ENOENT')throw error; } }
}
const html=await readFile(new URL('../mobile/registration-page.html',import.meta.url),'utf8');
async function fixture({wrongAccount=false,expired=false,native=false}={}) {
 const window=new Window({url:'https://world.devfridge.cool/world/mobile-register/index.html'+(native?'?native=1':'')+'#'+'a'.repeat(43)});
 window.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
 const requests=[];let account='SolanaTestWallet';
 window.phantom={solana:{isConnected:false,publicKey:{toString:()=>account},async connect(){this.isConnected=true;if(wrongAccount)account='DifferentWallet';}}};
 window.fetch=async(url,options)=>{
  requests.push({url,options});
  if(url==='/api/world/topshelf/mobile')return Response.json(expired?{error:'Registration link expired.'}:{runId:'0x'+'ab'.repeat(32),wallet:'SolanaTestWallet',ticket:'sealed-ticket',season:1,character:1,seed:5,score:42,ticks:50,expires:Date.now()+60000,hash:'0x'+'bc'.repeat(32)},{status:expired?410:200});
  if(url==='/api/world/topshelf/fees')return Response.json({configured:true,address:'0xc1DB49694E0DB50778c333350C8A553fDE221989',tokens:[{address:'0x'+'12'.repeat(20),symbol:'TEST',decimals:18,fee:'1000000000000000000',enabled:true}]});
  throw Error('Unexpected request in test');
 };
 vm.runInNewContext(source,{window,document:window.document,location:window.location,localStorage:window.localStorage,sessionStorage:window.sessionStorage,fetch:window.fetch,AbortSignal,TextEncoder,TextDecoder,URLSearchParams,Uint8Array,console,setTimeout,clearTimeout});
 await new Promise(r=>setTimeout(r,20));
 return {window,requests,close:()=>window.happyDOM.abort()};
}
test('built Phantom page retrieves the server draft and renders the real registration controls',{skip:!source},async()=>{
 const f=await fixture(),doc=f.window.document;
 assert.match(doc.getElementById('summary').textContent,/42 points/);
 assert.equal(f.requests[0].options.headers.Authorization,'Bearer '+'a'.repeat(43));
 await doc.getElementById('connect').onclick();
 doc.querySelector('#registration button').onclick();await new Promise(r=>setTimeout(r,25));
 assert.match(doc.querySelector('#registration').textContent,/permanently links/);
 assert.match(doc.querySelector('[data-token]').textContent,/TEST/);
 assert.equal(doc.querySelector('[data-verify]').disabled,true);
 assert.equal(doc.querySelector('[data-pay]').hidden,true);
 await f.close();
});

test('native signing path opens the existing payment UI without requiring a Phantom Solana account',{skip:!source},async()=>{
 const f=await fixture({native:true,wrongAccount:true}),doc=f.window.document;
 delete f.window.phantom.solana;
 assert.equal(doc.getElementById('native-connect').hidden,false);
 doc.getElementById('native-connect').onclick();
 doc.querySelector('#registration button').onclick();await new Promise(r=>setTimeout(r,25));
 assert.match(doc.querySelector('[data-token]').textContent,/TEST/);
 assert.equal(doc.querySelector('[data-pay]').hidden,true);
 assert.match(doc.getElementById('status').textContent,/original wallet/);await f.close();
});
test('different Solana account and expired links cannot proceed to payment',{skip:!source},async()=>{
 const f=await fixture({wrongAccount:true});await f.window.document.getElementById('connect').onclick();
 assert.match(f.window.document.getElementById('status').textContent,/same Solana account/);
 assert.equal(f.window.document.querySelector('[data-pay]'),null);await f.close();
 const g=await fixture({expired:true});assert.equal(g.window.document.getElementById('connect').hidden,true);
 assert.match(g.window.document.getElementById('status').textContent,/expired/);await g.close();
});
