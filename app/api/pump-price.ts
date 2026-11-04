export const config = { runtime: "edge" };

const TIMEOUT = 8_000;

function alchemyKey(): string {
  return (process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || "").trim();
}

function unavailable(): Response {
  return Response.json({ error: "Price unavailable" }, {
    status: 502,
    headers: { "cache-control": "no-store" },
  });
}

/** USD spot from Alchemy for this Solana mint. The key stays on the server. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const mint = new URL(req.url).searchParams.get("mint") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return Response.json({ error: "Invalid mint" }, { status: 400 });
  }
  const key = alchemyKey();
  if (!key) return unavailable();
  try {
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${encodeURIComponent(key)}/tokens/by-address`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          addresses: [{ network: "solana-mainnet", address: mint }],
        }),
        signal: AbortSignal.timeout(TIMEOUT),
      },
    );
    if (!res.ok) return unavailable();
    const data = await res.json() as {
      data?: Array<{
        address?: string;
        error?: string | null;
        prices?: Array<{ currency?: string; value?: string }>;
      }>;
    };
    const row = data.data?.find((item) => item.address === mint) ?? data.data?.[0];
    const usd = row?.prices?.find((price) => price.currency?.toLowerCase() === "usd");
    const priceUsd = Number(usd?.value);
    if (!row || row.error || !Number.isFinite(priceUsd) || priceUsd <= 0) return unavailable();
    return Response.json({ mint, priceUsd, source: "alchemy" }, {
      headers: { "cache-control": "public, max-age=0, s-maxage=60" },
    });
  } catch {
    return unavailable();
  }
}
