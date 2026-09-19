import {NextRequest,NextResponse} from 'next/server';
import {getAddress} from 'ethers';
import {prepareMobileSignature,readMobileSignature,completeMobileSignature} from '../../../../../../lib/topshelf/mobile-signature';
import {RegistrationError,scoreRateLimit,scoreStore,unseal} from '../../../../../../lib/topshelf/registration-security';
import type {ScoreChallenge} from '../../../../../../lib/topshelf/score-protocol';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
function failure(error:unknown){return error instanceof RegistrationError?json({error:error.message},error.status):json({error:'Wallet authorization is temporarily unavailable. No payment was requested.'},503);}
async function context(req:NextRequest){
  const secret=process.env.TOPSHELF_RUN_SECRET,contract=process.env.TOPSHELF_CONTRACT_ADDRESS;
  if(!secret||secret.length<32||!contract)throw new RegistrationError('Wallet authorization is unavailable.',503);
  const id=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(id))throw new RegistrationError('Invalid mobile registration link.',400);
  const ip=process.env.VERCEL?req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local';
  await scoreRateLimit(`mobile-sign:${ip}`,240,60);
  return {id,dependencies:{secret,contract:getAddress(contract),store:scoreStore,unseal:(value:unknown)=>unseal<ScoreChallenge>(value,secret,'score')}};
}
export async function GET(req:NextRequest){
  try{const {id,dependencies}=await context(req);return json(await readMobileSignature(id,req.nextUrl.searchParams.get('request')||'',dependencies));}
  catch(error){return failure(error);}
}
export async function POST(req:NextRequest){
  try{
    const origin=req.headers.get('origin');
    const local=process.env.NODE_ENV==='development'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||'');
    if(origin!=='https://world.devfridge.cool'&&!local)return json({error:'Invalid origin.'},403);
    if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
    const {id,dependencies}=await context(req),reader=req.body?.getReader();
    if(!reader)return json({error:'Missing body.'},400);
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return json({error:'Request too large.'},413);}chunks.push(value);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json({error:'Invalid JSON.'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request.'},400);
    if(body.action==='prepare')return json(await prepareMobileSignature(id,body.challenge,dependencies));
    if(body.action==='complete'&&typeof body.request==='string')return json(await completeMobileSignature(id,body.request,body.signature,dependencies));
    return json({error:'Unknown signing action.'},400);
  }catch(error){return failure(error);}
}
