import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { FridgeStatus } from "./fridge";
import type { SecurityCheck } from "./scan";

type Rpc = <T>(method: string, params: unknown[]) => Promise<T>;
type Pool = { address: string; baseMint: string; baseVault: string; observedSlot: number };
type Row = { pubkey: string; account: { owner: string; executable: boolean; data: [string, string] } };
type Snapshot = { context: { slot: number }; value: Row[] };
type Input = {
  mint: string; supply: bigint; tokenProgram: string; fridgeProgram: string;
  fridge: FridgeStatus; pool: Pool | null; poolAvailable: boolean; now: number;
};
type OwnerBalance = { owner: string; outside: bigint; locked: bigint; claimable: bigint };

export type HolderDistribution = {
  status: "complete"; observedSlot: number; supplyRaw: string; accountCount: number; ownerCount: number;
  top10Pct: number; outsideFridgeTop10Pct: number; poolPct: number; fridgePct: number; timeLockedPct: number;
  excludedPools: { address: string; vault: string; balanceRaw: string }[];
  topOwners: { owner: string; totalRaw: string; outsideFridgeRaw: string; timeLockedRaw: string; claimableRaw: string }[];
} | { status: "unavailable"; reason: string };

/** Full account enumeration, reconciled to mint supply; never extrapolate from the largest 20. */
export function aggregateHolders(snapshot: Snapshot, input: Input): HolderDistribution {
  const { mint, supply, tokenProgram, fridgeProgram, fridge, pool, now } = input;
  if (supply <= 0n || !input.poolAvailable || fridge.status === "unavailable") throw new Error("Missing classification data");
  if (!Number.isSafeInteger(snapshot?.context?.slot) || snapshot.context.slot <= 0 ||
      !Array.isArray(snapshot.value) || snapshot.value.length > 100_000 ||
      (pool && (pool.baseMint !== mint || snapshot.context.slot < pool.observedSlot))) throw new Error("Invalid snapshot");
  const program = new PublicKey(tokenProgram), mintKey = new PublicKey(mint);
  const vaults = new Map<string, { owner: string; lock: string; unlockAt: number }>();
  for (const lock of fridge.locks) {
    const id = Buffer.alloc(8); id.writeBigUInt64LE(BigInt(lock.lockId));
    const depositor = new PublicKey(lock.depositor);
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), depositor.toBuffer(), mintKey.toBuffer(), id], new PublicKey(fridgeProgram));
    if (lock.mint !== mint || pda.toBase58() !== lock.address || bump !== lock.bump ||
        !Number.isSafeInteger(lock.unlockAt)) throw new Error("Invalid Fridge binding");
    const vault = getAssociatedTokenAddressSync(mintKey, pda, true, program).toBase58();
    if (vaults.has(vault)) throw new Error("Duplicate Fridge vault");
    vaults.set(vault, { owner: lock.depositor, lock: lock.address, unlockAt: lock.unlockAt });
  }
  const seen = new Set<string>(), owners = new Map<string, OwnerBalance>();
  let total = 0n, poolAmount = 0n, locked = 0n, claimable = 0n;
  for (const row of snapshot.value) {
    new PublicKey(row.pubkey);
    const data = Buffer.from(row.account.data[0], "base64");
    if (seen.has(row.pubkey) || row.account.owner !== tokenProgram || row.account.executable ||
        row.account.data[1] !== "base64" || data.length !== 165 ||
        !new PublicKey(data.subarray(0, 32)).equals(mintKey) || ![1, 2].includes(data[108])) throw new Error("Invalid token account");
    seen.add(row.pubkey);
    const amount = data.readBigUInt64LE(64), accountOwner = new PublicKey(data.subarray(32, 64)).toBase58();
    total += amount;
    if (pool && row.pubkey === pool.baseVault) {
      if (accountOwner !== pool.address) throw new Error("Invalid pool binding");
      poolAmount += amount;
      continue;
    }
    const vault = vaults.get(row.pubkey);
    if (vault && accountOwner !== vault.lock) throw new Error("Invalid vault owner");
    if (amount === 0n) continue;
    const owner = vault?.owner ?? accountOwner;
    const balance = owners.get(owner) ?? { owner, outside: 0n, locked: 0n, claimable: 0n };
    if (!vault) balance.outside += amount;
    else if (vault.unlockAt > now) { balance.locked += amount; locked += amount; }
    else { balance.claimable += amount; claimable += amount; }
    owners.set(owner, balance);
  }
  // Missing rows, transfer-fee withholding or supply changes must not produce a false low grade.
  if (total !== supply || (pool && !seen.has(pool.baseVault))) throw new Error("Supply reconciliation failed");
  const sum = (o: OwnerBalance) => o.outside + o.locked + o.claimable;
  const ranked = [...owners.values()].sort((a, b) => sum(a) > sum(b) ? -1 : sum(a) < sum(b) ? 1 : a.owner.localeCompare(b.owner));
  const outside = [...owners.values()].map(o => o.outside).sort((a, b) => a > b ? -1 : a < b ? 1 : 0);
  const pct = (n: bigint) => Number(n * 1_000_000n / supply) / 10_000;
  return {
    status: "complete", observedSlot: snapshot.context.slot, supplyRaw: supply.toString(),
    accountCount: seen.size, ownerCount: owners.size,
    top10Pct: pct(ranked.slice(0, 10).reduce((s, o) => s + sum(o), 0n)),
    outsideFridgeTop10Pct: pct(outside.slice(0, 10).reduce((s, n) => s + n, 0n)),
    poolPct: pct(poolAmount), fridgePct: pct(locked + claimable), timeLockedPct: pct(locked),
    excludedPools: pool ? [{ address: pool.address, vault: pool.baseVault, balanceRaw: poolAmount.toString() }] : [],
    topOwners: ranked.slice(0, 10).map(o => ({ owner: o.owner, totalRaw: sum(o).toString(),
      outsideFridgeRaw: o.outside.toString(), timeLockedRaw: o.locked.toString(), claimableRaw: o.claimable.toString() })),
  };
}

export async function collectHolderDistribution(rpc: Rpc, input: Input): Promise<HolderDistribution> {
  try {
    if (!input.poolAvailable || input.fridge.status === "unavailable") throw new Error("Classification unavailable");
    const snapshot = await rpc<Snapshot>("getProgramAccounts", [input.tokenProgram, {
      encoding: "base64", commitment: "confirmed", withContext: true,
      ...(input.pool ? { minContextSlot: input.pool.observedSlot } : {}),
      dataSlice: { offset: 0, length: 165 }, filters: [{ memcmp: { offset: 0, bytes: input.mint } }],
    }]);
    return aggregateHolders(snapshot, input);
  } catch {
    return { status: "unavailable", reason: "Complete account balances or protocol classifications could not be verified against mint supply. No estimate from the largest accounts is used." };
  }
}

export function holderConcentrationCheck(result: HolderDistribution): SecurityCheck {
  if (result.status !== "complete") return { id: "top10", label: "Top 10 owners %", level: "unknown", amount: "n/a", detail: result.reason };
  const p = (n: number) => n.toFixed(1) + "%";
  return { id: "top10", label: "Top 10 owners %",
    level: result.top10Pct > 70 ? "danger" : result.top10Pct > 40 ? "caution" : "safe",
    amount: p(result.top10Pct),
    detail: `Top 10 owners hold ${p(result.top10Pct)} of total supply, including Fridge balances attributed to depositors. Top 10 outside Fridge: ${p(result.outsideFridgeTop10Pct)}. All Fridge vaults: ${p(result.fridgePct)} (${p(result.timeLockedPct)} time-locked). Verified PumpSwap reserves excluded: ${p(result.poolPct)}. All percentages use total mint supply. Accounts are grouped by on-chain owner, not by person; other protocol reserves may remain included.`,
  };
}
