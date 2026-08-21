import { PublicKey, TransactionInstruction, type AccountMeta } from "@solana/web3.js";
import { PASTA_MINT } from "./constants";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUPITER_HOSTS = ["https://lite-api.jup.ag/swap/v1", "https://api.jup.ag/swap/v1"];
const SWAP_URL = `${JUPITER_HOSTS[0]}/swap`;

export type JupiterQuote = {
  outAmount: string;
  otherAmountThreshold: string;
  raw: unknown;
  host: string;
};

function quoteQueries(lamports: number, maxAccounts: number): string[] {
  const base =
    `inputMint=${SOL_MINT}&outputMint=${PASTA_MINT}&amount=${lamports}` +
    `&swapMode=ExactIn&maxAccounts=${maxAccounts}`;
  return [
    `${base}&slippageBps=150&onlyDirectRoutes=true&dexes=${encodeURIComponent("Pump.fun Amm")}`,
    `${base}&slippageBps=200&onlyDirectRoutes=true`,
    `${base}&slippageBps=200`,
  ];
}

export async function quoteSolToPasta(lamports: number, maxAccounts = 32): Promise<JupiterQuote> {
  let last = "No Jupiter route to buy $PASTA with SOL.";
  for (const host of JUPITER_HOSTS) {
    for (const query of quoteQueries(lamports, maxAccounts)) {
      try {
        const res = await fetch(`${host}/quote?${query}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        const json = (await res.json().catch(() => ({}))) as {
          outAmount?: string;
          otherAmountThreshold?: string;
          error?: string;
        };
        if (res.ok && json.outAmount) {
          return {
            outAmount: json.outAmount,
            otherAmountThreshold: json.otherAmountThreshold || json.outAmount,
            raw: json,
            host,
          };
        }
        last = json.error || last;
      } catch (err) {
        last = err instanceof Error ? err.message : last;
      }
    }
  }
  throw new Error(last);
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
  const res = await fetch(`${quote.host}/swap-instructions`, {
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
