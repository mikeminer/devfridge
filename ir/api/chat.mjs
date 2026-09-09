import {ToolLoopAgent,tool,jsonSchema,isStepCount} from 'ai';
import {xai} from '@ai-sdk/xai';
import {getContext,readDocumentation,DOCS,instructions} from '../lib/context.mjs';
import {validateBody,allowedOrigin,publicSource} from '../lib/request.mjs';

export default async function chat(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');res.statusCode=405;res.end();return;}
 if(!allowedOrigin(req.headers.origin,req.headers.host)){res.statusCode=403;res.end();return;}
 if(!req.headers['content-type']?.startsWith('application/json')||Number(req.headers['content-length']||0)>40000){res.statusCode=400;res.end();return;}
 let messages;
 try{messages=validateBody(typeof req.body==='string'?JSON.parse(req.body):req.body);}catch{res.statusCode=400;res.end();return;}
 const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),52000);res.on('close',()=>{if(!res.writableEnded)abort.abort();});
 const send=value=>res.write(JSON.stringify(value)+'\n');
 try{
  const context=await getContext();const used=new Map(context.sources.filter(s=>!s.unavailable).map(s=>[s.url,{url:s.url,title:new URL(s.url).hostname}]));
  const agent=new ToolLoopAgent({model:process.env.IR_MODEL||'spacexai/grok-4.6',instructions:instructions(context),maxOutputTokens:2200,reasoning:'low',maxRetries:0,stopWhen:isStepCount(3),providerOptions:{xai:{store:false},gateway:{only:['xai']}},tools:{
   readDocumentation:tool({description:'Read a current page of the official DevFridge documentation. Use for mechanics, rules, availability and integration details.',inputSchema:jsonSchema({type:'object',properties:{slug:{type:'string',enum:DOCS}},required:['slug'],additionalProperties:false}),execute:async({slug})=>{try{const source=await readDocumentation(slug);used.set(source.url,{url:source.url,title:'Docs · '+slug});return source;}catch{return {unavailable:true,slug};}}}),
   x_search:xai.tools.xSearch({allowedXHandles:['anonimocommando']})
  }});
  const result=await agent.stream({messages,abortSignal:abort.signal});
  res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');res.setHeader('X-Accel-Buffering','no');res.statusCode=200;
  let xSearched=false,hasText=false;
  for await(const part of result.fullStream){
   if(part.type==='text-delta'){hasText=true;send({type:'text',text:part.text});}
   if(part.type==='tool-result'&&part.toolName==='x_search')xSearched=true;
   if(part.type==='source'){const source=publicSource(part);if(source)used.set(source.url,source);}
   if(part.type==='error')throw new Error('Generation failed');
  }
  if(!hasText)throw new Error('Empty answer');
  send({type:'done',sources:[...used.values()].map(publicSource).filter(Boolean),xSearched,retrievedAt:context.retrievedAt});res.end();
 }catch(error){console.error('IR request failed',{name:error.name,aborted:abort.signal.aborted});if(!res.headersSent){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'temporarily_unavailable'}));}else{send({type:'error'});res.end();}}
 finally{clearTimeout(timeout);}
}
