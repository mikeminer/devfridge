import { PublicKey } from "@solana/web3.js";
import type { ClusterName } from "./constants";

const KEY = "fridge.known-locks.v2";

export type KnownLock = {
  address: string;
  mint: string;
  lockId: string;
  depositor: string;
  programId: string;
  cluster: ClusterName;
  signature?: string;
};

function readAll(): KnownLock[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownLock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: KnownLock[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(-200)));
}

export function rememberLock(row: KnownLock) {
  const rows = readAll().filter(
    (r) => !(r.address === row.address && r.cluster === row.cluster)
  );
  rows.push(row);
  writeAll(rows);
}

export function forgetLock(address: string, cluster: ClusterName) {
  writeAll(readAll().filter((r) => !(r.address === address && r.cluster === cluster)));
}

export function knownClusterAddresses(
  programId: PublicKey,
  cluster: ClusterName
): PublicKey[] {
  const seen = new Set<string>();
  const keys: PublicKey[] = [];
  for (const row of readAll()) {
    if (row.cluster !== cluster || row.programId !== programId.toBase58()) continue;
    if (seen.has(row.address)) continue;
    seen.add(row.address);
    try {
      keys.push(new PublicKey(row.address));
    } catch {
      /* skip */
    }
  }
  return keys;
}

export function knownLockAddresses(
  depositor: PublicKey,
  programId: PublicKey,
  cluster: ClusterName
): PublicKey[] {
  return readAll()
    .filter(
      (r) =>
        r.cluster === cluster &&
        r.depositor === depositor.toBase58() &&
        r.programId === programId.toBase58()
    )
    .map((r) => new PublicKey(r.address));
}

export function knownLockSignature(address: string, cluster: ClusterName): string | null {
  return (
    readAll().find((r) => r.address === address && r.cluster === cluster)?.signature ??
    null
  );
}

export function rememberLockSignature(
  address: string,
  cluster: ClusterName,
  signature: string
) {
  const rows = readAll();
  const hit = rows.find((r) => r.address === address && r.cluster === cluster);
  if (hit) {
    hit.signature = signature;
    writeAll(rows);
  }
}

export function knownLockIds(
  depositor: PublicKey,
  mint: PublicKey,
  programId: PublicKey,
  cluster: ClusterName
): bigint[] {
  return readAll()
    .filter(
      (r) =>
        r.cluster === cluster &&
        r.depositor === depositor.toBase58() &&
        r.mint === mint.toBase58() &&
        r.programId === programId.toBase58()
    )
    .map((r) => BigInt(r.lockId));
}


