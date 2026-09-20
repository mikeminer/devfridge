import {NextRequest} from 'next/server';
import {isAddress} from 'ethers';

export const runtime='nodejs';
const PONS_ORIGIN='https://www.ponsfamily.com';
const CACHE='public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';

function fallback(address:string){
 const letters=address.slice(2,4).toUpperCase();
 return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="#172a27"/><circle cx="128" cy="128" r="86" fill="#c8ff5c"/><text x="128" y="151" text-anchor="middle" font-family="system-ui,sans-serif" font-size="70" font-weight="800" fill="#172a27">${letters}</text></svg>`,{headers:{'Content-Type':'image/svg+xml','Cache-Control':CACHE}});
}

export async function GET(request:NextRequest){
 const address=request.nextUrl.searchParams.get('token')||'';
 if(!isAddress(address))return new Response('Invalid token address',{status:400});
 try{
  const page=await fetch(`${PONS_ORIGIN}/launchpad/${address}`,{headers:{'User-Agent':'DevFridge-TopShelf/1.0'},next:{revalidate:604800}});
  if(!page.ok)return fallback(address);
  const html=await page.text(),match=html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if(!match)return fallback(address);
  const imageUrl=new URL(match[1].replace(/&amp;/g,'&'),PONS_ORIGIN);
  if(imageUrl.protocol!=='https:'||imageUrl.hostname!=='www.ponsfamily.com')return fallback(address);
  const image=await fetch(imageUrl,{headers:{'User-Agent':'DevFridge-TopShelf/1.0'},next:{revalidate:604800}});
  if(!image.ok)return fallback(address);
  const type=image.headers.get('content-type')||'image/webp';
  if(!type.startsWith('image/'))return fallback(address);
  return new Response(await image.arrayBuffer(),{headers:{'Content-Type':type,'Cache-Control':CACHE}});
 }catch{return fallback(address);}
}
