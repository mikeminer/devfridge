import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getMint, getTokenMetadata } from "@solana/spl-token";
import type { LockAccount } from "./fridge";

export type TokenVisual = {
  name: string;
  symbol: string;
  decimals: number;
  image: string | null;
};

export type DecoratedLock = LockAccount & TokenVisual & {
  ready: boolean;
  preview?: boolean;
};

const cache = new Map<string, TokenVisual>();

const IPFS_GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

export function ipfsCid(uri: string): string | null {
  const match = uri.match(/(?:ipfs:\/\/|\/ipfs\/)([a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

export function rewriteUri(uri: string): string {
  const cid = ipfsCid(uri);
  if (cid) return `${IPFS_GATEWAYS[0]}${cid}`;
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice("ar://".length)}`;
  return uri;
}

export function imageCandidates(uri: string | null | undefined): string[] {
  if (!uri) return [];
  if (uri.startsWith("/") || uri.startsWith("data:")) return [uri];
  const cid = ipfsCid(uri);
  if (cid) return [...new Set(IPFS_GATEWAYS.map((g) => `${g}${cid}`))];
  return [rewriteUri(uri)];
}

export function fallbackGlyph(symbol: string): string {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, "");
  return (clean.slice(0, 2) || "TK").toUpperCase();
}

export function frostHue(mint: string): string {
  let hash = 0;
  for (let i = 0; i < mint.length; i++) hash = (hash * 33 + mint.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 42% 62%)`;
}

async function imageFromUri(uri: string): Promise<string | null> {
  const rewritten = rewriteUri(uri);
  for (const candidate of imageCandidates(uri)) {
    try {
      const res = await fetch(candidate, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (type.startsWith("image/")) return candidate;
      if (type.includes("json") || type.includes("text")) {
        const json = (await res.json()) as { image?: string; image_url?: string };
        const image = json.image || json.image_url;
        if (image) return rewriteUri(image);
      }
    } catch {
      // try next gateway
    }
  }
  return rewritten;
}

async function imageFromJupiter(mint: string): Promise<Partial<TokenVisual>> {
  try {
    const res = await fetch(
      `https://lite-api.jup.ag/tokens/v2/search?query=${mint}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{
      id?: string;
      name?: string;
      symbol?: string;
      icon?: string;
      decimals?: number;
    }>;
    const hit = rows.find((r) => r.id === mint) ?? rows[0];
    if (!hit) return {};
    return {
      name: hit.name,
      symbol: hit.symbol,
      decimals: hit.decimals,
      image: hit.icon ? rewriteUri(hit.icon) : null,
    };
  } catch {
    return {};
  }
}

async function imageFromDex(mint: string): Promise<Partial<TokenVisual>> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const json = (await res.json()) as {
      pairs?: Array<{
        baseToken?: { address?: string; name?: string; symbol?: string };
        info?: { imageUrl?: string };
      }>;
    };
    const pair =
      json.pairs?.find((p) => p.baseToken?.address === mint) ?? json.pairs?.[0];
    if (!pair) return {};
    return {
      name: pair.baseToken?.name,
      symbol: pair.baseToken?.symbol,
      image: pair.info?.imageUrl ? rewriteUri(pair.info.imageUrl) : null,
    };
  } catch {
    return {};
  }
}

export async function fetchTokenVisual(
  connection: Connection,
  mint: PublicKey
): Promise<TokenVisual> {
  const key = mint.toBase58();
  const hit = cache.get(key);
  if (hit) return hit;

  const visual: TokenVisual = {
    name: "Token-2022",
    symbol: "TKN",
    decimals: 6,
    image: null,
  };

  const [jup, dex] = await Promise.all([imageFromJupiter(key), imageFromDex(key)]);
  if (jup.name) visual.name = jup.name;
  if (jup.symbol) visual.symbol = jup.symbol;
  if (jup.decimals != null) visual.decimals = jup.decimals;
  if (jup.image) visual.image = jup.image;
  if (dex.name && visual.name === "Token-2022") visual.name = dex.name;
  if (dex.symbol && visual.symbol === "TKN") visual.symbol = dex.symbol;
  if (dex.image && !visual.image) visual.image = dex.image;

  try {
    const mintData = await Promise.race([
      getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("mint-timeout")), 4000)
      ),
    ]);
    visual.decimals = mintData.decimals;
  } catch {
    // keep Jupiter / default decimals
  }

  if (!visual.image || visual.symbol === "TKN") {
    try {
      const meta = await Promise.race([
        getTokenMetadata(connection, mint),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);
      if (meta?.name && visual.name === "Token-2022") visual.name = meta.name.trim();
      if (meta?.symbol && visual.symbol === "TKN") visual.symbol = meta.symbol.trim();
      if (meta?.uri && !visual.image) visual.image = await imageFromUri(meta.uri);
    } catch {
      // optional on-chain metadata
    }
  }

  cache.set(key, visual);
  return visual;
}

export async function decorateLocks(
  connection: Connection,
  locks: LockAccount[],
  now = Date.now() / 1000
): Promise<DecoratedLock[]> {
  const unique = [...new Map(locks.map((l) => [l.mint.toBase58(), l.mint])).values()];
  const visuals = await Promise.all(
    unique.map((mint) =>
      fetchTokenVisual(connection, mint).catch(() => ({
        name: "Token-2022",
        symbol: "TKN",
        decimals: 6,
        image: null,
      }))
    )
  );
  const byMint = new Map(unique.map((mint, i) => [mint.toBase58(), visuals[i]]));
  return locks.map((lock) => {
    const visual = byMint.get(lock.mint.toBase58()) ?? {
      name: "Token-2022",
      symbol: "TKN",
      decimals: 6,
      image: null,
    };
    return {
      ...lock,
      name: visual.name,
      symbol: visual.symbol,
      decimals: visual.decimals,
      image: visual.image,
      ready: now >= lock.unlockAt,
    };
  });
}

export function remainingLabel(unlockAt: number, now: number): string {
  const delta = Math.floor(unlockAt - now);
  if (delta <= 0) return "Ready";
  const days = Math.floor(delta / 86400);
  const hours = Math.floor((delta % 86400) / 3600);
  const mins = Math.floor((delta % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  const secs = delta % 60;
  return `${mins}m ${secs}s`;
}
