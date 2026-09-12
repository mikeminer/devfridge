import {NextRequest, NextResponse} from 'next/server';
import {PublicKey} from '@solana/web3.js';
import {readPlayerBest} from '@/lib/topshelf/server';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store'};

function solanaWallet(value: string | null) {
  try {
    if (!value) throw Error();
    const key = new PublicKey(value);
    if (!PublicKey.isOnCurve(key.toBytes())) throw Error();
    return key.toBase58();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const wallet = solanaWallet(request.nextUrl.searchParams.get('wallet'));
  if (!wallet) return NextResponse.json({error: 'Invalid Solana wallet'}, {status: 400, headers});
  try {
    return NextResponse.json(await readPlayerBest(wallet), {headers});
  } catch (error) {
    const invalid = error instanceof Error && error.message === 'Invalid Solana wallet';
    if (invalid) return NextResponse.json({error: 'Invalid Solana wallet'}, {status: 400, headers});
    return NextResponse.json({error: 'On-chain best is unavailable'}, {status: 503, headers});
  }
}
