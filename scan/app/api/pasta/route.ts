import { NextResponse } from "next/server";
import { pastaWidget } from "@/lib/pasta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await pastaWidget();
  return NextResponse.json(data, {
    headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
