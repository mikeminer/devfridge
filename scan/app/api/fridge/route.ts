import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { fridgeForMint } from "@/lib/fridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || "";
  try {
    new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
  }
  const fridge = await fridgeForMint(mint);
  return NextResponse.json(fridge);
}
