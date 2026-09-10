import {NextResponse} from 'next/server';
import {ZeroAddress} from 'ethers';
import {shelfConnection} from '@/lib/topshelf/server';
import {TOPSHELF_CHAIN} from '@/lib/topshelf/config';
import {displayNames} from '@/lib/topshelf/names';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store'};
/** Small public ranking feed; token balance/claim queries are unnecessary in the kitchen. */
export async function GET() {
  let connection: ReturnType<typeof shelfConnection> = null;
  try {
    connection = shelfConnection();
    if (!connection) return NextResponse.json({configured: false, season: null, block: null, rows: []}, {headers});
    const {provider, contract} = connection;
    if (Number(BigInt(await provider.send('eth_chainId', []))) !== TOPSHELF_CHAIN) throw Error('Wrong network');
    const block = await provider.getBlockNumber(), options = {blockTag: block};
    const season = await contract.currentSeason(options);
    const [accounts, scores] = await contract.leaderboard(season, ZeroAddress, 10, options);
    const names=await displayNames(accounts);
    return NextResponse.json({configured: true, season: Number(season), block, rows: accounts.map((address: string, i: number) => ({address, name:names.get(address.toLowerCase())||undefined, score: String(scores[i]), rank: i + 1}))}, {headers});
  } catch {
    return NextResponse.json({error: 'Leaderboard unavailable'}, {status: 503, headers});
  } finally { connection?.provider.destroy(); }
}
