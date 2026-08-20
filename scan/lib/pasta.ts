import { PASTA_MINT, BURN_ADDRESS } from "./constants";
import { usdPrice } from "./price";
import { rpc } from "./rpc";

export async function pastaWidget() {
  let price: number | null = null;
  try {
    price = await usdPrice(PASTA_MINT);
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
