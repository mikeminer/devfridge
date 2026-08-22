import { PublicKey } from "@solana/web3.js";
import { locksForDepositor } from "./fridge";
import { boostsFromChain } from "./boost";
import { PASTA_MINT } from "./constants";
import { rpcRace } from "./rpc";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export type VerifyResult = { ok: boolean; message: string };

const ZEALY_API_KEY = process.env.ZEALY_API_KEY || "";

export function verifyApiKey(headerValue: string | null): boolean {
  if (!ZEALY_API_KEY) return false;
  return headerValue === ZEALY_API_KEY;
}

export function extractWallet(
  body: Record<string, unknown>
): string | null {
  const accounts = body.accounts as Record<string, unknown> | undefined;
  const wallet = (accounts?.wallet as string)?.trim();
  if (!wallet) return null;
  try {
    new PublicKey(wallet);
    return wallet;
  } catch {
    return null;
  }
}

export async function verifyFridgeLock(wallet: string): Promise<VerifyResult> {
  const locks = await locksForDepositor(wallet);
  const now = Math.floor(Date.now() / 1000);
  const active = locks.filter((l) => l.unlockAt > now);
  if (active.length === 0) {
    return {
      ok: false,
      message:
        "No active Fridge lock found for this wallet. Lock tokens at devfridge.cool first.",
    };
  }
  const total = active.reduce((s, l) => s + BigInt(l.amount), 0n);
  return {
    ok: true,
    message: `Verified: ${active.length} active lock${active.length > 1 ? "s" : ""} with ${total.toString()} tokens locked on-chain.`,
  };
}

export async function verifyGetFeatured(
  wallet: string
): Promise<VerifyResult> {
  const boosts = await boostsFromChain();
  const now = Date.now();
  const active = boosts.find(
    (b) => b.payer === wallet && b.expiresAt > now
  );
  if (!active) {
    return {
      ok: false,
      message:
        "No active Feature (Boost) found for this wallet. Get Featured at scan.devfridge.cool first.",
    };
  }
  return {
    ok: true,
    message: `Verified: active ${active.tier} Feature for mint ${active.mint.slice(0, 8)}…`,
  };
}

export async function verifyWorldTeam(wallet: string): Promise<VerifyResult> {
  const locks = await locksForDepositor(wallet);
  const now = Math.floor(Date.now() / 1000);
  const active = locks.filter((l) => l.unlockAt > now);
  if (active.length === 0) {
    return {
      ok: false,
      message:
        "No active lock found — you need a live Fridge lock to join a team in Fridge World.",
    };
  }
  const largest = active.reduce((best, l) =>
    BigInt(l.amount) > BigInt(best.amount) ? l : best
  );
  const team = largest.mint === PASTA_MINT ? "Pastalovers" : "The Shelf";
  return {
    ok: true,
    message: `Verified: team ${team} (largest lock: ${largest.mint.slice(0, 8)}…).`,
  };
}

export async function verifyPastaHolder(
  wallet: string
): Promise<VerifyResult> {
  const accounts = await rpcRace<{
    value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }>;
  }>("getTokenAccountsByOwner", [
    wallet,
    { mint: PASTA_MINT },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]).catch(() => ({ value: [] }));

  // Also check Token-2022 program
  const accounts2022 = await rpcRace<{
    value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }>;
  }>("getTokenAccountsByOwner", [
    wallet,
    { mint: PASTA_MINT },
    { encoding: "jsonParsed", commitment: "confirmed", programId: TOKEN_2022_PROGRAM_ID.toBase58() },
  ]).catch(() => ({ value: [] }));

  const all = [...(accounts?.value || []), ...(accounts2022?.value || [])];
  const balance = all.reduce(
    (sum, a) => sum + (a.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0),
    0
  );

  if (balance <= 0) {
    return {
      ok: false,
      message: "No $PASTA tokens found in this wallet.",
    };
  }
  return {
    ok: true,
    message: `Verified: wallet holds ${balance.toLocaleString()} $PASTA.`,
  };
}

export const QUEST_HANDLERS: Record<
  string,
  (wallet: string) => Promise<VerifyResult>
> = {
  "fridge-lock": verifyFridgeLock,
  "get-featured": verifyGetFeatured,
  "world-team": verifyWorldTeam,
  "pasta-holder": verifyPastaHolder,
};
