import { PASTA_MINT } from "./constants";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SWAP_URL = "https://lite-api.jup.ag/swap/v1/swap";

export type JupiterQuote = {
  outAmount: string;
  otherAmountThreshold: string;
  raw: unknown;
};

export async function quoteSolToPasta(lamports: number): Promise<JupiterQuote> {
  const url =
    `${QUOTE_URL}?inputMint=${SOL_MINT}` +
    `&outputMint=${PASTA_MINT}&amount=${lamports}` +
    `&slippageBps=150&swapMode=ExactIn`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  const json = (await res.json().catch(() => ({}))) as {
    outAmount?: string;
    otherAmountThreshold?: string;
    error?: string;
  };
  if (!res.ok || !json.outAmount) {
    throw new Error(json.error || "No Jupiter route to buy $PASTA with SOL.");
  }
  return {
    outAmount: json.outAmount,
    otherAmountThreshold: json.otherAmountThreshold || json.outAmount,
    raw: json,
  };
}

export async function swapSolToPastaTx(args: {
  quote: JupiterQuote;
  payer: string;
}): Promise<{ swapTransaction: string; lastValidBlockHeight?: number }> {
  const res = await fetch(SWAP_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      quoteResponse: args.quote.raw,
      userPublicKey: args.payer,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
      asLegacyTransaction: false,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    swapTransaction?: string;
    lastValidBlockHeight?: number;
    error?: string;
    simulationError?: unknown;
  };
  if (!res.ok || !json.swapTransaction) {
    throw new Error(json.error || "Jupiter did not return a $PASTA swap transaction.");
  }
  return {
    swapTransaction: json.swapTransaction,
    lastValidBlockHeight: json.lastValidBlockHeight,
  };
}
