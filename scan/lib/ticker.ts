function noStore(): RequestInit {
  return { cache: "no-store", signal: AbortSignal.timeout(8000) };
}

function cleanSymbol(value?: string | null): string | null {
  const raw = String(value || "")
    .replace(/^\$+/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!raw || raw === "???" || raw.toLowerCase() === "unknown") return null;
  return raw.slice(0, 12);
}

async function fromDex(mint: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, noStore());
    if (!res.ok) return null;
    const json = (await res.json()) as {
      pairs?: Array<{ baseToken?: { address?: string; symbol?: string }; liquidity?: { usd?: number } }>;
    };
    const pairs = json.pairs ?? [];
    const match =
      pairs.find((p) => p.baseToken?.address === mint) ||
      [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    return cleanSymbol(match?.baseToken?.symbol);
  } catch {
    return null;
  }
}

async function fromPump(mint: string): Promise<string | null> {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, noStore());
    if (!res.ok) return null;
    const json = (await res.json()) as { symbol?: string };
    return cleanSymbol(json.symbol);
  } catch {
    return null;
  }
}

async function fromJupiter(mint: string): Promise<string | null> {
  try {
    const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`, noStore());
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ id?: string; symbol?: string }>;
    const row = rows.find((r) => r.id === mint) ?? rows[0];
    return cleanSymbol(row?.symbol);
  } catch {
    return null;
  }
}

export async function tokenTicker(mint: string): Promise<string> {
  const [dex, pump, jup] = await Promise.all([fromDex(mint), fromPump(mint), fromJupiter(mint)]);
  const symbol = pump || dex || jup;
  return symbol ? `$${symbol}` : "";
}
