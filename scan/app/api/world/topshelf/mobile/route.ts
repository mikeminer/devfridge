import {NextRequest,NextResponse} from 'next/server';
import {getAddress} from 'ethers';
import {createMobileDraft,readMobileDraft} from '../../../../../lib/topshelf/mobile-handoff';
import {RegistrationError,scoreRateLimit,scoreStore,unseal} from '../../../../../lib/topshelf/registration-security';
import {finishedLiveRun} from '../../../../../lib/topshelf/live-run';
import {shelfConnection} from '../../../../../lib/topshelf/server';
import {TOPSHELF_CHAIN} from '../../../../../lib/topshelf/config';
import type {RunTicket} from '../../../../../lib/topshelf/score-protocol';
import rules from '../../../../../lib/topshelf/engine/rules.json';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
function credentials(){
  const secret=process.env.TOPSHELF_RUN_SECRET,contract=process.env.TOPSHELF_CONTRACT_ADDRESS;
  if(!secret||secret.length<32||!contract)throw new RegistrationError('Mobile registration is not activated yet.',503);
  return {secret,contract:getAddress(contract)};
}
async function limit(req:NextRequest,secret:string){
  const ip=process.env.VERCEL?req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local';
  await scoreRateLimit(`mobile-handoff:${ip}`,120,60);
}
function failure(error:unknown){return error instanceof RegistrationError?json({error:error.message},error.status):json({error:'Registration is temporarily unavailable. No payment was requested.'},503);}
export async function POST(req:NextRequest){
  try{
    const origin=req.headers.get('origin');
    const local=process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||'');
    if(origin!=='https://world.devfridge.cool'&&!local)return json({error:'Invalid origin.'},403);
    if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'Expected JSON.'},415);
    const {secret,contract}=credentials();await limit(req,secret);
    const reader=req.body?.getReader();if(!reader)return json({error:'Missing body.'},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return json({error:'Request too large.'},413);}chunks.push(value);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json({error:'Invalid JSON.'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request.'},400);
    return json(await createMobileDraft(body,{secret,contract,rules:rules.id,unseal:value=>unseal<RunTicket>(value,secret,'run'),finish:finishedLiveRun,store:scoreStore}));
  }catch(error){return failure(error);}
}
export async function GET(req:NextRequest){
  try{
    const {secret,contract}=credentials();await limit(req,secret);
    if(req.nextUrl.searchParams.get('status')!=='1'){
      const id=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
      return json(await readMobileDraft(id,scoreStore));
    }
    // usedRun is public contract data. A known run can be checked after its signing ticket expires.
    const runId=req.nextUrl.searchParams.get('run')||'';
    if(!/^0x[0-9a-f]{64}$/i.test(runId))return json({error:'Invalid run.'},400);
    const c=shelfConnection();if(!c||getAddress(c.address)!==contract)throw new RegistrationError('Score network unavailable.',503);
    try{
      if(Number(BigInt(await c.provider.send('eth_chainId',[])))!==TOPSHELF_CHAIN)throw new RegistrationError('Score network unavailable.',503);
      const registered=Boolean(await c.contract.usedRun(runId));
      return json({runId,registered});
    }finally{c.provider.destroy();}
  }catch(error){return failure(error);}
}
