export const config = { runtime: "edge" };

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
  "getTransactions",
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
  "getAddressLookupTable",
]);

function rpcs(cluster: string, method: string): string[] {
  const key =
    (typeof process !== "undefined" &&
      (process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY)) ||
    "";
  let urls: string[];
  if (cluster === "testnet") urls = ["https://api.testnet.solana.com"];
  else if (cluster === "devnet") {
    urls = [
      "https://api.devnet.solana.com",
      ...(key ? [`https://solana-devnet.g.alchemy.com/v2/${key}`] : []),
    ];
  } else {
    urls = [
      "https://api.mainnet.solana.com",
      "https://api.mainnet-beta.solana.com",
      ...(key ? [`https://solana-mainnet.g.alchemy.com/v2/${key}`] : []),
    ];
  }
  if (method === "getProgramAccounts") {
    return urls.filter((u) => !u.includes("alchemy.com"));
  }
  return urls;
}

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

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response("method", { status: 405 });
  }
  const cluster = (
    new URL(req.url).searchParams.get("cluster") || "mainnet"
  ).toLowerCase();
  if (!["mainnet", "devnet", "testnet"].includes(cluster)) {
    return new Response("bad cluster", { status: 400 });
  }
  const text = await req.text();
  if (text.length > 400_000) {
    return new Response("too large", { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const methods = methodsOf(payload);
  if (methods.length === 0 || methods.some((m) => !ALLOWED.has(m))) {
    return new Response("method not allowed", { status: 400 });
  }
  const urls = rpcs(cluster, methods[0] || "");
  const errors: string[] = [];
  for (const rpc of urls) {
    try {
      const upstream = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
      });
      const body = await upstream.arrayBuffer();
      if (!upstream.ok) {
        errors.push(`${rpc} ${upstream.status}`);
        continue;
      }
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    } catch (err) {
      errors.push(`${rpc}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return new Response(JSON.stringify({ error: "rpc failed", errors }), {
    status: 502,
    headers: { "content-type": "application/json" },
  });
}
