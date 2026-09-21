import {NextResponse} from 'next/server';
import {readCommunityCup} from '@/lib/topshelf/community-cup';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'public, s-maxage=30, stale-while-revalidate=120'};

export async function GET(){
 try{return NextResponse.json(await readCommunityCup(),{headers});}
 catch{return NextResponse.json({error:'Community Cup standings are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
