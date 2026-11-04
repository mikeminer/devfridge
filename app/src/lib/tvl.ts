import type { LockAccount } from "./fridge";

type PricedLock = LockAccount & { decimals?: number };

type TvlResult = {
  totalUsd: number;
  byMint: Map<string, { amount: number; usd: number }>;
};

const prices = new Map<string, { price: number; ts: number }>();
const CACHE_TTL = 60_000;

async function alchemyPrice(mint: string): Promise<number> {
  const cached = prices.get(mint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.price;
  const res = await fetch(`/api/pump-price?mint=${encodeURIComponent(mint)}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error("Price unavailable");
  const data = await res.json() as { priceUsd?: number };
  const price = data.priceUsd;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Price unavailable");
  }
  prices.set(mint, { price, ts: Date.now() });
  return price;
}

export async function fetchTvl(locks: PricedLock[]): Promise<TvlResult> {
  const now = Math.floor(Date.now() / 1000);
  const mintTotals = new Map<string, bigint>();
  const decimals = new Map<string, number>();
  for (const lock of locks) {
    if (lock.unlockAt <= now) continue;
    const mint = lock.mint.toBase58();
    mintTotals.set(mint, (mintTotals.get(mint) ?? 0n) + lock.amount);
    if (typeof lock.decimals === "number" && lock.decimals >= 0 && lock.decimals <= 18) {
      decimals.set(mint, lock.decimals);
    }
  }

  const byMint = new Map<string, { amount: number; usd: number }>();
  // Cache prices only: new, redeemed, or expired locks must change TVL immediately.
  // Missing prices must not become zero dollars.
  const values = await Promise.all([...mintTotals].map(async ([mint, rawAmount]) => {
    const price = await alchemyPrice(mint);
    const amount = Number(rawAmount) / 10 ** (decimals.get(mint) ?? 6);
    return { mint, amount, usd: amount * price };
  }));
  let totalUsd = 0;
  for (const { mint, amount, usd } of values) {
    byMint.set(mint, { amount, usd });
    totalUsd += usd;
  }
  return { totalUsd, byMint };
}
