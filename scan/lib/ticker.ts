function noStore(ms = 3000): RequestInit {
  return { cache: "no-store", signal: AbortSignal.timeout(ms) };
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
}

async function fromPump(mint: string): Promise<string | null> {
  const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, noStore());
  if (!res.ok) return null;
  const json = (await res.json()) as { symbol?: string };
  return cleanSymbol(json.symbol);
}

async function fromJupiter(mint: string): Promise<string | null> {
  const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`, noStore(2500));
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ id?: string; symbol?: string }>;
  const row = rows.find((r) => r.id === mint) ?? rows[0];
  return cleanSymbol(row?.symbol);
}

export async function tokenTicker(mint: string): Promise<string> {
  const symbol = await new Promise<string | null>((resolve) => {
    let left = 3;
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      if (value) {
        settled = true;
        resolve(value);
        return;
      }
      left -= 1;
      if (left <= 0) {
        settled = true;
        resolve(null);
      }
    };
    fromPump(mint).then(finish).catch(() => finish(null));
    fromDex(mint).then(finish).catch(() => finish(null));
    fromJupiter(mint).then(finish).catch(() => finish(null));
  });
  return symbol ? `$${symbol}` : "";
}
