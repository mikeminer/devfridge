import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { FridgeStatus } from "./fridge";
import type { SecurityCheck } from "./scan";
import { collectProtocolReserves, type ReserveCoverage, type Reserve } from "./protocol-reserves";

type Rpc = <T>(method: string, params: unknown[]) => Promise<T>;
type Row = { pubkey: string; account: { owner: string; executable: boolean; data: [string, string] } };
type Snapshot = { context: { slot: number }; value: Row[] };
type Input = {
  mint: string; supply: bigint; tokenProgram: string; fridgeProgram: string;
  fridge: FridgeStatus; now: number; supplySlot?: number;
};
type OwnerBalance = { owner: string; outside: bigint; locked: bigint; claimable: bigint; uncertain: bigint };

export type HolderDistribution = {
  status: "complete"; observedSlot: number; supplyObservedSlot: number; supplyRaw: string; accountCount: number; ownerCount: number;
  top10Pct: number; outsideFridgeTop10Pct: number; poolPct: number; fridgePct: number; timeLockedPct: number;
  unclassifiedCustody: { address: string; authority: string; balanceRaw: string }[];
  unclassifiedCustodyPct: number; top10WithoutUnclassifiedCustodyPct: number;
  classificationSlot: number; pumpStage: ReserveCoverage["pumpStage"]; protocolReservePct: number; bondingCurvePct: number;
  excludedReserves: (Reserve & { balanceRaw: string })[];
  excludedPools: { address: string; vault: string; balanceRaw: string }[];
  topOwners: { owner: string; totalRaw: string; outsideFridgeRaw: string; timeLockedRaw: string; claimableRaw: string }[];
} | { status: "unavailable"; reason: string };

/** Full account enumeration, reconciled to mint supply; never extrapolate from the largest 20. */
export function aggregateHolders(snapshot: Snapshot, input: Input, coverage: ReserveCoverage): HolderDistribution {
  const { mint, supply, tokenProgram, fridgeProgram, fridge, now } = input;
  if (supply <= 0n || fridge.status === "unavailable") throw new Error("Missing classification data");
  if (!Number.isSafeInteger(snapshot?.context?.slot) || snapshot.context.slot <= 0 ||
      !Array.isArray(snapshot.value) || !Number.isSafeInteger(coverage.classificationSlot) || coverage.classificationSlot < snapshot.context.slot) throw new Error("Invalid snapshot");
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
  const reserves = new Map<string, Reserve>();
  for (const reserve of coverage.reserves) {
    if (reserve.mint !== mint || reserves.has(reserve.vault) || vaults.has(reserve.vault)) throw new Error("Invalid reserve classification");
    reserves.set(reserve.vault, reserve);
  }
  const uncertainAccounts = new Set(coverage.unclassifiedCustody ?? []);
  let uncertain = 0n;
  const custody: { address: string; authority: string; balanceRaw: string }[] = [];
  const balances = new Map<string, bigint>();
  const seen = new Set<string>(), owners = new Map<string, OwnerBalance>();
  let total = 0n, poolAmount = 0n, curveAmount = 0n, locked = 0n, claimable = 0n;
  for (const row of snapshot.value) {
    new PublicKey(row.pubkey);
    const data = Buffer.from(row.account.data[0], "base64");
    if (seen.has(row.pubkey) || row.account.owner !== tokenProgram || row.account.executable ||
        row.account.data[1] !== "base64" || ![109, 165].includes(data.length) ||
        !new PublicKey(data.subarray(0, 32)).equals(mintKey) || ![1, 2].includes(data[108])) throw new Error("Invalid token account");
    seen.add(row.pubkey);
    const amount = data.readBigUInt64LE(64), accountOwner = new PublicKey(data.subarray(32, 64)).toBase58();
    total += amount;
    const reserve = reserves.get(row.pubkey);
    if (reserve) {
      if (accountOwner !== reserve.authority) throw new Error("Invalid reserve binding");
      balances.set(row.pubkey, amount);
      if (reserve.protocol === "pump_curve") curveAmount += amount;
      else poolAmount += amount;
      continue;
    }
    const vault = vaults.get(row.pubkey);
    if (vault && accountOwner !== vault.lock) throw new Error("Invalid vault owner");
    if (amount === 0n) continue;
    const owner = vault?.owner ?? accountOwner;
    const balance = owners.get(owner) ?? { owner, outside: 0n, locked: 0n, claimable: 0n, uncertain: 0n };
    if (uncertainAccounts.has(row.pubkey)) { balance.uncertain += amount; uncertain += amount; custody.push({ address: row.pubkey, authority: accountOwner, balanceRaw: amount.toString() }); }
    if (!vault) balance.outside += amount;
    else if (vault.unlockAt > now) { balance.locked += amount; locked += amount; }
    else { balance.claimable += amount; claimable += amount; }
    owners.set(owner, balance);
  }
  // Missing rows, transfer-fee withholding or supply changes must not produce a false low grade.
  if (total !== supply || [...reserves.keys()].some(vault => !seen.has(vault))) throw new Error("Supply reconciliation failed");
  const sum = (o: OwnerBalance) => o.outside + o.locked + o.claimable;
  const ranked = [...owners.values()].sort((a, b) => sum(a) > sum(b) ? -1 : sum(a) < sum(b) ? 1 : a.owner.localeCompare(b.owner));
  const outside = [...owners.values()].map(o => o.outside).sort((a, b) => a > b ? -1 : a < b ? 1 : 0);
  const certain = ranked.map(o => sum(o) - o.uncertain).sort((a, b) => a > b ? -1 : a < b ? 1 : 0);
  const pct = (n: bigint) => Number(n * 1_000_000n / supply) / 10_000;
  return {
    status: "complete", observedSlot: snapshot.context.slot, supplyObservedSlot: input.supplySlot ?? snapshot.context.slot, supplyRaw: supply.toString(),
    accountCount: seen.size, ownerCount: owners.size,
    top10Pct: pct(ranked.slice(0, 10).reduce((s, o) => s + sum(o), 0n)),
    outsideFridgeTop10Pct: pct(outside.slice(0, 10).reduce((s, n) => s + n, 0n)),
    poolPct: pct(poolAmount), fridgePct: pct(locked + claimable), timeLockedPct: pct(locked),
    unclassifiedCustody: custody, unclassifiedCustodyPct: pct(uncertain), top10WithoutUnclassifiedCustodyPct: pct(certain.slice(0, 10).reduce((s, n) => s + n, 0n)),
    classificationSlot: coverage.classificationSlot, pumpStage: coverage.pumpStage,
    protocolReservePct: pct(poolAmount + curveAmount), bondingCurvePct: pct(curveAmount),
    excludedReserves: coverage.reserves.map(r => ({ ...r, balanceRaw: balances.get(r.vault)!.toString() })),
    excludedPools: coverage.reserves.filter(r => r.protocol !== "pump_curve").map(r => ({ address: r.address, vault: r.vault, balanceRaw: balances.get(r.vault)!.toString() })),
    topOwners: ranked.slice(0, 10).map(o => ({ owner: o.owner, totalRaw: sum(o).toString(),
      outsideFridgeRaw: o.outside.toString(), timeLockedRaw: o.locked.toString(), claimableRaw: o.claimable.toString() })),
  };
}

export async function collectHolderDistribution(rpc: Rpc, input: Input, classify = collectProtocolReserves): Promise<HolderDistribution> {
  try {
    if (input.fridge.status === "unavailable") throw new Error("Classification unavailable");
    const snapshot = await rpc<Snapshot>("getProgramAccounts", [input.tokenProgram, {
      encoding: "base64", commitment: "confirmed", withContext: true,
      dataSlice: { offset: 0, length: 109 }, filters: [{ memcmp: { offset: 0, bytes: input.mint } }],
    }]);
    const [coverage, mint] = await Promise.all([
      classify(rpc, snapshot, input.mint, input.tokenProgram, input.fridge.locks.map(l => l.address)),
      rpc<{ context: { slot: number }; value: Row["account"] | null }>("getAccountInfo", [input.mint, {
        encoding: "base64", commitment: "confirmed", minContextSlot: snapshot.context.slot, dataSlice: { offset: 0, length: 82 },
      }]),
    ]);
    if (!mint.value || mint.value.owner !== input.tokenProgram || mint.value.executable || mint.value.data[1] !== "base64" ||
        !Number.isSafeInteger(mint.context.slot) || mint.context.slot < snapshot.context.slot) throw new Error("Invalid mint observation");
    const data = Buffer.from(mint.value.data[0], "base64");
    if (data.length !== 82 || data[45] !== 1) throw new Error("Invalid initialized mint");
    return aggregateHolders(snapshot, { ...input, supply: data.readBigUInt64LE(36), supplySlot: mint.context.slot }, coverage);
  } catch {
    return { status: "unavailable", reason: "Complete account balances or protocol classifications could not be verified against mint supply. No estimate from the largest accounts is used." };
  }
}

export function holderConcentrationCheck(result: HolderDistribution): SecurityCheck {
  if (result.status !== "complete") return { id: "top10", label: "Top 10 owners %", level: "unknown", amount: "n/a", detail: result.reason };
  const p = (n: number) => n.toFixed(1) + "%";
  const level = (n: number) => n > 70 ? "danger" : n > 40 ? "caution" : "safe";
  const ambiguous = level(result.top10Pct) !== level(result.top10WithoutUnclassifiedCustodyPct);
  return { id: "top10", label: "Top 10 owners %",
    level: ambiguous ? "unknown" : level(result.top10Pct),
    amount: p(result.top10Pct),
    detail: `Top 10 owners hold ${p(result.top10Pct)} of total supply, including Fridge balances attributed to depositors. Top 10 outside Fridge: ${p(result.outsideFridgeTop10Pct)}. All Fridge vaults: ${p(result.fridgePct)} (${p(result.timeLockedPct)} time-locked). Verified protocol reserves excluded: ${p(result.protocolReservePct)} (bonding curve ${p(result.bondingCurvePct)}, pools ${p(result.poolPct)}). All percentages use total mint supply. Accounts are grouped by on-chain owner, not by person; unrecognized protocols and custodial accounts may remain included. Reserve classification does not prove LP tokens are burned or locked.${result.unclassifiedCustody.length > 0 ? ` Unmapped Raydium custody remains included: ${p(result.unclassifiedCustodyPct)}.${ambiguous ? " Its classification could change the grade, so the grade is unknown." : ""}` : ""}`,
  };
}
