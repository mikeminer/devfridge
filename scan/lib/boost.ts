import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BURN_ADDRESS, BOOST_TIERS, PASTA_MINT, type BoostTier } from "./constants";
import { pastaBuyInstructions, quoteSolToPasta } from "./jupiter";
import { connection, rpc } from "./rpc";
import type { BoostRecord } from "./store";

export const BOOST_MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_RE = /devfridge-boost:(24h|48h|7d):([1-9A-HJ-NP-Za-km-z]{32,44})/;

export function pastaBurnAta(): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(PASTA_MINT),
    new PublicKey(BURN_ADDRESS),
    true,
    TOKEN_2022_PROGRAM_ID
  );
}

export function parseBoostMemo(blob: string): { tier: BoostTier; mint: string } | null {
  const m = blob.match(MEMO_RE);
  if (!m) return null;
  try {
    return { tier: m[1] as BoostTier, mint: new PublicKey(m[2]).toBase58() };
  } catch {
    return null;
  }
}

export function boostMemo(tier: BoostTier, mint: string): string {
  return `devfridge-boost:${tier}:${mint}`;
}

export async function buildBoostTransaction(args: {
  payer: PublicKey;
  mint: string;
  tier: BoostTier;
}): Promise<{
  transaction: string;
  outAmount: string;
  minPastaOut: string;
  destAta: string;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const lamports = Math.round(BOOST_TIERS[args.tier].sol * 1_000_000_000);
  const destAta = pastaBurnAta();
  const quote = await quoteSolToPasta(lamports);
  const swap = await pastaBuyInstructions({
    quote,
    payer: args.payer.toBase58(),
    destinationTokenAccount: destAta.toBase58(),
  });

  const createAta = createAssociatedTokenAccountIdempotentInstruction(
    args.payer,
    destAta,
    new PublicKey(BURN_ADDRESS),
    new PublicKey(PASTA_MINT),
    TOKEN_2022_PROGRAM_ID
  );
  const memo = new TransactionInstruction({
    programId: new PublicKey(BOOST_MEMO_PROGRAM),
    keys: [{ pubkey: args.payer, isSigner: true, isWritable: false }],
    data: Buffer.from(boostMemo(args.tier, args.mint), "utf8"),
  });

  const ixs = [...swap.compute, createAta, ...swap.setup, swap.swap, ...swap.cleanup, memo];
  const conn = connection();
  const alts = [];
  for (const addr of swap.lookupTableAddresses) {
    const res = await conn.getAddressLookupTable(addr);
    if (res.value) alts.push(res.value);
  }
  const latest = await conn.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: args.payer,
    recentBlockhash: latest.blockhash,
    instructions: ixs,
  }).compileToV0Message(alts);
  const tx = new VersionedTransaction(message);
  return {
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    outAmount: quote.outAmount,
    minPastaOut: quote.otherAmountThreshold,
    destAta: destAta.toBase58(),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  };
}

type TokenBal = {
  mint?: string;
  owner?: string;
  uiTokenAmount?: { amount?: string };
};

type RpcTx = {
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    logMessages?: string[] | null;
    preTokenBalances?: TokenBal[] | null;
    postTokenBalances?: TokenBal[] | null;
    preBalances?: number[] | null;
    postBalances?: number[] | null;
  } | null;
  transaction?: { message?: unknown };
};

function pastaDeltaToBurn(tx: RpcTx): bigint {
  const pre = BigInt(
    (tx.meta?.preTokenBalances || []).find((b) => b.mint === PASTA_MINT && b.owner === BURN_ADDRESS)
      ?.uiTokenAmount?.amount || "0"
  );
  const post = BigInt(
    (tx.meta?.postTokenBalances || []).find((b) => b.mint === PASTA_MINT && b.owner === BURN_ADDRESS)
      ?.uiTokenAmount?.amount || "0"
  );
  return post > pre ? post - pre : 0n;
}

export async function verifyBoostTransaction(signature: string, expect: { mint: string; tier: BoostTier }) {
  let tx: RpcTx | null = null;
  for (let i = 0; i < 8; i++) {
    tx = await rpc<RpcTx | null>("getTransaction", [
      signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
    ]).catch(() => null);
    if (tx?.meta && !tx.meta.err) break;
    if (tx?.meta?.err) throw new Error("Boost transaction failed on-chain");
    await new Promise((r) => setTimeout(r, 750));
  }
  if (!tx || !tx.meta || tx.meta.err) {
    throw new Error("Boost transaction not confirmed");
  }
  const blob = `${JSON.stringify(tx)}\n${(tx.meta?.logMessages || []).join("\n")}`;
  const memo = parseBoostMemo(blob);
  if (!memo) {
    throw new Error("Missing boost memo — $PASTA was not burned with a featured-slot tag");
  }
  if (memo.mint !== expect.mint || memo.tier !== expect.tier) {
    throw new Error("Boost memo does not match this mint and package");
  }
  const burned = pastaDeltaToBurn(tx);
  if (burned <= 0n) {
    throw new Error("$PASTA was not sent to the burn address");
  }
  const spent = (tx.meta?.preBalances?.[0] || 0) - (tx.meta?.postBalances?.[0] || 0);
  const expected = Math.round(BOOST_TIERS[expect.tier].sol * 1_000_000_000);
  if (spent < expected * 0.75) {
    throw new Error("Boost did not spend the package SOL on the $PASTA buy");
  }
  const createdAt = (tx.blockTime ? tx.blockTime * 1000 : Date.now());
  return {
    burned: burned.toString(),
    createdAt,
    expiresAt: createdAt + BOOST_TIERS[expect.tier].hours * 3600 * 1000,
  };
}

let chainCache: { at: number; rows: BoostRecord[] } | null = null;

export async function boostsFromChain(): Promise<BoostRecord[]> {
  if (chainCache && Date.now() - chainCache.at < 60_000) return chainCache.rows;
  const ata = pastaBurnAta().toBase58();
  const sigs = await rpc<Array<{ signature: string; blockTime?: number | null }>>(
    "getSignaturesForAddress",
    [ata, { limit: 40 }]
  ).catch(() => [] as Array<{ signature: string; blockTime?: number | null }>);
  const now = Date.now();
  const rows: BoostRecord[] = [];
  const seen = new Set<string>();
  await Promise.all(
    (sigs || []).slice(0, 24).map(async (row) => {
      try {
        const tx = await rpc<RpcTx>("getTransaction", [
          row.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ]);
        if (!tx || !tx.meta || tx.meta.err) return;
        const memo = parseBoostMemo(`${JSON.stringify(tx)}\n${(tx.meta.logMessages || []).join("\n")}`);
        if (!memo) return;
        const createdAt = (tx.blockTime || row.blockTime || 0) * 1000 || Date.now();
        const expiresAt = createdAt + BOOST_TIERS[memo.tier].hours * 3600 * 1000;
        if (expiresAt <= now) return;
        const key = `${memo.mint}:${row.signature}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({
          mint: memo.mint,
          name: memo.mint.slice(0, 4),
          symbol: "TKN",
          image: null,
          tier: memo.tier,
          signature: row.signature,
          payer: "",
          createdAt,
          expiresAt,
          fridged: true,
        });
      } catch {
        /* skip a bad signature */
      }
    })
  );
  chainCache = { at: Date.now(), rows };
  return rows;
}

export function invalidateBoostChainCache() {
  chainCache = null;
}
