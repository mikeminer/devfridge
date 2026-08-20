import { NextRequest, NextResponse } from "next/server";
import { scanMint } from "@/lib/scan";
import { addRecent } from "@/lib/store";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mint = parseMint(req.nextUrl.searchParams.get("mint") || "");
  if (!mint) {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
  }
  try {
    const report = await scanMint(mint);
    await addRecent({
      mint: report.mint,
      name: report.identity.name,
      symbol: report.identity.symbol,
      image: report.identity.image,
      fridged: report.fridge.status === "fridged",
      scannedAt: Date.now(),
    });
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    const status = message.includes("Invalid") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
