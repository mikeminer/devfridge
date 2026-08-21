const fs = require("fs");
const zlib = require("zlib");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6");
const RPC = "https://api.testnet.solana.com";
const IDL_IX_TAG = Buffer.from([0x40, 0xf4, 0xbc, 0x78, 0xa7, 0xe9, 0x69, 0x0a]); // 0x0a69e9a778bcf440 LE
const WRITE_SIZE = 600;

async function idlAddress(programId) {
  const [base] = PublicKey.findProgramAddressSync([], programId);
  return PublicKey.createWithSeed(base, "anchor:idl", programId);
}

function encodeCreate(dataLen) {
  const data = Buffer.alloc(8 + 1 + 8);
  IDL_IX_TAG.copy(data, 0);
  data.writeUInt8(0, 8); // Create
  data.writeBigUInt64LE(BigInt(dataLen), 9);
  return data;
}

function encodeWrite(chunk) {
  const data = Buffer.alloc(8 + 1 + 4 + chunk.length);
  IDL_IX_TAG.copy(data, 0);
  data.writeUInt8(2, 8); // Write
  data.writeUInt32LE(chunk.length, 9);
  chunk.copy(data, 13);
  return data;
}

async function sendIx(connection, payer, ixs) {
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    ...ixs
  );
  tx.feePayer = payer.publicKey;
  for (let i = 0; i < 12; i++) {
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "confirmed",
        skipPreflight: true,
        maxRetries: 8,
      });
      return sig;
    } catch (err) {
      console.log("retry", i, err.message);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error("send failed after retries");
}

async function main() {
  const secret = JSON.parse(
    fs.readFileSync(require("os").homedir() + "/.config/solana/id.json", "utf8")
  );
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(RPC, "confirmed");
  const idl = JSON.parse(fs.readFileSync("target/idl/fridge.json", "utf8"));
  const compressed = zlib.deflateSync(Buffer.from(JSON.stringify(idl)));
  const addr = await idlAddress(PROGRAM_ID);
  const [programSigner] = PublicKey.findProgramAddressSync([], PROGRAM_ID);
  console.log("payer", payer.publicKey.toBase58());
  console.log("idl", addr.toBase58());
  console.log("compressed", compressed.length);

  const existing = await connection.getAccountInfo(addr);
  if (!existing) {
    const dataLen = Math.min(compressed.length * 2, 60000 - 44);
    const createIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: addr, isSigner: false, isWritable: true },
        { pubkey: programSigner, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: encodeCreate(dataLen),
    });
    const sig = await sendIx(connection, payer, [createIx]);
    console.log("created", sig);
  } else {
    console.log("idl account already exists, writing over it");
  }

  for (let offset = 0; offset < compressed.length; offset += WRITE_SIZE) {
    const chunk = compressed.subarray(offset, offset + WRITE_SIZE);
    const writeIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: addr, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      ],
      data: encodeWrite(chunk),
    });
    const sig = await sendIx(connection, payer, [writeIx]);
    console.log("wrote", offset, "+", chunk.length, sig);
  }

  const info = await connection.getAccountInfo(addr);
  console.log("final owner", info && info.owner.toBase58(), "len", info && info.data.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
