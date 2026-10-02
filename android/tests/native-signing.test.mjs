import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../cold-storage/package.json',import.meta.url));
const {Window}=require('happy-dom'),{build}=require('esbuild');
const result=await build({entryPoints:[fileURLToPath(new URL('../mobile/native-signing.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'});
function fixture(){
 const window=new Window(),ui=window.document.createElement('section'),calls=[];ui.scrollIntoView=()=>{};
 const draft={wallet:'seed-vault-wallet',runId:'0x'+'ab'.repeat(32),expires:Date.now()+300000};
 let active,signature=null,counter=0;
 const quote={challenge:'server-sealed-challenge',message:'Exact server authorization',amount:'100'};
 const sandbox={module:{exports:{}},localStorage:window.localStorage,document:window.document,Date,JSON,TextDecoder,Uint8Array,atob,AbortSignal,setTimeout:fn=>setTimeout(fn,1),fetch:async(url,options)=>{
   calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer '+'a'.repeat(43));
   if(options.method==='POST'){active=String(++counter).repeat(43);return Response.json({request:active,runId:draft.runId,expires:Date.now()+250000});}
   return Response.json({request:active,runId:draft.runId,wallet:draft.wallet,message:quote.message,signature});
 }};
 vm.runInNewContext(result.outputFiles[0].text,sandbox);
 const create=()=>sandbox.module.exports.createNativeSigning(draft,'a'.repeat(43),ui,async()=>({...quote}));
 return {window,ui,calls,draft,quote,create,approve:()=>{signature=Buffer.alloc(64,7).toString('base64');},close:()=>window.happyDOM.abort()};
}
test('native broker binds the exact server challenge and restores its persisted authorization',async()=>{
 const f=fixture(),body={ticket:'ticket',ticks:1,score:2,action:'challenge',player:'evm-one',token:'token-one'};
 const a=f.create();await a.createChallenge(body);
 const b=f.create();await b.createChallenge(body);assert.equal(f.calls.length,1);
 const signing=b.signRegistration(new TextEncoder().encode(f.quote.message),f.quote.challenge);
 assert.match(f.ui.querySelector('a').href,/devfridgeworld:\/\/registration\?run=0x/);
 f.approve();assert.equal((await signing).length,64);
 await b.createChallenge({...body,player:'evm-two'});assert.equal(f.calls.filter(c=>c.options.method==='POST').length,2);
 await f.close();
});
test('native broker never accepts another message and allows cancelling without a payment',async()=>{
 const f=fixture(),a=f.create();await a.createChallenge({player:'evm'});
 await assert.rejects(a.signRegistration(new TextEncoder().encode('tampered'),f.quote.challenge),/changed/);
 const pending=a.signRegistration(new TextEncoder().encode(f.quote.message),f.quote.challenge);
 f.ui.querySelector('button').click();await assert.rejects(pending,/cancelled/);
 assert.equal(f.calls.filter(c=>c.options.method==='POST').length,1);await f.close();
});
