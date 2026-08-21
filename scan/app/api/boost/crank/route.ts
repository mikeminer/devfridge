import { NextResponse } from "next/server";
import { runCrankBuyback, vaultLamports } from "@/lib/boost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const lamports = await vaultLamports();
    return NextResponse.json({
      ok: true,
      vaultLamports: lamports.toString(),
      vaultSol: Number(lamports) / 1e9,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "vault balance failed" },
      { status: 502 }
    );
  }
}

export async function POST() {
  try {
    const result = await runCrankBuyback();
    const status = result.ok ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "crank failed" },
      { status: 502 }
    );
  }
}
