import { NextResponse } from "next/server";
import { protocolStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await protocolStats();
  return NextResponse.json(stats, {
    headers: {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=120",
      "access-control-allow-origin": "*",
    },
  });
}
