/** USD spot for a Solana mint. Jupiter v2 is gone; v3 + DexScreener + pump.fun. */
export async function usdPrice(mint: string): Promise<number | null> {
  const fromJup = await jupiterUsd(mint);
  if (fromJup != null) return fromJup;
  const fromDex = await dexUsd(mint);
  if (fromDex != null) return fromDex;
  return pumpUsd(mint);
}

async function jupiterUsd(mint: string): Promise<number | null> {
  for (const url of [
    `https://lite-api.jup.ag/price/v3?ids=${mint}`,
    `https://api.jup.ag/price/v3?ids=${mint}`,
    `https://lite-api.jup.ag/price/v2?ids=${mint}`,
    `https://api.jup.ag/price/v2?ids=${mint}`,
  ]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const row =
        (json[mint] as Record<string, unknown> | undefined) ||
        ((json.data as Record<string, Record<string, unknown>> | undefined)?.[mint]);
      const raw = row?.usdPrice ?? row?.price;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* next source */
    }
  }
  return null;
}

async function dexUsd(mint: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      pairs?: Array<{ priceUsd?: string; liquidity?: { usd?: number } }>;
    };
    const pairs = json.pairs ?? [];
    const best = [...pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];
    const n = Number(best?.priceUsd);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

async function pumpUsd(mint: string): Promise<number | null> {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      usd_market_cap?: number;
      total_supply?: number;
    };
    const cap = Number(json.usd_market_cap);
    const supply = Number(json.total_supply);
    if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(supply) || supply <= 0) {
      return null;
    }
    const ui = supply / 1e6;
    const n = cap / ui;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
