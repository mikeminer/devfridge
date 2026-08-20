export const config = { runtime: "edge" };

const PROGRAM_DEFAULT = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6";
const LOCK_SIZE = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8;

const RPCS: Record<string, string[]> = {
  mainnet: [
    "https://api.mainnet.solana.com",
    "https://api.mainnet-beta.solana.com",
  ],
  devnet: ["https://api.devnet.solana.com"],
  testnet: ["https://api.testnet.solana.com"],
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      ...extra,
    },
  });
}

async function gpa(rpc: string, program: string) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        program,
        {
          encoding: "base64",
          commitment: "confirmed",
          filters: [{ dataSize: LOCK_SIZE }],
        },
      ],
    }),
  });
  const body = (await res.json()) as {
    error?: { message?: string };
    result?: Array<{ pubkey: string; account: { data: [string, string] } }>;
  };
  if (!res.ok || body.error || !Array.isArray(body.result)) {
    throw new Error(body.error?.message || `gpa ${res.status}`);
  }
  return body.result.map((row) => ({
    pubkey: row.pubkey,
    data: row.account.data[0],
  }));
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
      },
    });
  }
  const url = new URL(req.url);
  const cluster = (url.searchParams.get("cluster") || "mainnet").toLowerCase();
  const program = url.searchParams.get("program") || PROGRAM_DEFAULT;
  const rpcs = RPCS[cluster];
  if (!rpcs || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(program)) {
    return json({ error: "bad cluster or program" }, 400);
  }

  const errors: string[] = [];
  for (const rpc of rpcs) {
    try {
      const accounts = await gpa(rpc, program);
      return json(
        { cluster, program, accounts },
        200,
        { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" }
      );
    } catch (err) {
      errors.push(`${rpc}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return json({ error: "scan failed", errors }, 502);
}
