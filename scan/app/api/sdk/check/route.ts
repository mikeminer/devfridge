import { NextRequest, NextResponse } from "next/server";
import { locksForDepositor, type FridgeLock } from "@/lib/fridge";
import { parseMint } from "@/lib/format";
import { PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(res: NextResponse): NextResponse {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "GET, OPTIONS");
  res.headers.set("cache-control", "public, s-maxage=30, stale-while-revalidate=60");
  return res;
}

export async function OPTIONS() {
  return cors(NextResponse.json(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim() || "";
  const mintRaw = req.nextUrl.searchParams.get("mint") || "";

  if (!wallet) {
    return cors(NextResponse.json({ error: "wallet param required" }, { status: 400 }));
  }
  try {
    new PublicKey(wallet);
  } catch {
    return cors(NextResponse.json({ error: "Invalid wallet address" }, { status: 400 }));
  }

  const mint = parseMint(mintRaw);
  if (!mint) {
    return cors(NextResponse.json({ error: "Invalid mint address" }, { status: 400 }));
  }

  try {
    const allLocks = await locksForDepositor(wallet);
    const locks = allLocks.filter((l) => l.mint === mint);
    const now = Math.floor(Date.now() / 1000);
    const active = locks
      .filter((l) => l.unlockAt > now)
      .sort((a, b) => b.unlockAt - a.unlockAt);

    const best = active[0] ?? null;
    const daysRemaining = best ? Math.floor((best.unlockAt - now) / 86400) : 0;

    return cors(
      NextResponse.json({
        wallet,
        mint,
        locks: locks.map(formatLock),
        activeLocks: active.map(formatLock),
        bestLock: best ? formatLock(best) : null,
        daysRemaining,
        ts: now,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC error";
    return cors(NextResponse.json({ error: message }, { status: 502 }));
  }
}

function formatLock(l: FridgeLock) {
  return {
    address: l.address,
    depositor: l.depositor,
    mint: l.mint,
    amount: l.amount,
    createdAt: l.createdAt,
    unlockAt: l.unlockAt,
    lockId: l.lockId,
  };
}
