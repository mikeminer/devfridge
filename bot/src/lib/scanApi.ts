import { SCANNER_URL } from "../config.js";

export type FridgeStatus = {
  status: "fridged" | "expired" | "none" | "unavailable";
  message?: string;
  locks: Array<{
    address: string;
    depositor: string;
    mint: string;
    amount: string;
    unlockAt: number;
  }>;
  activeAmount: string;
  unlockAt: number | null;
  depositor: string | null;
};

export type TrustReport = {
  mint: string;
  identity: {
    name: string;
    symbol: string;
    image: string | null;
    platform: string;
    ageSeconds: number | null;
    decimals: number;
  };
  market: {
    priceUsd: number | null;
    marketCap: number | null;
    volume24h: number | null;
    holders: number | null;
    supply: string | null;
  };
  security: Array<{ id: string; label: string; level: string; detail: string; amount?: string }>;
  fridge: FridgeStatus;
};

export async function apiScan(mint: string): Promise<TrustReport> {
  const res = await fetch(`${SCANNER_URL}/api/scan?mint=${mint}`, {
    signal: AbortSignal.timeout(25000),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `scan ${res.status}`);
  return json as TrustReport;
}

export async function apiFridge(mint: string): Promise<FridgeStatus> {
  const res = await fetch(`${SCANNER_URL}/api/fridge?mint=${mint}`, {
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `fridge ${res.status}`);
  return json as FridgeStatus;
}

export async function apiPasta(): Promise<{ price: number | null; burned: string | null }> {
  const res = await fetch(`${SCANNER_URL}/api/pasta`, { signal: AbortSignal.timeout(12000) });
  return (await res.json()) as { price: number | null; burned: string | null };
}

export async function apiRecent(): Promise<
  Array<{ mint: string; name?: string; symbol?: string; fridged?: boolean; scannedAt?: number }>
> {
  const res = await fetch(`${SCANNER_URL}/api/feed/recent`, { signal: AbortSignal.timeout(10000) });
  const json = (await res.json()) as { tokens?: Array<Record<string, unknown>> };
  return (json.tokens || []) as Array<{
    mint: string;
    name?: string;
    symbol?: string;
    fridged?: boolean;
    scannedAt?: number;
  }>;
}

export async function apiBoosted(): Promise<
  Array<{
    mint: string;
    name?: string;
    symbol?: string;
    fridged?: boolean;
    tier?: string;
    expiresAt?: number;
  }>
> {
  const res = await fetch(`${SCANNER_URL}/api/feed/boosted`, { signal: AbortSignal.timeout(10000) });
  const json = (await res.json()) as { tokens?: Array<Record<string, unknown>> };
  return (json.tokens || []) as Array<{
    mint: string;
    name?: string;
    symbol?: string;
    fridged?: boolean;
    tier?: string;
    expiresAt?: number;
  }>;
}

export async function dex(mint: string) {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    pairs?: Array<{
      priceUsd?: string;
      marketCap?: number;
      fdv?: number;
      volume?: { h24?: number };
      liquidity?: { usd?: number };
    }>;
  };
  const pairs = json.pairs ?? [];
  if (!pairs.length) return null;
  const best = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return {
    price: Number(best.priceUsd) || null,
    mcap: best.marketCap || best.fdv || null,
    vol: pairs.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0),
  };
}
