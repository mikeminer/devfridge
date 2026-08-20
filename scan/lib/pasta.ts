import { PASTA_MINT, BURN_ADDRESS } from "./constants";
import { rpc } from "./rpc";

export async function pastaWidget() {
  let price: number | null = null;
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v2?ids=${PASTA_MINT}`, {
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as {
      data?: Record<string, { price?: string | number }>;
    };
    const p = json.data?.[PASTA_MINT]?.price;
    price = p == null ? null : Number(p);
  } catch {
    price = null;
  }

  let burned: string | null = null;
  try {
    const acc = await rpc<{
      value?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } };
    }>("getTokenAccountsByOwner", [
      BURN_ADDRESS,
      { mint: PASTA_MINT },
      { encoding: "jsonParsed" },
    ]);
    const rows = (acc as { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } } }> }).value ?? [];
    burned = rows[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? null;
  } catch {
    burned = null;
  }

  return { mint: PASTA_MINT, price, burned };
}
