export const config = { runtime: "edge" };

import bs58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

const TIMEOUT = 8_000;
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const PUMP_AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const RAYDIUM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
/** Raydium AMM v4 SOL/USDC. Vaults are read from this account, not assumed. */
const SOL_POOL = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const POOL_DISC = [241, 154, 109, 4, 17, 177, 109, 188];
const CURVE_DISC = [23, 183, 248, 55, 96, 216, 172, 96];
const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");

type RpcAccount = { owner: string; executable: boolean; data: [string, string] } | null;

class PriceError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

function alchemyKey(): string {
  return (process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || "").trim();
}

function unavailable(reason: string): Response {
  return Response.json({ error: "Price unavailable", reason }, {
    status: 502,
    headers: { "cache-control": "no-store" },
  });
}

function reasonOf(err: unknown): string {
  const reason = err instanceof PriceError ? err.reason : "upstream";
  return /^(?:missing|no-key|upstream(?:-\d+)?)$/.test(reason) ? reason : "upstream";
}

function priced(mint: string, priceUsd: number, source: "alchemy" | "alchemy-rpc"): Response {
  return Response.json({ mint, priceUsd, source }, {
    headers: { "cache-control": "public, max-age=0, s-maxage=60" },
  });
}

function bytes(value: string): Uint8Array | null {
  try {
    const raw = Uint8Array.from(bs58.decode(value));
    return raw.length === 32 ? raw : null;
  } catch {
    return null;
  }
}

function encodeKey(raw: Uint8Array): string {
  return bs58.encode(raw);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function onCurve(raw: Uint8Array): boolean {
  try {
    ed25519.ExtendedPoint.fromHex(raw);
    return true;
  } catch {
    return false;
  }
}

function findPda(seeds: Uint8Array[], program: Uint8Array): Uint8Array | null {
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(concat([...seeds, Uint8Array.of(bump), program, PDA_MARKER]));
    if (!onCurve(hash)) return hash;
  }
  return null;
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function b64(data: string): Uint8Array {
  const binary = atob(data);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function viewOf(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function u64(data: Uint8Array, offset: number): bigint {
  return viewOf(data).getBigUint64(offset, true);
}

function hasDisc(data: Uint8Array, disc: number[]): boolean {
  return disc.every((byte, index) => data[index] === byte);
}

function keyAt(data: Uint8Array, offset: number): string | null {
  if (offset + 32 > data.length) return null;
  return encodeKey(data.slice(offset, offset + 32));
}

/** Quote units per base unit, times quoteUsd. Raw amounts stay integers until the last step. */
export function spotUsd(
  baseRaw: bigint,
  baseDecimals: number,
  quoteRaw: bigint,
  quoteDecimals: number,
  quoteUsd: number,
): number | null {
  if (baseRaw <= 0n || quoteRaw <= 0n || !Number.isFinite(quoteUsd) || quoteUsd <= 0) return null;
  if (!Number.isInteger(baseDecimals) || !Number.isInteger(quoteDecimals)) return null;
  if (baseDecimals < 0 || baseDecimals > 18 || quoteDecimals < 0 || quoteDecimals > 18) return null;
  let whole = Math.floor(quoteUsd);
  let frac = Math.round((quoteUsd - whole) * 1_000_000_000_000);
  if (frac >= 1_000_000_000_000) {
    whole += 1;
    frac -= 1_000_000_000_000;
  }
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(frac)) return null;
  const quoteScale = BigInt(whole) * 1_000_000_000_000n + BigInt(frac);
  const numerator = quoteRaw * 10n ** BigInt(baseDecimals) * quoteScale;
  const denominator = baseRaw * 10n ** BigInt(quoteDecimals);
  const price = Number(numerator / denominator) / 1e12;
  return Number.isFinite(price) && price > 0 ? price : null;
}

function readI128(data: Uint8Array, offset: number): bigint {
  if (offset + 16 > data.length) return 0n;
  const view = viewOf(data);
  return (view.getBigInt64(offset + 8, true) << 64n) + view.getBigUint64(offset, true);
}

function accountData(account: RpcAccount, owner: string | null): Uint8Array | null {
  if (!account || account.executable || account.data?.[1] !== "base64") return null;
  if (owner && account.owner !== owner) return null;
  return b64(account.data[0]);
}

function mintDecimals(account: RpcAccount): number | null {
  if (!account || (account.owner !== TOKEN && account.owner !== TOKEN_2022)) return null;
  const data = accountData(account, account.owner);
  if (!data || data.length < 46 || data[45] !== 1) return null;
  return data[44] <= 18 ? data[44] : null;
}

function tokenAmount(account: RpcAccount, mint: string, owner: string | null): bigint | null {
  if (!account || (account.owner !== TOKEN && account.owner !== TOKEN_2022)) return null;
  const data = accountData(account, account.owner);
  if (!data || data.length < 72) return null;
  if (keyAt(data, 0) !== mint) return null;
  if (owner && keyAt(data, 32) !== owner) return null;
  return u64(data, 64);
}

async function alchemyRpc(key: string, method: string, params: unknown[]): Promise<unknown> {
  try {
    const res = await fetch(`https://solana-mainnet.g.alchemy.com/v2/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new PriceError(`upstream-${res.status}`);
    const body = await res.json() as { result?: unknown; error?: unknown };
    if (body.error || body.result == null) throw new PriceError("missing");
    return body.result;
  } catch (err) {
    if (err instanceof PriceError) throw err;
    throw new PriceError("upstream");
  }
}

async function multiple(key: string, ids: string[]): Promise<RpcAccount[]> {
  const result = await alchemyRpc(key, "getMultipleAccounts", [ids, { encoding: "base64", commitment: "confirmed" }]);
  const value = (result as { value?: RpcAccount[] }).value;
  if (!Array.isArray(value) || value.length !== ids.length) throw new PriceError("missing");
  return value;
}

async function indexedUsd(key: string, mint: string): Promise<number | null> {
  const res = await fetch(`https://api.g.alchemy.com/prices/v1/${encodeURIComponent(key)}/tokens/by-address`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ addresses: [{ network: "solana-mainnet", address: mint }] }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new PriceError(`upstream-${res.status}`);
  const data = await res.json() as {
    data?: Array<{ address?: string; error?: string | null; prices?: Array<{ currency?: string; value?: string }> }>;
  };
  const row = data.data?.find((item) => item.address === mint) ?? data.data?.[0];
  if (!row || row.error) return null;
  const price = Number(row.prices?.find((item) => item.currency?.toLowerCase() === "usd")?.value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** USD from the canonical PumpSwap pool, or the live bonding curve, using Alchemy RPC reserves. */
async function rpcUsd(key: string, mint: string): Promise<number | null> {
  const base = bytes(mint);
  const pump = bytes(PUMP);
  const amm = bytes(PUMP_AMM);
  const solMint = bytes(SOL);
  if (!base || !pump || !amm || !solMint) return null;
  const creator = findPda([ascii("pool-authority"), base], pump);
  if (!creator) return null;
  const poolBytes = findPda([ascii("pool"), Uint8Array.of(0, 0), creator, base, solMint], amm);
  const curveBytes = findPda([ascii("bonding-curve"), base], pump);
  if (!poolBytes || !curveBytes) return null;
  const poolId = encodeKey(poolBytes);
  const curveId = encodeKey(curveBytes);
  const first = await multiple(key, [poolId, curveId, mint, SOL_POOL]);
  const decimals = mintDecimals(first[2]);
  if (decimals == null) return null;

  const poolRaw = accountData(first[0], PUMP_AMM);
  let pool: { baseVault: string; quoteVault: string; quoteMint: string; virtualQuote: bigint } | null = null;
  if (poolRaw && poolRaw.length >= 203 && hasDisc(poolRaw, POOL_DISC)) {
    const baseMint = keyAt(poolRaw, 43);
    const quoteMint = keyAt(poolRaw, 75);
    const baseVault = keyAt(poolRaw, 139);
    const quoteVault = keyAt(poolRaw, 171);
    if (baseMint === mint && (quoteMint === SOL || quoteMint === USDC) && baseVault && quoteVault) {
      pool = { baseVault, quoteVault, quoteMint, virtualQuote: readI128(poolRaw, 245) };
    }
  }

  const curveRaw = accountData(first[1], PUMP);
  const curve = curveRaw && curveRaw.length >= 49 && hasDisc(curveRaw, CURVE_DISC) && curveRaw[48] <= 1
    ? { virtualToken: u64(curveRaw, 8), virtualSol: u64(curveRaw, 16), complete: curveRaw[48] === 1 }
    : null;
  const usePool = pool != null;
  const useCurve = !usePool && curve != null && !curve.complete;
  if (!usePool && !useCurve) return null;

  const solRaw = accountData(first[3], RAYDIUM);
  if (!solRaw || solRaw.length !== 752) return null;
  const status = u64(solRaw, 0);
  const coinVault = keyAt(solRaw, 336);
  const pcVault = keyAt(solRaw, 368);
  if (status === 0n || status > 7n || !coinVault || !pcVault) return null;
  if (keyAt(solRaw, 400) !== SOL || keyAt(solRaw, 432) !== USDC) return null;

  const ids = [...(pool ? [pool.baseVault, pool.quoteVault] : []), coinVault, pcVault];
  const rows = await multiple(key, ids);
  let cursor = 0;
  const sol = spotUsd(
    tokenAmount(rows[rows.length - 2], SOL, null) ?? 0n,
    9,
    tokenAmount(rows[rows.length - 1], USDC, null) ?? 0n,
    6,
    1,
  );
  if (sol == null) return null;
  if (pool) {
    const baseRaw = tokenAmount(rows[cursor++], mint, poolId);
    const quoteRaw = tokenAmount(rows[cursor++], pool.quoteMint, poolId);
    if (baseRaw == null || quoteRaw == null) return null;
    const effective = quoteRaw + pool.virtualQuote;
    const quoteUsd = pool.quoteMint === USDC ? 1 : sol;
    const quoteDecimals = pool.quoteMint === USDC ? 6 : 9;
    return effective > 0n ? spotUsd(baseRaw, decimals, effective, quoteDecimals, quoteUsd) : null;
  }
  return spotUsd(curve!.virtualToken, decimals, curve!.virtualSol, 9, sol);
}

/** USD spot for one Solana mint. The Alchemy key stays on the server. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const mint = new URL(req.url).searchParams.get("mint") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return Response.json({ error: "Invalid mint" }, { status: 400 });
  }
  const key = alchemyKey();
  if (!key) return unavailable("no-key");
  let fallback = "missing";
  try {
    const indexed = await indexedUsd(key, mint);
    if (indexed != null) return priced(mint, indexed, "alchemy");
  } catch (err) {
    fallback = reasonOf(err);
  }
  try {
    const rpc = await rpcUsd(key, mint);
    if (rpc != null) return priced(mint, rpc, "alchemy-rpc");
  } catch (err) {
    const reason = reasonOf(err);
    return unavailable(reason === "missing" ? fallback : reason);
  }
  return unavailable(fallback);
}
