import {NextRequest,NextResponse} from 'next/server';
import {isAddress,ZeroAddress} from 'ethers';
import {readShelf} from '@/lib/topshelf/server';
import {displayNames} from '@/lib/topshelf/names';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
 const q=request.nextUrl.searchParams,cursor=q.get('cursor')||ZeroAddress,wallet=q.get('wallet');
 const season=q.has('season')?Number(q.get('season')):null,claimSeason=q.has('claimSeason')?Number(q.get('claimSeason')):null;
 if(!isAddress(cursor)||(wallet&&!isAddress(wallet))||(season!==null&&(!Number.isSafeInteger(season)||season<1))||(claimSeason!==null&&(!Number.isSafeInteger(claimSeason)||claimSeason<0)))return NextResponse.json({error:'Invalid request'},{status:400});
 try{const data=await readShelf(season,cursor,wallet,claimSeason),names=await displayNames(data.rows.map(row=>row.address));return NextResponse.json({...data,rows:data.rows.map(row=>({...row,name:names.get(row.address.toLowerCase())||undefined}))},{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Robinhood data is unavailable. Please retry; no balances or scores have been assumed.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
