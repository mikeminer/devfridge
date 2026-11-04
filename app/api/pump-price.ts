export const config = { runtime: "edge" };

const TIMEOUT = 8_000;

function priced(mint: string, priceUsd: number, source: string): Response {
  return Response.json({ mint, priceUsd, source }, {
    headers: { "cache-control": "public, max-age=0, s-maxage=60" },
  });
}

/** Pump.fun USD market cap divided by whole-token supply. */
async function pumpUsd(mint: string): Promise<number | null> {
  const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json() as {
    mint?: string;
    usd_market_cap?: number;
    total_supply?: number;
  };
  const cap = Number(data.usd_market_cap);
  const supply = Number(data.total_supply);
  if (data.mint !== mint || !Number.isFinite(cap) || cap <= 0 ||
      !Number.isFinite(supply) || supply <= 0) {
    return null;
  }
  const priceUsd = cap / (supply / 1e6);
  return Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null;
}

/** Deepest DexScreener pair. Used when Pump.fun refuses the request. */
async function dexUsd(mint: string): Promise<number | null> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json() as {
    pairs?: Array<{ priceUsd?: string; liquidity?: { usd?: number } }>;
  };
  const best = [...(data.pairs ?? [])].sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  )[0];
  const priceUsd = Number(best?.priceUsd);
  return Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const mint = new URL(req.url).searchParams.get("mint") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return Response.json({ error: "Invalid mint" }, { status: 400 });
  }
  let pump: number | null = null;
  try {
    pump = await pumpUsd(mint);
  } catch {
    pump = null;
  }
  if (pump != null) return priced(mint, pump, "pump.fun");
  let dex: number | null = null;
  try {
    dex = await dexUsd(mint);
  } catch {
    dex = null;
  }
  if (dex != null) return priced(mint, dex, "dexscreener");
  return Response.json({ error: "Price unavailable" }, {
    status: 502,
    headers: { "cache-control": "no-store" },
  });
}
