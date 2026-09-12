import {NextRequest,NextResponse} from 'next/server';
import {registerAction,registrationStatus} from '@/lib/topshelf/registration';
import {RegistrationError} from '@/lib/topshelf/registration-security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
export const preferredRegion=['iad1','fra1'];
const headers={'Cache-Control':'no-store'};
export async function GET(){return NextResponse.json(await registrationStatus(),{headers});}
export async function POST(request:NextRequest) {
 try {
  const origin=request.headers.get('origin');
  const local=process.env.NODE_ENV==='development'&&origin&&/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  if(origin!=='https://world.devfridge.cool'&&!local)throw new RegistrationError('Invalid origin',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new RegistrationError('JSON required',415);
  const reader=request.body?.getReader();if(!reader)throw new RegistrationError('Missing request');
  const chunks:Uint8Array[]=[];let length=0;
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>512*1024){await reader.cancel();throw new RegistrationError('Replay too large',413);}chunks.push(value);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RegistrationError('Invalid JSON');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RegistrationError('Invalid request');
  // Vercel overwrites this header; never trust a body-supplied client identity.
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'local';
  return NextResponse.json(await registerAction(body,ip),{headers});
 }catch(e){const error=e instanceof RegistrationError?e:null;return NextResponse.json({error:error?.message||'Score verification is temporarily unavailable. No payment was requested.',retryAfter:error?.retryAfter},{status:error?.status||503,headers:{...headers,...(error?.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});}
}
