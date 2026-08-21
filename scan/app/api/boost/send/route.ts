import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { transaction?: string };
    const transaction = body.transaction?.trim() || "";
    if (!transaction || transaction.length > 400_000) {
      return NextResponse.json({ error: "signed transaction required" }, { status: 400 });
    }
    const signature = await rpc<string>("sendTransaction", [
      transaction,
      {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "processed",
        maxRetries: 4,
      },
    ]);
    if (!signature) throw new Error("RPC did not return a signature");
    return NextResponse.json({ ok: true, signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
