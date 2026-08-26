export const config = { runtime: "edge" };

const PASTA_MINT = "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";
const DECIMALS = 6;
const RPCS = [
  "https://api.mainnet.solana.com",
  "https://api.mainnet-beta.solana.com",
];

async function getMintSupply(rpc: string): Promise<bigint> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [PASTA_MINT, { encoding: "jsonParsed" }],
    }),
  });
  const body = (await res.json()) as {
    result?: { value?: { data?: { parsed?: { info?: { supply?: string } } } } };
  };
  const supply = body.result?.value?.data?.parsed?.info?.supply;
  if (!supply) throw new Error("could not read mint supply");
  return BigInt(supply);
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
  const field = url.searchParams.get("q") || "total";

  for (const rpc of RPCS) {
    try {
      const rawSupply = await getMintSupply(rpc);
      const supply = Number(rawSupply) / 10 ** DECIMALS;

      if (field === "max") {
        return plain("1000000000");
      }
      // total and circulating are the same (fair launch, no locked team tokens)
      return plain(Math.floor(supply).toString());
    } catch {
      continue;
    }
  }

  return new Response("error", { status: 502 });
}

function plain(text: string) {
  return new Response(text, {
    headers: {
      "content-type": "text/plain",
      "access-control-allow-origin": "*",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
