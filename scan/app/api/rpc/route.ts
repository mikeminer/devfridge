import { NextRequest, NextResponse } from "next/server";
import { rpcUrls } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "getAccountInfo",
  "getMultipleAccountsInfo",
  "getProgramAccounts",
  "getLatestBlockhash",
  "getRecentBlockhash",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
  "getSignatureStatuses",
  "getSignatureStatus",
  "getTransaction",
  "getSignaturesForAddress",
  "getRecentPrioritizationFees",
  "getFeeForMessage",
  "getSlot",
  "getBlockHeight",
  "getEpochInfo",
  "getVersion",
  "getHealth",
  "getBalance",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getMinimumBalanceForRentExemption",
  "getGenesisHash",
  "getClusterNodes",
]);

function methodsOf(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.map((item) =>
      item && typeof item === "object" && "method" in item
        ? String((item as { method: string }).method)
        : ""
    );
  }
  if (payload && typeof payload === "object" && "method" in payload) {
    return [String((payload as { method: string }).method)];
  }
  return [];
}

function cors(res: NextResponse) {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "POST, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type, solana-client");
  res.headers.set("cache-control", "no-store");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  if (text.length > 400_000) {
    return cors(NextResponse.json({ error: "too large" }, { status: 413 }));
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return cors(NextResponse.json({ error: "bad json" }, { status: 400 }));
  }
  const methods = methodsOf(payload);
  if (methods.length === 0 || methods.some((m) => !ALLOWED.has(m))) {
    return cors(NextResponse.json({ error: "method not allowed" }, { status: 400 }));
  }

  const errors: string[] = [];
  for (const url of rpcUrls()) {
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const body = await upstream.text();
      if (!upstream.ok) {
        errors.push(`${new URL(url).host} ${upstream.status}`);
        continue;
      }
      return cors(
        new NextResponse(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return cors(NextResponse.json({ error: "rpc failed", errors }, { status: 502 }));
}
