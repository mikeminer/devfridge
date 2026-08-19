import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from "@solana/spl-token";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type Connection,
} from "@solana/web3.js";
import { parseAmount } from "./fridge";

export const COOKER_DECIMALS = 6;

export function validateMemeFields(name: string, symbol: string) {
  const trimmedName = name.trim();
  const trimmedSymbol = symbol.trim().toUpperCase();
  if (trimmedName.length < 2 || trimmedName.length > 32) {
    throw new Error("Name must be 2–32 characters");
  }
  if (trimmedSymbol.length < 2 || trimmedSymbol.length > 10) {
    throw new Error("Ticker must be 2–10 characters");
  }
  if (!/^[A-Z0-9]+$/.test(trimmedSymbol)) {
    throw new Error("Ticker can only use A–Z and 0–9");
  }
  return { name: trimmedName, symbol: trimmedSymbol };
}

export async function createMemeMintTransaction(
  connection: Connection,
  owner: PublicKey,
  args: { name: string; symbol: string; supply: string }
): Promise<{ tx: Transaction; mint: Keypair; amount: bigint }> {
  const { name, symbol } = validateMemeFields(args.name, args.symbol);
  const amount = parseAmount(args.supply, COOKER_DECIMALS);
  const mint = Keypair.generate();
  const metadata = {
    updateAuthority: owner,
    mint: mint.publicKey,
    name,
    symbol,
    uri: "",
    additionalMetadata: [] as [string, string][],
  };
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const space = mintLen + TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(space);
  const ata = getAssociatedTokenAddressSync(
    mint.publicKey,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: owner,
      newAccountPubkey: mint.publicKey,
      space,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      owner,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      COOKER_DECIMALS,
      owner,
      owner,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint.publicKey,
      updateAuthority: owner,
      mint: mint.publicKey,
      mintAuthority: owner,
      name,
      symbol,
      uri: "",
    }),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      ata,
      owner,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToInstruction(
      mint.publicKey,
      ata,
      owner,
      amount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  return { tx, mint, amount };
}
