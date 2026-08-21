import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { PASTA_MINT } from "./constants";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SWAP_IX_URL = "https://lite-api.jup.ag/swap/v1/swap-instructions";

type SerializedIx = {
  programId: string;
  accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  data: string;
};

export type JupiterQuote = {
  outAmount: string;
  otherAmountThreshold: string;
  raw: unknown;
};

export type JupiterSwapIxs = {
  compute: TransactionInstruction[];
  setup: TransactionInstruction[];
  swap: TransactionInstruction;
  cleanup: TransactionInstruction[];
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

export async function pastaBuyInstructions(args: {
  quote: JupiterQuote;
  payer: string;
  destinationTokenAccount: string;
}): Promise<JupiterSwapIxs> {
  const res = await fetch(SWAP_IX_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      quoteResponse: args.quote.raw,
      userPublicKey: args.payer,
      destinationTokenAccount: args.destinationTokenAccount,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: false,
    }),
  });
  const swap = (await res.json().catch(() => ({}))) as {
    computeBudgetInstructions?: SerializedIx[];
    setupInstructions?: SerializedIx[];
    swapInstruction?: SerializedIx;
    cleanupInstruction?: SerializedIx;
    addressLookupTableAddresses?: string[];
    error?: string;
  };
  if (!res.ok || !swap.swapInstruction) {
    throw new Error(swap.error || "Jupiter did not return a $PASTA buy instruction.");
  }
  return {
    compute: (swap.computeBudgetInstructions ?? []).map(decodeIx),
    setup: (swap.setupInstructions ?? []).map(decodeIx),
    swap: decodeIx(swap.swapInstruction),
    cleanup: swap.cleanupInstruction ? [decodeIx(swap.cleanupInstruction)] : [],
    lookupTableAddresses: (swap.addressLookupTableAddresses ?? []).map((a) => new PublicKey(a)),
  };
}
