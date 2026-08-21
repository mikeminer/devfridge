import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getExtensionTypes,
  ExtensionType,
  unpackMint,
} from "@solana/spl-token";
import { PUMPFUN_PROGRAM, TOKEN_METADATA_PROGRAM } from "./constants";
import { parseMint } from "./format";
import { publicLogoUrl } from "./logo";
import { usdPrice } from "./price";
import { connection, rpc } from "./rpc";
import { fridgeForMint, type FridgeLock, type FridgeStatus } from "./fridge";

export type CheckLevel = "safe" | "caution" | "danger" | "unknown";

export type SecurityCheck = {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
  amount?: string;
};

export type TrustGrade = "A" | "B" | "C" | "D" | "E";

export function gradeFromLevel(level: CheckLevel): TrustGrade {
  if (level === "safe") return "A";
  if (level === "caution") return "C";
  if (level === "danger") return "E";
  return "C";
}

export function trustGrade(checks: SecurityCheck[]): TrustGrade {
  const pts = checks.reduce((sum, c) => {
    if (c.level === "danger") return sum + 4;
    if (c.level === "caution") return sum + 2;
    if (c.level === "unknown") return sum + 1;
    return sum;
  }, 0);
  if (pts === 0) return "A";
  if (pts <= 2) return "B";
  if (pts <= 4) return "C";
  if (pts <= 7) return "D";
  return "E";
}

export type TrustReport = {
  mint: string;
  identity: {
    name: string;
    symbol: string;
    image: string | null;
    description: string;
    platform: "pump.fun" | "stonkfun" | "custom";
    ageSeconds: number | null;
    tokenProgram: "token-2022" | "token" | "unknown";
    decimals: number;
  };
  market: {
    priceUsd: number | null;
    marketCap: number | null;
    volume24h: number | null;
    supply: string | null;
    circulating: string | null;
    holders: number | null;
    note?: string;
  };
  security: SecurityCheck[];
  fridge: FridgeStatus;
  links: { jupiter: string; birdeye: string; dexscreener: string; fridge: string; solscan: string };
  warnings: string[];
};

function shortErr(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function jupiterToken(mint: string) {
  try {
    const res = await fetch(
      `https://lite-api.jup.ag/tokens/v2/search?query=${mint}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      id?: string;
      name?: string;
      symbol?: string;
      icon?: string;
      decimals?: number;
    }>;
    return rows.find((r) => r.id === mint) ?? rows[0] ?? null;
  } catch {
    return null;
  }
}

async function jupiterPrice(mint: string): Promise<number | null> {
  return usdPrice(mint);
}

async function dex(mint: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      pairs?: Array<{
        dexId?: string;
        priceUsd?: string;
        volume?: { h24?: number };
        marketCap?: number;
        fdv?: number;
        liquidity?: { usd?: number };
        info?: { imageUrl?: string };
        baseToken?: { name?: string; symbol?: string };
      }>;
    };
    const pairs = json.pairs ?? [];
    if (pairs.length === 0) return null;
    const best = [...pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];
    return { pairs, best };
  } catch {
    return null;
  }
}

async function pumpCoin(mint: string) {
  try {
    const res = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      name?: string;
      symbol?: string;
      description?: string;
      image_uri?: string;
      creator?: string;
      complete?: boolean;
      created_timestamp?: number;
    };
  } catch {
    return null;
  }
}

async function stonkCoin(mint: string) {
  try {
    const res = await fetch(
      `https://www.stonkfun.xyz/api/public/v1/tokens?search=${mint}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { tokens?: Array<{ mint?: string }> } | Array<{ mint?: string }>;
    const rows = Array.isArray(json) ? json : json.tokens ?? [];
    return rows.some((t) => t.mint === mint);
  } catch {
    return false;
  }
}

async function firstTxPrograms(mint: string): Promise<string[]> {
  try {
    const sigs = await rpc<Array<{ signature: string }>>("getSignaturesForAddress", [
      mint,
      { limit: 8 },
    ]);
    if (!sigs?.length) return [];
    const last = sigs[sigs.length - 1];
    const tx = await rpc<{
      transaction?: {
        message?: { accountKeys?: Array<string | { pubkey?: string }> };
      };
    }>("getTransaction", [
      last.signature,
      { maxSupportedTransactionVersion: 0, encoding: "json" },
    ]);
    const keys = tx?.transaction?.message?.accountKeys ?? [];
    return keys.map((k) => (typeof k === "string" ? k : k.pubkey || "")).filter(Boolean);
  } catch {
    return [];
  }
}

async function metaplexMeta(mint: string) {
  try {
    const mintKey = new PublicKey(mint);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(TOKEN_METADATA_PROGRAM).toBuffer(),
        mintKey.toBuffer(),
      ],
      new PublicKey(TOKEN_METADATA_PROGRAM)
    );
    const acc = await rpc<{ value?: { data?: [string, string] } }>("getAccountInfo", [
      pda.toBase58(),
      { encoding: "base64" },
    ]);
    if (!acc?.value?.data?.[0]) return null;
    const buf = Buffer.from(acc.value.data[0], "base64");
    const isMutable = buf[1] === 1;
    let o = 1 + 32 + 32;
    const name = readBorshString(buf, o);
    o += 4 + 32;
    const symbol = readBorshString(buf, o);
    o += 4 + 10;
    const uri = readBorshString(buf, o);
    return { name: name.trim(), symbol: symbol.trim(), uri: uri.trim(), isMutable };
  } catch {
    return null;
  }
}

function readBorshString(buf: Buffer, offset: number): string {
  if (offset + 4 > buf.length) return "";
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const end = Math.min(start + len, buf.length);
  return buf.slice(start, end).toString("utf8").replace(/\0/g, "");
}

async function metadataJson(uri: string) {
  if (!uri.startsWith("http")) return null;
  try {
    const res = await fetch(uri, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return (await res.json()) as { image?: string; description?: string; name?: string };
  } catch {
    return null;
  }
}

const EXT_NAMES: Partial<Record<number, string>> = {
  [ExtensionType.TransferFeeConfig]: "Transfer fee",
  [ExtensionType.TransferFeeAmount]: "Transfer fee amount",
  [ExtensionType.MintCloseAuthority]: "Mint close authority",
  [ExtensionType.ConfidentialTransferMint]: "Confidential transfer",
  [ExtensionType.DefaultAccountState]: "Default account state",
  [ExtensionType.ImmutableOwner]: "Immutable owner",
  [ExtensionType.MemoTransfer]: "Memo transfer",
  [ExtensionType.NonTransferable]: "Non-transferable",
  [ExtensionType.InterestBearingConfig]: "Interest bearing",
  [ExtensionType.CpiGuard]: "CPI guard",
  [ExtensionType.PermanentDelegate]: "Permanent delegate",
  [ExtensionType.TransferHook]: "Transfer hook",
  [ExtensionType.MetadataPointer]: "Metadata pointer",
  [ExtensionType.TokenMetadata]: "Token metadata",
  [ExtensionType.GroupPointer]: "Group pointer",
  [ExtensionType.TokenGroup]: "Token group",
  [ExtensionType.GroupMemberPointer]: "Group member pointer",
  [ExtensionType.ScaledUiAmountConfig]: "Scaled UI amount",
  [ExtensionType.PausableConfig]: "Pausable",
  [ExtensionType.PermissionedBurn]: "Permissioned burn",
};

const RISKY_EXT = /fee|hook|non-transfer|delegate|pausable|permissioned|default account/i;

function listExtensions(types: number[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of types) {
    if (t === ExtensionType.Uninitialized) continue;
    if (!Number.isInteger(t) || t < 1 || t > 40) continue;
    const name = EXT_NAMES[t] || `Type ${t}`;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

async function holderCountHelius(mint: string): Promise<number | null> {
  const key = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params: { mint, limit: 1, options: { showZeroBalance: false } },
      }),
      signal: AbortSignal.timeout(12000),
    });
    const json = (await res.json()) as { result?: { total?: number } };
    return json.result?.total ?? null;
  } catch {
    return null;
  }
}

function fridgeVaultAddresses(
  mint: string,
  locks: FridgeLock[],
  tokenProgram: TrustReport["identity"]["tokenProgram"]
): Set<string> {
  const mintKey = new PublicKey(mint);
  const programs =
    tokenProgram === "token"
      ? [TOKEN_PROGRAM_ID]
      : tokenProgram === "token-2022"
        ? [TOKEN_2022_PROGRAM_ID]
        : [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID];
  const vaults = new Set<string>();
  for (const lock of locks) {
    const owner = new PublicKey(lock.address);
    for (const program of programs) {
      vaults.add(
        getAssociatedTokenAddressSync(mintKey, owner, true, program).toBase58()
      );
    }
  }
  return vaults;
}

async function top10Concentration(
  mint: string,
  supply: bigint,
  locks: FridgeLock[],
  tokenProgram: TrustReport["identity"]["tokenProgram"]
): Promise<number | null> {
  if (supply <= 0n) return null;
  try {
    const result = await rpc<{
      value?: Array<{ address?: string; amount?: string }>;
    }>("getTokenLargestAccounts", [mint]);
    const vaults = fridgeVaultAddresses(mint, locks, tokenProgram);
    const amounts = (result?.value ?? [])
      .filter((a) => a.address && !vaults.has(a.address))
      .map((a) => BigInt(a.amount || "0"))
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .slice(0, 10);
    if (amounts.length === 0) return null;
    const top = amounts.reduce((s, n) => s + n, 0n);
    return Number((top * 10000n) / supply) / 100;
  } catch {
    return null;
  }
}

export async function scanMint(mintStr: string): Promise<TrustReport> {
  const warnings: string[] = [];
  const parsed = parseMint(mintStr);
  if (!parsed) {
    throw new Error("Invalid Solana address — paste the mint or a pump.fun / Dexscreener link");
  }
  const mint = new PublicKey(parsed);
  const mintKey = mint.toBase58();

  const conn = connection();
  const [fridge, jupTok, price, dexData, pump, isStonk, programs, mpl] =
    await Promise.all([
      fridgeForMint(mintKey),
      jupiterToken(mintKey),
      jupiterPrice(mintKey),
      dex(mintKey),
      pumpCoin(mintKey),
      stonkCoin(mintKey),
      firstTxPrograms(mintKey),
      metaplexMeta(mintKey),
    ]);

  let tokenProgram: TrustReport["identity"]["tokenProgram"] = "unknown";
  let decimals = jupTok?.decimals ?? 6;
  let mintAuthority: string | null | undefined;
  let freezeAuthority: string | null | undefined;
  let extensions: string[] = [];
  let supply = 0n;

  try {
    const acc = await conn.getAccountInfo(mint);
    if (!acc) warnings.push("Mint account not found on RPC");
    else if (acc.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      tokenProgram = "token-2022";
      const unpacked = unpackMint(mint, acc, TOKEN_2022_PROGRAM_ID);
      decimals = unpacked.decimals;
      mintAuthority = unpacked.mintAuthority?.toBase58() ?? null;
      freezeAuthority = unpacked.freezeAuthority?.toBase58() ?? null;
      supply = unpacked.supply;
      try {
        const types = getExtensionTypes(acc.data);
        extensions = listExtensions(types as unknown as number[]);
      } catch {
        /* */
      }
    } else if (acc.owner.equals(TOKEN_PROGRAM_ID)) {
      tokenProgram = "token";
      const m = await getMint(conn, mint, "confirmed", TOKEN_PROGRAM_ID);
      decimals = m.decimals;
      mintAuthority = m.mintAuthority?.toBase58() ?? null;
      freezeAuthority = m.freezeAuthority?.toBase58() ?? null;
      supply = m.supply;
    }
  } catch (err) {
    warnings.push(`Mint read failed: ${shortErr(err)}`);
  }

  const json = mpl?.uri ? await metadataJson(mpl.uri) : null;
  const [holderCount, top10Pct] = await Promise.all([
    holderCountHelius(mintKey),
    top10Concentration(mintKey, supply, fridge.locks, tokenProgram),
  ]);

  const name =
    jupTok?.name ||
    pump?.name ||
    dexData?.best?.baseToken?.name ||
    mpl?.name ||
    json?.name ||
    "Unknown token";
  const symbol =
    jupTok?.symbol ||
    pump?.symbol ||
    dexData?.best?.baseToken?.symbol ||
    mpl?.symbol ||
    "???";
  const image = publicLogoUrl(
    jupTok?.icon ||
      pump?.image_uri ||
      dexData?.best?.info?.imageUrl ||
      json?.image ||
      null
  );
  const description = (pump?.description || json?.description || "").slice(0, 600);

  let platform: TrustReport["identity"]["platform"] = "custom";
  if (pump || programs.includes(PUMPFUN_PROGRAM) || mintKey.endsWith("pump")) {
    platform = "pump.fun";
  } else if (isStonk) platform = "stonkfun";

  const uiSupply = Number(supply) / 10 ** decimals;
  const priceUsd = price ?? (dexData?.best?.priceUsd ? Number(dexData.best.priceUsd) : null);
  const marketCap =
    dexData?.best?.marketCap ||
    dexData?.best?.fdv ||
    (priceUsd != null && Number.isFinite(uiSupply) ? priceUsd * uiSupply : null);
  const volume24h =
    dexData?.pairs?.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0) || null;

  const security: SecurityCheck[] = [];

  if (mintAuthority === null) {
    security.push({
      id: "mint",
      label: "Mint authority revoked",
      level: "safe",
      detail: "No one can mint more supply.",
      amount: "Revoked",
    });
  } else if (mintAuthority) {
    security.push({
      id: "mint",
      label: "Mint authority revoked",
      level: "danger",
      detail: `Mint authority still set (${mintAuthority.slice(0, 4)}…${mintAuthority.slice(-4)}).`,
      amount: "Active",
    });
  } else {
    security.push({
      id: "mint",
      label: "Mint authority revoked",
      level: "unknown",
      detail: "Could not read mint authority.",
      amount: "Unknown",
    });
  }

  if (freezeAuthority === null) {
    security.push({
      id: "freeze",
      label: "Freeze authority revoked",
      level: "safe",
      detail: "Accounts cannot be frozen.",
      amount: "Revoked",
    });
  } else if (freezeAuthority) {
    security.push({
      id: "freeze",
      label: "Freeze authority revoked",
      level: "danger",
      detail: `Freeze authority still set (${freezeAuthority.slice(0, 4)}…${freezeAuthority.slice(-4)}).`,
      amount: "Active",
    });
  } else {
    security.push({
      id: "freeze",
      label: "Freeze authority revoked",
      level: "unknown",
      detail: "Could not read freeze authority.",
      amount: "Unknown",
    });
  }

  if (top10Pct != null) {
    security.push({
      id: "top10",
      label: "Top 10 holders %",
      level: top10Pct > 70 ? "danger" : top10Pct > 40 ? "caution" : "safe",
      detail: `Top 10 accounts hold ${top10Pct.toFixed(1)}% of supply (Fridge vaults excluded).`,
      amount: `${top10Pct.toFixed(1)}%`,
    });
  } else {
    security.push({
      id: "top10",
      label: "Top 10 holders %",
      level: "unknown",
      detail: "Could not read largest token accounts from RPC.",
      amount: "n/a",
    });
  }

  const onCurve = (dexData?.pairs ?? []).every(
    (p) => (p.dexId || "").toLowerCase() === "pumpfun"
  );
  const hasDex = (dexData?.pairs?.length ?? 0) > 0;
  if (pump && !pump.complete) {
    security.push({
      id: "lp",
      label: "LP locked",
      level: "caution",
      detail: "Still on the pump.fun bonding curve (not graduated).",
      amount: "Curve",
    });
  } else if (hasDex && !onCurve) {
    security.push({
      id: "lp",
      label: "LP locked",
      level: "caution",
      detail: "Pool exists on a DEX. Manual LP lock/burn not fully verified.",
      amount: "Unverified",
    });
  } else if (!hasDex) {
    security.push({
      id: "lp",
      label: "LP locked",
      level: "danger",
      detail: "No DEX liquidity found.",
      amount: "None",
    });
  } else {
    security.push({
      id: "lp",
      label: "LP locked",
      level: "caution",
      detail: "Only pump.fun curve liquidity detected.",
      amount: "Curve",
    });
  }

  security.push({
    id: "dev",
    label: "Fridge lock",
    level: fridge.status === "fridged" ? "safe" : "caution",
    detail:
      fridge.status === "fridged"
        ? "Live Fridge lock — on-chain commitment instead of wallet hopping."
        : "No live Fridge lock. Vault expiry is not the same as a claimed vault.",
    amount: fridge.status === "fridged" ? "Fridged" : fridge.status === "expired" ? "Expired" : "None",
  });

  if (mpl) {
    security.push({
      id: "mutable",
      label: "Metadata mutable",
      level: mpl.isMutable ? "caution" : "safe",
      detail: mpl.isMutable
        ? "Metaplex metadata can still be changed."
        : "Metaplex metadata is immutable.",
      amount: mpl.isMutable ? "Mutable" : "Immutable",
    });
  } else {
    security.push({
      id: "mutable",
      label: "Metadata mutable",
      level: tokenProgram === "token-2022" ? "caution" : "unknown",
      detail:
        tokenProgram === "token-2022"
          ? "Token-2022 metadata pointer — treat as mutable unless frozen on-chain."
          : "No Metaplex metadata account.",
      amount: tokenProgram === "token-2022" ? "Pointer" : "None",
    });
  }

  if (tokenProgram === "token-2022") {
    security.push({
      id: "t22",
      label: "Token-2022 extensions",
      level: extensions.some((e) => RISKY_EXT.test(e)) ? "caution" : "safe",
      detail: extensions.length
        ? extensions.join(", ")
        : "Token-2022 with no exotic extensions listed.",
      amount: extensions.length ? extensions.join(" · ") : "None",
    });
  } else {
    security.push({
      id: "t22",
      label: "Token-2022 extensions",
      level: "safe",
      detail: "Classic SPL token (no Token-2022 extensions).",
      amount: "SPL",
    });
  }

  return {
    mint: mintKey,
    identity: {
      name,
      symbol,
      image,
      description,
      platform,
      ageSeconds: pump?.created_timestamp
        ? Math.max(0, Math.floor(Date.now() / 1000) - Math.floor(pump.created_timestamp / 1000))
        : null,
      tokenProgram,
      decimals,
    },
    market: {
      priceUsd,
      marketCap,
      volume24h,
      supply: supply.toString(),
      circulating: supply.toString(),
      holders: holderCount,
      note: priceUsd == null ? "No price data — low liquidity token" : undefined,
    },
    security,
    fridge,
    links: {
      jupiter: `https://jup.ag/swap/SOL-${mintKey}`,
      birdeye: `https://birdeye.so/token/${mintKey}?chain=solana`,
      dexscreener: `https://dexscreener.com/solana/${mintKey}`,
      fridge: `https://devfridge.cool/?mint=${mintKey}`,
      solscan: `https://solscan.io/token/${mintKey}`,
    },
    warnings,
  };
}
