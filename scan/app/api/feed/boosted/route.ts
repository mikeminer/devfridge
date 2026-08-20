import { NextResponse } from "next/server";
import { listBoosts } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tokens: await listBoosts() });
}
