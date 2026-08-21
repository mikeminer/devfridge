import { PublicKey, TransactionInstruction, type AccountMeta } from "@solana/web3.js";
import { PASTA_MINT } from "./constants";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SWAP_URL = "https://lite-api.jup.ag/swap/v1/swap";

export type JupiterQuote = {
  outAmount: string;
  otherAmountThreshold: string;
  raw: unknown;
};

export async function quoteSolToPasta(lamports: number, maxAccounts = 32): Promise<JupiterQuote> {
  const url =
    `${QUOTE_URL}?inputMint=${SOL_MINT}` +
    `&outputMint=${PASTA_MINT}&amount=${lamports}` +
    `&slippageBps=150&swapMode=ExactIn&maxAccounts=${maxAccounts}`;
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

const SWAP_IX_URL = "https://lite-api.jup.ag/swap/v1/swap-instructions";

type SerializedIx = {
  programId: string;
  accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  data: string;
};

export type JupiterRoute = {
  compute: TransactionInstruction[];
  swapProgram: PublicKey;
  swapAccounts: AccountMeta[];
  swapData: Uint8Array;
  minPastaOut: bigint;
  lookupTableAddresses: PublicKey[];
};

function decodeIx(raw: SerializedIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

/** Jupiter CPI route for the Fridge burn PDA — wrapAndUnwrapSol false; the program wraps SOL. */
export async function fetchPastaBuybackRoute(
  inputMint: string,
  amount: bigint,
  burnAuthority: string,
  maxAccounts = 32
): Promise<JupiterRoute> {
  const quote = await quoteSolToPasta(Number(amount), maxAccounts);
  const res = await fetch(SWAP_IX_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      quoteResponse: quote.raw,
      userPublicKey: burnAuthority,
      wrapAndUnwrapSol: false,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: false,
    }),
  });
  const swap = (await res.json().catch(() => ({}))) as {
    computeBudgetInstructions?: SerializedIx[];
    swapInstruction?: SerializedIx;
    addressLookupTableAddresses?: string[];
    error?: string;
  };
  if (!res.ok || !swap.swapInstruction) {
    throw new Error(swap.error || "Jupiter did not return a $PASTA buy instruction.");
  }
  const swapIx = decodeIx(swap.swapInstruction);
  void inputMint;
  void maxAccounts;
  return {
    compute: (swap.computeBudgetInstructions ?? []).map(decodeIx),
    swapProgram: swapIx.programId,
    swapAccounts: swapIx.keys,
    swapData: new Uint8Array(swapIx.data),
    minPastaOut: BigInt(quote.otherAmountThreshold),
    lookupTableAddresses: (swap.addressLookupTableAddresses ?? []).map((a) => new PublicKey(a)),
  };
}
