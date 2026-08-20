import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";
import { fridgeForMint } from "@/lib/fridge";
import { PASTA_MINT } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let rpcStatus: "ok" | "degraded" = "ok";
  try {
    await rpc<number>("getSlot", []);
  } catch {
    rpcStatus = "degraded";
  }
  let fridge: "ok" | "error" = "ok";
  try {
    const status = await fridgeForMint(PASTA_MINT);
    if (status.status === "unavailable") fridge = "error";
  } catch {
    fridge = "error";
  }
  return NextResponse.json({
    rpc: rpcStatus,
    db: "ok",
    fridge,
    ts: Date.now(),
  });
}
