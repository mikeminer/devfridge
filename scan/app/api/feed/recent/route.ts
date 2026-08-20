import { NextRequest, NextResponse } from "next/server";
import { addRecent, listRecent, type RecentScan } from "@/lib/store";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tokens: await listRecent() });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RecentScan>;
    const mint = parseMint(body.mint || "");
    if (!mint) {
      return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
    }
    await addRecent({
      mint,
      name: typeof body.name === "string" && body.name ? body.name : mint.slice(0, 4),
      symbol: typeof body.symbol === "string" && body.symbol ? body.symbol : "TKN",
      image: typeof body.image === "string" ? body.image : null,
      fridged: Boolean(body.fridged),
      scannedAt: Date.now(),
    });
    return NextResponse.json({ tokens: await listRecent() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record scan" },
      { status: 400 }
    );
  }
}
