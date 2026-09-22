import {test} from 'node:test';
import assert from 'node:assert/strict';
import {streamGrok,FALLBACK_MODEL,PRIMARY_MODEL} from '../lib/grok.mjs';

const error=(status,message='Provider unavailable')=>Object.assign(new Error(message),{statusCode:status});
const result=(...parts)=>({fullStream:(async function*(){yield* parts;})()});
const text={type:'text-delta',text:'Documented answer'};
const collect=async stream=>{const parts=[];for await(const part of stream)parts.push(part);return parts;};

test('a restricted free-tier primary falls back to Grok without unsupported X tools',async()=>{
 const calls=[],fallbacks=[];
 const parts=await collect(streamGrok({start:async profile=>{
  calls.push(profile);
  return calls.length===1?result({type:'error',error:error(403,'Free tier users do not have access to this model. Upgrade to paid credits.')}):result(text);
 },onFallback:details=>fallbacks.push(details)}));
 assert.deepEqual(parts,[text]);assert.equal(calls[0].model,PRIMARY_MODEL);
 assert.equal(calls[0].xSearch,true);assert.equal(calls[1].model,FALLBACK_MODEL);
 assert.equal(calls[1].xSearch,false);assert.deepEqual(calls[1].providerOptions.gateway.only,['vertex']);
 assert.equal(fallbacks.length,1);
});

test('a healthy primary retains X search and never starts fallback',async()=>{
 let calls=0;
 assert.deepEqual(await collect(streamGrok({start:async()=>{calls++;return result(text);}})),[text]);
 assert.equal(calls,1);
});

test('never replaces a partially streamed response with another model',async()=>{
 let calls=0;
 await assert.rejects(()=>collect(streamGrok({start:async()=>{calls++;return result(text,{type:'error',error:error(503)});}})),/Provider unavailable/);
 assert.equal(calls,1);
});

test('aborted requests and authentication or request errors do not trigger fallback',async()=>{
 for(const [status,signal] of [[401,undefined],[400,undefined],[403,undefined],[503,AbortSignal.abort()]]){
  let calls=0;
  await assert.rejects(()=>collect(streamGrok({signal,start:async()=>{calls++;throw error(status);}})));
  assert.equal(calls,1);
 }
});

test('transient failures retry once and fail visibly if both providers fail',async()=>{
 for(const status of [429,503]){
  let calls=0;
  await assert.rejects(()=>collect(streamGrok({start:async()=>{calls++;throw error(status);}})));
  assert.equal(calls,2);
 }
 await assert.rejects(()=>collect(streamGrok({start:async()=>result()})),/Empty answer/);
});
