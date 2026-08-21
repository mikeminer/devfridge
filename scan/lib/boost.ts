import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  BOOST_ACC_DISC,
  BOOST_ACCOUNT_SIZE,
  BOOST_IX_DISC,
  BOOST_SEED,
  BOOST_TIERS,
  BURN_ADDRESS,
  BURN_SEED,
  JUPITER_V6,
  PASTA_MINT,
  PROGRAM_ID,
  TIER_INDEX,
  WSOL_MINT,
  type BoostTier,
} from "./constants";
import { fetchPastaBuybackRoute } from "./jupiter";
import { rpc, rpcRace } from "./rpc";
import type { BoostRecord } from "./store";
import type { FridgeLock } from "./fridge";

export function pastaBurnAta(): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(PASTA_MINT),
    new PublicKey(BURN_ADDRESS),
    true,
    TOKEN_2022_PROGRAM_ID
  );
}

export function burnPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BURN_SEED)],
    new PublicKey(PROGRAM_ID)
  );
}

export function boostPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BOOST_SEED), mint.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function u64le(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  const v = new DataView(b.buffer);
  v.setUint32(0, Number(n & 0xffffffffn), true);
  v.setUint32(4, Number(n >> 32n), true);
  return b;
}

function concat(...parts: Uint8Array[]): Buffer {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return Buffer.from(out);
}

function i64(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lo = view.getUint32(offset, true);
  const hi = view.getInt32(offset + 4, true);
  return hi * 2 ** 32 + lo;
}

export function decodeBoost(address: string, data: Uint8Array): BoostRecord | null {
  if (data.length < BOOST_ACCOUNT_SIZE) return null;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== BOOST_ACC_DISC[i]) return null;
  }
  let o = 8;
  const payer = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;
  const mint = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;
  const tierIdx = data[o];
  o += 1;
  const createdAt = i64(data, o) * 1000;
  o += 8;
  const expiresAt = i64(data, o) * 1000;
  const tier: BoostTier = tierIdx === 2 ? "7d" : tierIdx === 1 ? "48h" : "24h";
  return {
    mint,
    name: mint.slice(0, 4),
    symbol: "TKN",
    image: null,
    tier,
    signature: address,
    payer,
    createdAt,
    expiresAt,
    fridged: true,
  };
}

export type BoostPlanIx = {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

export type BoostPlan = {
  instructions: BoostPlanIx[];
  alts: { key: string; data: string }[];
  minPastaOut: string;
};

function serializeIx(ix: TransactionInstruction): BoostPlanIx {
  return {
    programId: ix.programId.toBase58(),
    keys: ix.keys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(ix.data).toString("base64"),
  };
}

export async function buildProgramBoostPlan(args: {
  payer: PublicKey;
  mint: string;
  tier: BoostTier;
  lock: FridgeLock;
}): Promise<BoostPlan> {
  const mint = new PublicKey(args.mint);
  const programId = new PublicKey(PROGRAM_ID);
  const [burnAuthority] = burnPda();
  const [boost] = boostPda(mint);
  const wsolMint = new PublicKey(WSOL_MINT);
  const pastaMint = new PublicKey(PASTA_MINT);
  const wsolAta = getAssociatedTokenAddressSync(wsolMint, burnAuthority, true, TOKEN_PROGRAM_ID);
  const pastaAta = getAssociatedTokenAddressSync(pastaMint, burnAuthority, true, TOKEN_2022_PROGRAM_ID);
  const lamports = BigInt(Math.round(BOOST_TIERS[args.tier].sol * 1_000_000_000));
  const tier = TIER_INDEX[args.tier];
  const cushion = 20_000_000n;
  const feeHeadroom = 40_000_000n;

  const [payerLamports, burnLamports] = await Promise.all([
    rpc<{ value: number }>("getBalance", [args.payer.toBase58(), { commitment: "confirmed" }]).then(
      (r) => BigInt(typeof r === "number" ? r : r.value)
    ),
    rpc<{ value: number }>("getBalance", [burnAuthority.toBase58(), { commitment: "confirmed" }]).then(
      (r) => BigInt(typeof r === "number" ? r : r.value)
    ),
  ]);
  const fundBurn = burnLamports < 15_000_000n ? cushion : 0n;
  const needed = lamports + fundBurn + feeHeadroom;
  if (payerLamports < needed) {
    const have = Number(payerLamports) / 1e9;
    const want = Number(needed) / 1e9;
    throw new Error(
      `Need about ${want.toFixed(2)} SOL in this wallet (${BOOST_TIERS[args.tier].sol} package + rent and fees). Connected wallet has ${have.toFixed(3)} SOL.`
    );
  }

  let lastError: Error | null = null;

  for (const maxAccounts of [32, 24, 16]) {
    try {
      const route = await fetchPastaBuybackRoute(WSOL_MINT, lamports, burnAuthority.toBase58(), maxAccounts);
      const data = concat(
        BOOST_IX_DISC,
        Uint8Array.of(tier),
        u32le(route.swapData.length),
        route.swapData,
        u64le(route.minPastaOut)
      );
      const boostIx = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: args.payer, isSigner: true, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: new PublicKey(args.lock.address), isSigner: false, isWritable: false },
          { pubkey: boost, isSigner: false, isWritable: true },
          { pubkey: wsolMint, isSigner: false, isWritable: false },
          { pubkey: wsolAta, isSigner: false, isWritable: true },
          { pubkey: pastaMint, isSigner: false, isWritable: true },
          { pubkey: pastaAta, isSigner: false, isWritable: true },
          { pubkey: burnAuthority, isSigner: false, isWritable: false },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey(JUPITER_V6), isSigner: false, isWritable: false },
          ...route.swapAccounts,
        ],
        data,
      });
      const ixs: TransactionInstruction[] = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
      ];
      if (fundBurn > 0n) {
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: args.payer,
            toPubkey: burnAuthority,
            lamports: Number(fundBurn),
          })
        );
      }
      ixs.push(boostIx);
      const altRows: { key: string; data: string }[] = [];
      for (const addr of route.lookupTableAddresses) {
        const acc = await rpc<{ value?: { data?: [string, string] } }>("getAccountInfo", [
          addr.toBase58(),
          { encoding: "base64" },
        ]).catch(() => null);
        if (acc?.value?.data?.[0]) {
          altRows.push({ key: addr.toBase58(), data: acc.value.data[0] });
        }
      }
      return {
        instructions: ixs.map(serializeIx),
        alts: altRows,
        minPastaOut: route.minPastaOut.toString(),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Could not build the on-chain $PASTA boost");
}

type RpcTx = {
  blockTime?: number | null;
  meta?: { err?: unknown; logMessages?: string[] | null } | null;
};

async function waitForTx(signature: string): Promise<RpcTx> {
  const started = Date.now();
  while (Date.now() - started < 50_000) {
    const st = await rpc<{ value?: Array<{ confirmationStatus?: string; err?: unknown } | null> }>(
      "getSignatureStatuses",
      [[signature], { searchTransactionHistory: true }]
    ).catch(() => null);
    const row = st?.value?.[0];
    if (row?.err) {
      throw new Error(`Boost transaction failed on-chain: ${JSON.stringify(row.err)}`);
    }
    if (row?.confirmationStatus === "confirmed" || row?.confirmationStatus === "finalized") {
      const tx = await rpc<RpcTx | null>("getTransaction", [
        signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
      ]).catch(() => null);
      if (tx?.meta && !tx.meta.err) return tx;
      if (tx?.meta?.err) {
        throw new Error(`Boost transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error(
    `Boost transaction not confirmed yet. Check https://solscan.io/tx/${signature} — if it succeeded, click Buy & burn again to index it.`
  );
}

export async function verifyBoostTransaction(args: {
  signature: string;
  mint: string;
}) {
  await waitForTx(args.signature);
  const [pda] = boostPda(new PublicKey(args.mint));
  const acc = await rpc<{ value?: { data?: [string, string] } }>("getAccountInfo", [
    pda.toBase58(),
    { encoding: "base64" },
  ]);
  if (!acc?.value?.data?.[0]) {
    throw new Error("On-chain boost account was not created — was the program upgraded?");
  }
  const row = decodeBoost(pda.toBase58(), Buffer.from(acc.value.data[0], "base64"));
  if (!row || row.expiresAt <= Date.now()) {
    throw new Error("Boost did not land on-chain with a live expiry");
  }
  return {
    burned: "0",
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    payer: row.payer,
    tier: row.tier,
  };
}

let chainCache: { at: number; rows: BoostRecord[] } | null = null;

export async function boostsFromChain(): Promise<BoostRecord[]> {
  if (chainCache && Date.now() - chainCache.at < 30_000) return chainCache.rows;
  const rows = await rpcRace<Array<{ pubkey: string; account: { data: [string, string] } }>>(
    "getProgramAccounts",
    [
      PROGRAM_ID,
      {
        encoding: "base64",
        commitment: "confirmed",
        filters: [{ dataSize: BOOST_ACCOUNT_SIZE }],
      },
    ]
  ).catch(() => [] as Array<{ pubkey: string; account: { data: [string, string] } }>);
  const now = Date.now();
  const out: BoostRecord[] = [];
  for (const row of rows || []) {
    const decoded = decodeBoost(row.pubkey, Buffer.from(row.account.data[0], "base64"));
    if (!decoded || decoded.expiresAt <= now) continue;
    out.push(decoded);
  }
  chainCache = { at: Date.now(), rows: out };
  return out;
}

export function invalidateBoostChainCache() {
  chainCache = null;
}
