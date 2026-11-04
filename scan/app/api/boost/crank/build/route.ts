import { NextResponse } from "next/server";
import { buildTreasuryCrankTransaction } from "@/lib/boost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Unsigned crank. The treasury wallet signs it in Phantom. Spend is capped at 0.5 SOL. */
export async function POST() {
  try {
    const result = await buildTreasuryCrankTransaction();
    const status = result.ok ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "crank build failed" },
      { status: 502 }
    );
  }
}
