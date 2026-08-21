import { PublicKey } from "@solana/web3.js";
import { LOCK_ACCOUNT_SIZE, LOCK_DISC, PROGRAM_ID } from "./constants";
import { rpcRace } from "./rpc";

const fridgeMemo = new Map<string, { at: number; value: FridgeStatus }>();
const FRIDGE_TTL_MS = 30_000;

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

/** True while at least one lock account still exists (even if unlock time passed). */
export function hasOpenVault(fridge: FridgeStatus): boolean {
  return fridge.locks.length > 0;
}

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
  const hit = fridgeMemo.get(mint);
  if (hit && Date.now() - hit.at < FRIDGE_TTL_MS) return hit.value;
  try {
    const rows = await rpcRace<
      Array<{ pubkey: string; account: { data: [string, string] } }>
    >("getProgramAccounts", [
      PROGRAM_ID,
      {
        encoding: "base64",
        commitment: "confirmed",
        filters: [{ memcmp: { offset: 40, bytes: mint } }],
      },
    ]);
    const locks = (rows || [])
      .map((row) => {
        const raw = Uint8Array.from(Buffer.from(row.account.data[0], "base64"));
        return decodeLock(row.pubkey, raw);
      })
      .filter((x): x is FridgeLock => x != null && x.mint === mint);

    const now = Math.floor(Date.now() / 1000);
    const active = locks.filter((l) => l.unlockAt > now).sort((a, b) => b.unlockAt - a.unlockAt);
    const expired = locks.filter((l) => l.unlockAt <= now).sort((a, b) => b.unlockAt - a.unlockAt);
    const sum = (rows: FridgeLock[]) => rows.reduce((s, l) => s + BigInt(l.amount), 0n).toString();
    const ordered = [...active, ...expired];
    let value: FridgeStatus;
    if (active.length > 0) {
      value = {
        status: "fridged",
        locks: ordered,
        activeAmount: sum(active),
        unlockAt: active[0].unlockAt,
        depositor: active[0].depositor,
      };
    } else if (locks.length > 0) {
      const last = expired[0];
      value = {
        status: "expired",
        locks: ordered,
        activeAmount: sum(locks),
        unlockAt: last.unlockAt,
        depositor: last.depositor,
      };
    } else {
      value = {
        status: "none",
        locks: [],
        activeAmount: "0",
        unlockAt: null,
        depositor: null,
      };
    }
    fridgeMemo.set(mint, { at: Date.now(), value });
    return value;
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
