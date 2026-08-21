import { Connection } from "@solana/web3.js";

function heliusUrl(): string | null {
  const key =
    process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY || "";
  if (!key) return null;
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

function alchemyUrl(): string | null {
  const key = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || "";
  if (!key) return null;
  return `https://solana-mainnet.g.alchemy.com/v2/${key}`;
}

function rpcLabel(url: string): string {
  if (url.includes("helius")) return "helius";
  if (url.includes("alchemy")) return "alchemy";
  try {
    return new URL(url).host;
  } catch {
    return "rpc";
  }
}

export function rpcUrls(): string[] {
  const urls = [
    heliusUrl(),
    alchemyUrl(),
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet.solana.com",
    "https://api.mainnet-beta.solana.com",
  ].filter((u): u is string => Boolean(u));
  return Array.from(new Set(urls));
}

export function connection(): Connection {
  return new Connection(rpcUrls()[0], "confirmed");
}

export async function rpc<T = unknown>(
  method: string,
  params: unknown[]
): Promise<T> {
  const errors: string[] = [];
  for (const url of rpcUrls()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (!res.ok || json.error) {
        errors.push(`${rpcLabel(url)}: ${json.error?.message || res.status}`);
        continue;
      }
      return json.result as T;
    } catch (err) {
      errors.push(`${rpcLabel(url)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors[0] || "RPC failed");
}
