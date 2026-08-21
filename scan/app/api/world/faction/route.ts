import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { factionForWallet } from "@/lib/world-faction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = (req.nextUrl.searchParams.get("wallet") || "").trim();
  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  try {
    const faction = await factionForWallet(wallet);
    return NextResponse.json(
      { faction },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "faction failed" },
      { status: 502 }
    );
  }
}
