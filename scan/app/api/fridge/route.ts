import { NextRequest, NextResponse } from "next/server";
import { fridgeForMint } from "@/lib/fridge";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mint = parseMint(req.nextUrl.searchParams.get("mint") || "");
  if (!mint) {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
  }
  const fridge = await fridgeForMint(mint);
  return NextResponse.json(fridge);
}
