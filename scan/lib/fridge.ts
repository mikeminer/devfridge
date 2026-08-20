import { PublicKey } from "@solana/web3.js";
import { LOCK_ACCOUNT_SIZE, LOCK_DISC, PROGRAM_ID } from "./constants";
import { rpc } from "./rpc";

export type FridgeLock = {
  address: string;
  depositor: string;
  mint: string;
  amount: string;
  createdAt: number;
  unlockAt: number;
  bump: number;
  lockId: string;
};

export type FridgeStatus = {
  status: "fridged" | "expired" | "none" | "unavailable";
  message?: string;
  locks: FridgeLock[];
  activeAmount: string;
  unlockAt: number | null;
  depositor: string | null;
};

function u64(buf: Uint8Array, offset: number): bigint {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getBigUint64(offset, true);
}

function i64(buf: Uint8Array, offset: number): number {
  return Number(u64(buf, offset));
}

export function decodeLock(address: string, data: Uint8Array): FridgeLock | null {
  if (data.length < LOCK_ACCOUNT_SIZE) return null;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== LOCK_DISC[i]) return null;
  }
  return {
    address,
    depositor: new PublicKey(data.slice(8, 40)).toBase58(),
    mint: new PublicKey(data.slice(40, 72)).toBase58(),
    amount: u64(data, 72).toString(),
    createdAt: i64(data, 80),
    unlockAt: i64(data, 88),
    bump: data[96],
    lockId: u64(data, 97).toString(),
  };
}

export async function fridgeForMint(mint: string): Promise<FridgeStatus> {
  try {
    const rows = await rpc<
      Array<{ pubkey: string; account: { data: [string, string] } }>
    >("getProgramAccounts", [
      PROGRAM_ID,
      {
        encoding: "base64",
        commitment: "confirmed",
        filters: [
          { dataSize: LOCK_ACCOUNT_SIZE },
          { memcmp: { offset: 40, bytes: mint } },
        ],
      },
    ]);
    const locks = (rows || [])
      .map((row) => {
        const raw = Uint8Array.from(atob(row.account.data[0]), (c) => c.charCodeAt(0));
        return decodeLock(row.pubkey, raw);
      })
      .filter((x): x is FridgeLock => x != null && x.mint === mint);

    const now = Math.floor(Date.now() / 1000);
    const active = locks.filter((l) => l.unlockAt > now);
    if (active.length > 0) {
      const total = active.reduce((s, l) => s + BigInt(l.amount), 0n);
      const latest = [...active].sort((a, b) => b.unlockAt - a.unlockAt)[0];
      return {
        status: "fridged",
        locks,
        activeAmount: total.toString(),
        unlockAt: latest.unlockAt,
        depositor: latest.depositor,
      };
    }
    if (locks.length > 0) {
      const last = [...locks].sort((a, b) => b.unlockAt - a.unlockAt)[0];
      return {
        status: "expired",
        locks,
        activeAmount: "0",
        unlockAt: last.unlockAt,
        depositor: last.depositor,
      };
    }
    return {
      status: "none",
      locks: [],
      activeAmount: "0",
      unlockAt: null,
      depositor: null,
    };
  } catch (err) {
    return {
      status: "unavailable",
      message: err instanceof Error ? err.message : "Fridge check unavailable — RPC error",
      locks: [],
      activeAmount: "0",
      unlockAt: null,
      depositor: null,
    };
  }
}
