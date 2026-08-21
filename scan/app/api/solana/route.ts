import { NextRequest } from "next/server";
import { rpcGet, rpcOptions, rpcPost } from "@/lib/rpc-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return rpcOptions();
}

export function GET() {
  return rpcGet();
}

export function POST(req: NextRequest) {
  return rpcPost(req);
}
