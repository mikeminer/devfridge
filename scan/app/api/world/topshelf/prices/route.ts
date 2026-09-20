import {NextResponse} from 'next/server';
import {readFeeMenu} from '@/lib/topshelf/server';
import {parsePonsPrice} from '@/lib/topshelf/valuation';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const menu = await readFeeMenu();
    const entries = await Promise.all(menu.tokens.map(async token => {
      let price: number | null = null;
      try {
        const response = await fetch(`https://www.ponsfamily.com/launchpad/${token.address}`, {
          next: {revalidate: 300}, signal: AbortSignal.timeout(6000),
          headers: {'User-Agent': 'DevFridge-TopShelf/1.0'},
        });
        if (response.ok) price = parsePonsPrice(await response.text(), token.address);
      } catch { /* Missing prices stay unranked; never substitute token units. */ }
      return [token.address.toLowerCase(), price];
    }));
    return NextResponse.json({prices: Object.fromEntries(entries)}, {
      headers: {'Cache-Control': 'public, max-age=60, s-maxage=60'},
    });
  } catch {
    return NextResponse.json({error: 'Pons valuations unavailable'}, {status: 503});
  }
}
