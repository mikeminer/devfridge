import { PublicKey } from "@solana/web3.js";
import { LOCK_ACCOUNT_SIZE, LOCK_DISC, PROGRAM_ID } from "../config.js";
import { rpc } from "./rpc.js";

export type Lock = {
  address: string;
  depositor: string;
  mint: string;
  amount: string;
  createdAt: number;
  unlockAt: number;
};

function u64(buf: Uint8Array, offset: number): bigint {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getBigUint64(offset, true);
}

export function decodeLock(address: string, data: Uint8Array): Lock | null {
  if (data.length < LOCK_ACCOUNT_SIZE) return null;
  for (let i = 0; i < 8; i++) if (data[i] !== LOCK_DISC[i]) return null;
  return {
    address,
    depositor: new PublicKey(data.slice(8, 40)).toBase58(),
    mint: new PublicKey(data.slice(40, 72)).toBase58(),
    amount: u64(data, 72).toString(),
    createdAt: Number(u64(data, 80)),
    unlockAt: Number(u64(data, 88)),
  };
}

export async function listAllLocks(): Promise<Lock[]> {
  const rows = await rpc<Array<{ pubkey: string; account: { data: [string, string] } }>>(
    "getProgramAccounts",
    [
      PROGRAM_ID,
      {
        encoding: "base64",
        commitment: "confirmed",
      },
    ]
  );
  return (rows || [])
    .map((row) => {
      const raw = Uint8Array.from(Buffer.from(row.account.data[0], "base64"));
      return decodeLock(row.pubkey, raw);
    })
    .filter((x): x is Lock => x != null);
}
