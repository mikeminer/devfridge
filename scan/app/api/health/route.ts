import { NextResponse } from "next/server";
import { runHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await runHealth();
  return NextResponse.json(report, {
    status: report.status === "error" ? 503 : 200,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
