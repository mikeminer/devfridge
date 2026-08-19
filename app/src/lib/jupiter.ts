import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction, type AccountMeta } from "@solana/web3.js";
import { PASTA_MINT } from "./constants";

const QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SWAP_IX_URL = "https://lite-api.jup.ag/swap/v1/swap-instructions";

export type JupiterRoute = {
  setup: TransactionInstruction[];
  swapProgram: PublicKey;
  swapAccounts: AccountMeta[];
  swapData: Uint8Array;
  cleanup: TransactionInstruction[];
  minPastaOut: bigint;
  lookupTableAddresses: PublicKey[];
};

type SerializedIx = {
  programId: string;
  accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  data: string;
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

export async function fetchPastaBuybackRoute(
  inputMint: PublicKey,
  amount: bigint,
  burnAuthority: PublicKey,
  maxAccounts = 32
): Promise<JupiterRoute> {
  if (amount <= 0n) throw new Error("Nothing to buy back");
  const quoteUrl =
    `${QUOTE_URL}?inputMint=${inputMint.toBase58()}` +
    `&outputMint=${PASTA_MINT.toBase58()}&amount=${amount.toString()}` +
    `&slippageBps=300&maxAccounts=${maxAccounts}`;
  const quoteRes = await fetch(quoteUrl);
  const quote = (await quoteRes.json().catch(() => ({}))) as {
    outAmount?: string;
    error?: string;
    errorCode?: string;
  };
  if (!quoteRes.ok || !quote.outAmount) {
    throw new Error(
      "No Jupiter route from this token to $PASTA. If it is still on the pump.fun bonding curve, wait until it graduates to PumpSwap, then redeem. Until then the lock stays in the fridge and Take it out cannot run."
    );
  }

  const swapRes = await fetch(SWAP_IX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: burnAuthority.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: false,
    }),
  });
  if (!swapRes.ok) throw new Error("Failed to build the $PASTA buyback swap");
  const swap = (await swapRes.json()) as {
    computeBudgetInstructions?: SerializedIx[];
    setupInstructions?: SerializedIx[];
    swapInstruction?: SerializedIx;
    cleanupInstruction?: SerializedIx;
    addressLookupTableAddresses?: string[];
    error?: string;
  };
  if (!swap.swapInstruction) {
    throw new Error(swap.error || "Jupiter did not return a swap instruction");
  }

  const swapIx = decodeIx(swap.swapInstruction);
  const compute = (swap.computeBudgetInstructions ?? []).map(decodeIx);
  return {
    setup: [...compute, ...(swap.setupInstructions ?? []).map(decodeIx)],
    swapProgram: swapIx.programId,
    swapAccounts: swapIx.keys,
    swapData: new Uint8Array(swapIx.data),
    cleanup: swap.cleanupInstruction ? [decodeIx(swap.cleanupInstruction)] : [],
    minPastaOut: BigInt(quote.outAmount),
    lookupTableAddresses: (swap.addressLookupTableAddresses ?? []).map(
      (addr) => new PublicKey(addr)
    ),
  };
}
