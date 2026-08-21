import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BURN_ADDRESS, BOOST_TIERS, PASTA_MINT, type BoostTier } from "./constants";
import { quoteSolToPasta, swapSolToPastaTx, type JupiterQuote } from "./jupiter";
import { rpc } from "./rpc";
import type { BoostRecord } from "./store";

export const BOOST_MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_RE = /devfridge-boost:(24h|48h|7d):([1-9A-HJ-NP-Za-km-z]{32,44})/;
const PASTA_DECIMALS = 6;

export function pastaBurnAta(): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(PASTA_MINT),
    new PublicKey(BURN_ADDRESS),
    true,
    TOKEN_2022_PROGRAM_ID
  );
}

export function pastaUserAta(payer: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(PASTA_MINT),
    payer,
    false,
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

export async function buildBoostSwap(args: {
  payer: PublicKey;
  tier: BoostTier;
  quote?: JupiterQuote;
}): Promise<{
  transaction: string;
  outAmount: string;
  minPastaOut: string;
  lastValidBlockHeight?: number;
}> {
  const lamports = Math.round(BOOST_TIERS[args.tier].sol * 1_000_000_000);
  const quote = args.quote ?? (await quoteSolToPasta(lamports));
  const swap = await swapSolToPastaTx({
    quote,
    payer: args.payer.toBase58(),
  });
  return {
    transaction: swap.swapTransaction,
    outAmount: quote.outAmount,
    minPastaOut: quote.otherAmountThreshold,
    lastValidBlockHeight: swap.lastValidBlockHeight,
  };
}

type TokenBal = {
  accountIndex?: number;
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

async function waitForTx(signature: string): Promise<RpcTx> {
  let tx: RpcTx | null = null;
  for (let i = 0; i < 10; i++) {
    tx = await rpc<RpcTx | null>("getTransaction", [
      signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
    ]).catch(() => null);
    if (tx?.meta && !tx.meta.err) return tx;
    if (tx?.meta?.err) {
      const err = JSON.stringify(tx.meta.err);
      throw new Error(`Transaction failed on-chain: ${err}`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error("Transaction not confirmed yet — try Buy & burn again to finish the burn.");
}

function tokenDelta(tx: RpcTx, mint: string, owner?: string): bigint {
  const pres = tx.meta?.preTokenBalances || [];
  const posts = tx.meta?.postTokenBalances || [];
  if (owner) {
    const pre = BigInt(
      pres.find((b) => b.mint === mint && b.owner === owner)?.uiTokenAmount?.amount || "0"
    );
    const post = BigInt(
      posts.find((b) => b.mint === mint && b.owner === owner)?.uiTokenAmount?.amount || "0"
    );
    if (post > pre) return post - pre;
  }
  let best = 0n;
  for (const post of posts) {
    if (post.mint !== mint || post.owner === BURN_ADDRESS) continue;
    const preRow = pres.find((p) => p.accountIndex === post.accountIndex);
    const d =
      BigInt(post.uiTokenAmount?.amount || "0") - BigInt(preRow?.uiTokenAmount?.amount || "0");
    if (d > best) best = d;
  }
  return best;
}

export async function pastaBoughtInSwap(swapSignature: string, payer: string): Promise<bigint> {
  const tx = await waitForTx(swapSignature);
  const got = tokenDelta(tx, PASTA_MINT, payer);
  if (got <= 0n) {
    throw new Error("Jupiter swap did not deliver $PASTA to your wallet.");
  }
  return got;
}

export async function buildBoostBurn(args: {
  payer: PublicKey;
  mint: string;
  tier: BoostTier;
  amount: bigint;
}): Promise<{
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  amount: string;
}> {
  if (args.amount <= 0n) throw new Error("Nothing to burn");
  const payer = args.payer;
  const userAta = pastaUserAta(payer);
  const burnAta = pastaBurnAta();
  const pasta = new PublicKey(PASTA_MINT);

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      burnAta,
      new PublicKey(BURN_ADDRESS),
      pasta,
      TOKEN_2022_PROGRAM_ID
    ),
    createTransferCheckedInstruction(
      userAta,
      pasta,
      burnAta,
      payer,
      args.amount,
      PASTA_DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID
    ),
    new TransactionInstruction({
      programId: new PublicKey(BOOST_MEMO_PROGRAM),
      keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
      data: Buffer.from(boostMemo(args.tier, args.mint), "utf8"),
    })
  );
  tx.feePayer = payer;
  const latest = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
    "getLatestBlockhash",
    [{ commitment: "confirmed" }]
  );
  tx.recentBlockhash = latest.value.blockhash;
  return {
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    blockhash: latest.value.blockhash,
    lastValidBlockHeight: latest.value.lastValidBlockHeight,
    amount: args.amount.toString(),
  };
}

export async function verifyBoostTransaction(args: {
  burnSignature: string;
  swapSignature: string;
  mint: string;
  tier: BoostTier;
  payer?: string;
}) {
  const burnTx = await waitForTx(args.burnSignature);
  const blob = `${JSON.stringify(burnTx)}\n${(burnTx.meta?.logMessages || []).join("\n")}`;
  const memo = parseBoostMemo(blob);
  if (!memo) {
    throw new Error("Missing boost memo — burn was not tagged with the featured slot.");
  }
  if (memo.mint !== args.mint || memo.tier !== args.tier) {
    throw new Error("Boost memo does not match this mint and package");
  }
  const burned = tokenDelta(burnTx, PASTA_MINT, BURN_ADDRESS);
  if (burned <= 0n) {
    throw new Error("$PASTA was not sent to the burn address");
  }

  const swapTx = await waitForTx(args.swapSignature);
  const spent = (swapTx.meta?.preBalances?.[0] || 0) - (swapTx.meta?.postBalances?.[0] || 0);
  const expected = Math.round(BOOST_TIERS[args.tier].sol * 1_000_000_000);
  if (spent < expected * 0.7) {
    throw new Error("Boost did not spend the package SOL on the $PASTA buy");
  }
  if (args.payer) {
    const bought = tokenDelta(swapTx, PASTA_MINT, args.payer);
    if (bought <= 0n) {
      throw new Error("Jupiter swap did not buy $PASTA");
    }
  }

  const createdAt = (burnTx.blockTime ? burnTx.blockTime * 1000 : Date.now());
  return {
    burned: burned.toString(),
    createdAt,
    expiresAt: createdAt + BOOST_TIERS[args.tier].hours * 3600 * 1000,
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
