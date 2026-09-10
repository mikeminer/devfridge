import {NextRequest,NextResponse} from 'next/server';
import {getAddress,isAddress} from 'ethers';
import {displayName,saveDisplayName} from '@/lib/topshelf/names';
import {RegistrationError} from '@/lib/topshelf/registration-security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest){const wallet=request.nextUrl.searchParams.get('wallet')||'';if(!isAddress(wallet))return NextResponse.json({error:'Invalid wallet'},{status:400,headers});return NextResponse.json({wallet:getAddress(wallet),name:await displayName(wallet)},{headers});}
export async function POST(request:NextRequest){try{const origin=request.headers.get('origin'),local=process.env.NODE_ENV==='development'&&origin&&/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);if(origin!=='https://world.devfridge.cool'&&!local)throw new RegistrationError('Invalid origin',403);if(Number(request.headers.get('content-length')||0)>4096)throw new RegistrationError('Request too large',413);const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body)||!isAddress(body.wallet))throw new RegistrationError('Invalid request');const name=await saveDisplayName(body.wallet,body.name,body.timestamp,body.signature);return NextResponse.json({wallet:getAddress(body.wallet),name},{headers});}catch(e){return NextResponse.json({error:e instanceof RegistrationError?e.message:'Could not save the display name.'},{status:e instanceof RegistrationError?e.status:503,headers});}}
