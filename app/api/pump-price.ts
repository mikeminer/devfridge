export const config = { runtime: "edge" };

/** Pump.fun USD market cap divided by its whole-token supply gives the spot price. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const mint = new URL(req.url).searchParams.get("mint") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return Response.json({ error: "Invalid mint" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error("Pump.fun unavailable");
    const data = await res.json() as {
      mint?: string;
      usd_market_cap?: number;
      total_supply?: number;
    };
    const cap = Number(data.usd_market_cap);
    const supply = Number(data.total_supply);
    if (data.mint !== mint || !Number.isFinite(cap) || cap <= 0 ||
        !Number.isFinite(supply) || supply <= 0) {
      throw new Error("Pump.fun price unavailable");
    }
    const priceUsd = cap / (supply / 1e6);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error("Invalid price");
    return Response.json({ mint, priceUsd, source: "pump.fun" }, {
      headers: { "cache-control": "public, max-age=0, s-maxage=60" },
    });
  } catch {
    return Response.json({ error: "Pump.fun price unavailable" }, {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }
}
