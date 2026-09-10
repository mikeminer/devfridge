import {NextResponse} from 'next/server';
import {readFeeMenu} from '@/lib/topshelf/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET() {
 try {
  return NextResponse.json(await readFeeMenu(),{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=300'}});
 } catch {
  return NextResponse.json({error:'Robinhood token fees are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'public, s-maxage=5, stale-while-revalidate=30','Retry-After':'5'}});
 }
}
