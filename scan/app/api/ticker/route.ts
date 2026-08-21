import { NextRequest, NextResponse } from "next/server";
import { parseMint } from "@/lib/format";
import { tokenTicker } from "@/lib/ticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mint = parseMint(req.nextUrl.searchParams.get("mint") || "");
  if (!mint) {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
  }
  const ticker = await tokenTicker(mint).catch(() => "");
  return NextResponse.json(
    { mint, ticker },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
