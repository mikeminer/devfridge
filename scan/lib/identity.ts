import { publicLogoUrl } from "./logo";

export type TokenIdentity = {
  name: string;
  symbol: string;
  image: string | null;
};

const mem = new Map<string, { at: number; value: TokenIdentity }>();
const TTL_MS = 10 * 60 * 1000;

function noStore(ms = 4000): RequestInit {
  return { cache: "no-store", signal: AbortSignal.timeout(ms) };
}

function cleanName(value?: string | null): string | null {
  const raw = String(value || "").replace(/\0/g, "").trim();
  if (!raw || raw === "???" || raw.toLowerCase() === "unknown" || raw.toLowerCase() === "unknown token") {
    return null;
  }
  return raw.slice(0, 48);
}

function cleanSymbol(value?: string | null): string | null {
  const raw = String(value || "")
    .replace(/^\$+/g, "")
    .replace(/\s+/g, "")
    .replace(/\0/g, "")
    .trim();
  if (!raw || raw === "???" || raw === "TKN" || raw.toLowerCase() === "unknown") return null;
  return raw.slice(0, 12);
}

async function fromPump(mint: string): Promise<Partial<TokenIdentity>> {
  const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, noStore());
  if (!res.ok) return {};
  const json = (await res.json()) as { name?: string; symbol?: string; image_uri?: string };
  return {
    name: cleanName(json.name) || undefined,
    symbol: cleanSymbol(json.symbol) || undefined,
    image: publicLogoUrl(json.image_uri),
  };
}

async function fromDex(mint: string): Promise<Partial<TokenIdentity>> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, noStore());
  if (!res.ok) return {};
  const json = (await res.json()) as {
    pairs?: Array<{
      baseToken?: { address?: string; name?: string; symbol?: string };
      info?: { imageUrl?: string };
      liquidity?: { usd?: number };
    }>;
  };
  const pairs = json.pairs ?? [];
  const match =
    pairs.find((p) => p.baseToken?.address === mint) ||
    [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return {
    name: cleanName(match?.baseToken?.name) || undefined,
    symbol: cleanSymbol(match?.baseToken?.symbol) || undefined,
    image: publicLogoUrl(match?.info?.imageUrl),
  };
}

async function fromJupiter(mint: string): Promise<Partial<TokenIdentity>> {
  const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`, noStore(2500));
  if (!res.ok) return {};
  const rows = (await res.json()) as Array<{
    id?: string;
    name?: string;
    symbol?: string;
    icon?: string;
  }>;
  const row = rows.find((r) => r.id === mint) ?? rows[0];
  return {
    name: cleanName(row?.name) || undefined,
    symbol: cleanSymbol(row?.symbol) || undefined,
    image: publicLogoUrl(row?.icon),
  };
}

export function isPlaceholderIdentity(row: {
  mint: string;
  name?: string;
  symbol?: string;
  image?: string | null;
}): boolean {
  const prefix = row.mint.slice(0, 4);
  const name = (row.name || "").trim();
  const symbol = (row.symbol || "").trim();
  return (
    !symbol ||
    symbol === "TKN" ||
    symbol === "???" ||
    !name ||
    name === prefix ||
    name === "Unknown token" ||
    !row.image
  );
}

export async function tokenIdentity(mint: string): Promise<TokenIdentity> {
  const hit = mem.get(mint);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const settled = await Promise.allSettled([fromPump(mint), fromDex(mint), fromJupiter(mint)]);
  const parts = settled
    .filter((r): r is PromiseFulfilledResult<Partial<TokenIdentity>> => r.status === "fulfilled")
    .map((r) => r.value);

  const name = parts.map((p) => p.name).find(Boolean) || mint.slice(0, 4);
  const symbol = parts.map((p) => p.symbol).find(Boolean) || "TKN";
  const image = parts.map((p) => p.image).find(Boolean) || null;
  const value = { name, symbol, image };
  mem.set(mint, { at: Date.now(), value });
  return value;
}

export async function fillIdentity<T extends { mint: string; name: string; symbol: string; image: string | null }>(
  row: T
): Promise<T> {
  if (!isPlaceholderIdentity(row)) return row;
  const id = await tokenIdentity(row.mint);
  const prefix = row.mint.slice(0, 4);
  const nameBad = !row.name || row.name === prefix || row.name === "Unknown token";
  const symbolBad = !row.symbol || row.symbol === "TKN" || row.symbol === "???";
  return {
    ...row,
    name: nameBad ? id.name : row.name,
    symbol: symbolBad ? id.symbol : row.symbol,
    image: row.image || id.image,
  };
}
