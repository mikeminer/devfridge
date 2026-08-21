import { NextRequest, NextResponse } from "next/server";
import { rpcUrls } from "@/lib/rpc";

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
  if (itemIsRecord(payload) && "method" in payload) {
    return [String(payload.method)];
  }
  return [];
}

function itemIsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "rpc";
  }
}

function shouldRetry(httpStatus: number, body: string): boolean {
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || httpStatus >= 500) {
    return true;
  }
  if (httpStatus !== 200) return false;
  try {
    const json = JSON.parse(body) as unknown;
    const items = Array.isArray(json) ? json : [json];
    return items.some((item) => {
      if (!itemIsRecord(item) || !itemIsRecord(item.error)) return false;
      const code = Number(item.error.code);
      const msg = String(item.error.message || "").toLowerCase();
      return (
        code === 403 ||
        code === 401 ||
        code === 429 ||
        code === -32005 ||
        code === -32429 ||
        msg.includes("forbidden") ||
        msg.includes("access denied") ||
        msg.includes("rate limit") ||
        msg.includes("capacity")
      );
    });
  } catch {
    return false;
  }
}

export function cors(res: NextResponse) {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type, solana-client");
  res.headers.set("cache-control", "no-store");
  return res;
}

export function rpcOptions() {
  return cors(new NextResponse(null, { status: 204 }));
}

export function rpcGet() {
  return cors(
    NextResponse.json({
      ok: true,
      jsonrpc: "2.0",
      methods: [...ALLOWED],
    })
  );
}

export async function rpcPost(req: NextRequest) {
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
      if (shouldRetry(upstream.status, body)) {
        errors.push(`${hostOf(url)} ${upstream.status}`);
        continue;
      }
      return cors(
        new NextResponse(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    } catch (err) {
      errors.push(`${hostOf(url)} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return cors(NextResponse.json({ error: "rpc failed", errors }, { status: 502 }));
}
