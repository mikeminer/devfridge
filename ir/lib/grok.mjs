export const PRIMARY_MODEL='spacexai/grok-4.6';
export const FALLBACK_MODEL='spacexai/grok-4.1-fast-non-reasoning';

// Vertex hosts the fallback Grok model but does not accept xAI's x_search tool.
export async function* streamGrok({start,signal,model=PRIMARY_MODEL,onFallback=()=>{}}){
 const profiles=[{model,xSearch:true,providerOptions:{xai:{store:false},gateway:{only:['xai']}}},
  {model:FALLBACK_MODEL,xSearch:false,providerOptions:{gateway:{only:['vertex']}}}];
 for(let index=0;index<profiles.length;index++){
  let sentText=false;
  try{
   const result=await start(profiles[index]);
   for await(const part of result.fullStream){
    if(part.type==='error')throw part.error instanceof Error?part.error:new Error('Generation failed');
    if(part.type==='text-delta'&&part.text)sentText=true;
    yield part;
   }
   if(!sentText)throw new Error('Empty answer');
   return;
  }catch(error){
   const status=error.statusCode;
   const unavailable=status===429||status>=500||
    (status===403&&/free tier|restricted.*model|paid credits/i.test(error.message));
   if(index!==0||sentText||signal?.aborted||!unavailable)throw error;
   onFallback({from:profiles[0].model,to:FALLBACK_MODEL,status});
  }
 }
}
