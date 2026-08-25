import type { LockAccount } from "./fridge";

type TvlResult = {
  totalUsd: number;
  byMint: Map<string, { amount: number; usd: number }>;
};

let cache: { result: TvlResult; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function fetchTvl(locks: LockAccount[]): Promise<TvlResult> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.result;

  const now = Math.floor(Date.now() / 1000);
  const active = locks.filter((l) => l.unlockAt > now);
  if (active.length === 0) {
    const empty: TvlResult = { totalUsd: 0, byMint: new Map() };
    cache = { result: empty, ts: Date.now() };
    return empty;
  }

  // Aggregate raw amounts per mint (all pump.fun Token-2022 = 6 decimals)
  const mintTotals = new Map<string, bigint>();
  for (const lock of active) {
    const mint = lock.mint.toBase58();
    mintTotals.set(mint, (mintTotals.get(mint) ?? 0n) + lock.amount);
  }

  // Fetch prices from DexScreener (batch, comma-separated)
  const mintList = [...mintTotals.keys()];
  const prices = new Map<string, number>();
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mintList.join(",")}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        pairs?: Array<{
          baseToken?: { address?: string };
          priceUsd?: string;
          liquidity?: { usd?: number };
        }>;
      };
      for (const pair of data.pairs ?? []) {
        const addr = pair.baseToken?.address;
        if (!addr) continue;
        const price = Number(pair.priceUsd ?? 0);
        const liq = pair.liquidity?.usd ?? 0;
        const prev = prices.get(addr);
        // Keep highest-liquidity pair price
        if (prev === undefined || liq > (prices.get(`${addr}:liq`) ?? 0)) {
          prices.set(addr, price);
          prices.set(`${addr}:liq`, liq);
        }
      }
    }
  } catch {
    // price fetch failed — TVL will be $0
  }

  const byMint = new Map<string, { amount: number; usd: number }>();
  let totalUsd = 0;

  for (const [mint, rawAmount] of mintTotals) {
    const tokens = Number(rawAmount) / 1e6;
    const price = prices.get(mint) ?? 0;
    const usd = tokens * price;
    byMint.set(mint, { amount: tokens, usd });
    totalUsd += usd;
  }

  const result: TvlResult = { totalUsd, byMint };
  cache = { result, ts: Date.now() };
  return result;
}
