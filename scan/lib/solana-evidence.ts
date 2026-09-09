import { PublicKey, type AccountInfo } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync,
  unpackAccount, unpackMint, getExtensionTypes, getExtensionData,
  getMetadataPointerState, ExtensionType, type Mint,
} from "@solana/spl-token";

// Versioned account layouts, not a token allowlist. Amounts stay integer strings.
export const FRIDGE_PROGRAM = new PublicKey("9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6");
export const PUMP_AMM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const PUMP = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
const LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const CLOCK = "SysvarC1ock11111111111111111111111111111111";
const LOCK_DISC = Buffer.from([8, 255, 36, 202, 210, 22, 57, 137]);
const POOL_DISC = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]);

export type RawAccount = { owner: string; executable: boolean; lamports: number; data: [string, string] };
export type EvidenceRpc = <T>(method: string, params: unknown[]) => Promise<T>;
type Snapshot = { context: { slot: number }; value: Array<RawAccount | null> };

export function accountInfo(raw: RawAccount): AccountInfo<Buffer> {
  if (!Array.isArray(raw.data) || raw.data[1] !== "base64") throw new Error("Expected base64 account data");
  return { ...raw, owner: new PublicKey(raw.owner), data: Buffer.from(raw.data[0], "base64") };
}

function required(raw: RawAccount | null | undefined, label: string): RawAccount {
  if (!raw) throw new Error(`${label} account unavailable`);
  return raw;
}

export function decodeVerifiedLock(address: string, raw: RawAccount) {
  const acc = accountInfo(raw);
  const d = acc.data;
  if (acc.executable || !acc.owner.equals(FRIDGE_PROGRAM) || d.length !== 105 || !d.subarray(0, 8).equals(LOCK_DISC)) {
    throw new Error("Not a supported DevFridge Lock account");
  }
  const depositor = new PublicKey(d.subarray(8, 40));
  const mint = new PublicKey(d.subarray(40, 72));
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lock"), depositor.toBuffer(), mint.toBuffer(), d.subarray(97, 105)], FRIDGE_PROGRAM,
  );
  if (pda.toBase58() !== address || d[96] !== bump) throw new Error("Lock PDA binding mismatch");
  const createdAt = Number(d.readBigInt64LE(80));
  const unlockAt = Number(d.readBigInt64LE(88));
  if (!Number.isSafeInteger(createdAt) || !Number.isSafeInteger(unlockAt) || createdAt < 0 || unlockAt <= createdAt) {
    throw new Error("Invalid lock timestamps");
  }
  return {
    address, depositor: depositor.toBase58(), mint: mint.toBase58(),
    recordedAmountRaw: d.readBigUInt64LE(72).toString(), createdAt, unlockAt,
    lockId: d.readBigUInt64LE(97).toString(),
    vault: getAssociatedTokenAddressSync(mint, pda, true, TOKEN_2022_PROGRAM_ID).toBase58(),
  };
}

export function token2022Metadata(mint: Mint): { state: "immutable" | "mutable" | "unknown"; detail: string } {
  const pointer = getMetadataPointerState(mint);
  if (!pointer) return { state: "unknown", detail: "No supported metadata pointer." };
  if (pointer.authority) return { state: "mutable", detail: "Metadata pointer authority is active." };
  if (!pointer.metadataAddress?.equals(mint.address)) return { state: "unknown", detail: "External metadata target has not been verified." };
  const data = getExtensionData(ExtensionType.TokenMetadata, mint.tlvData);
  if (!data || data.length < 64 || !new PublicKey(data.subarray(32, 64)).equals(mint.address)) {
    return { state: "unknown", detail: "Token metadata is missing or has an invalid mint binding." };
  }
  if (!data.subarray(0, 32).equals(Buffer.alloc(32))) return { state: "mutable", detail: "Token metadata update authority is active." };
  return { state: "immutable", detail: "On-chain metadata pointer and update authorities are revoked. Content hosted at the metadata URI may still change." };
}

function programDataAddress(raw: RawAccount): string {
  const acc = accountInfo(raw);
  if (!acc.executable || !acc.owner.equals(LOADER) || acc.data.length !== 36 || acc.data.readUInt32LE(0) !== 2) {
    throw new Error("Unsupported Fridge program loader");
  }
  return new PublicKey(acc.data.subarray(4, 36)).toBase58();
}

export function upgradeAuthority(raw: RawAccount): string | null {
  const acc = accountInfo(raw);
  if (acc.executable || !acc.owner.equals(LOADER) || acc.data.length < 45 || acc.data.readUInt32LE(0) !== 3) {
    throw new Error("Invalid ProgramData account");
  }
  if (acc.data[12] === 0) return null;
  if (acc.data[12] !== 1) throw new Error("Invalid upgrade authority option");
  return new PublicKey(acc.data.subarray(13, 45)).toBase58();
}

/** Pure validation of one atomic getMultipleAccounts snapshot, including the chain clock. */
export function verifyLockSnapshot(address: string, keys: string[], snapshot: Snapshot) {
  if (!Number.isSafeInteger(snapshot.context.slot) || snapshot.context.slot < 0 || keys.length !== snapshot.value.length) throw new Error("Invalid snapshot");
  const at = (key: string) => required(snapshot.value[keys.indexOf(key)], key);
  const lock = decodeVerifiedLock(address, at(address));
  const mint = unpackMint(new PublicKey(lock.mint), accountInfo(at(lock.mint)), TOKEN_2022_PROGRAM_ID);
  const vault = unpackAccount(new PublicKey(lock.vault), accountInfo(at(lock.vault)), TOKEN_2022_PROGRAM_ID);
  if (!mint.isInitialized || !vault.isInitialized || !vault.mint.equals(mint.address) || vault.owner.toBase58() !== address) throw new Error("Vault/mint binding mismatch");
  const clockRaw = accountInfo(at(CLOCK));
  if (clockRaw.owner.toBase58() !== "Sysvar1111111111111111111111111111111111111" || clockRaw.data.length !== 40) throw new Error("Invalid chain clock");
  const chainTime = Number(clockRaw.data.readBigInt64LE(32));
  if (!Number.isSafeInteger(chainTime) || chainTime < lock.createdAt) throw new Error("Invalid chain time");
  const admin = upgradeAuthority(at(programDataAddress(at(FRIDGE_PROGRAM.toBase58()))));
  const extensions = getExtensionTypes(mint.tlvData);
  const caveats = ["Account-state verification is not an audit or proof that deployed bytecode matches published source."];
  if (admin) caveats.push("Program is upgradeable; the upgrade authority can change program behavior.");
  if (vault.isFrozen || mint.freezeAuthority) caveats.push("Frozen account or active freeze authority can restrict transfers.");
  if (vault.delegate || vault.closeAuthority) caveats.push("Vault has a delegate or close authority; review these controls.");
  if (extensions.some(t => ![ExtensionType.MetadataPointer, ExtensionType.TokenMetadata].includes(t))) caveats.push("Additional Token-2022 extensions require separate transfer/burn/control analysis.");
  if (vault.amount.toString() !== lock.recordedAmountRaw) caveats.push("Current vault balance differs from the amount recorded when the lock was created.");
  return {
    schemaVersion: "1.0", classification: "devfridge_timelock", ...lock,
    state: chainTime < lock.unlockAt ? "active" : "expired_unclaimed",
    actualBalanceRaw: vault.amount.toString(), decimals: mint.decimals, supplyRaw: mint.supply.toString(),
    beneficiary: lock.depositor, ownershipExcluded: false,
    observedSlot: snapshot.context.slot, chainTime, commitment: "finalized",
    program: FRIDGE_PROGRAM.toBase58(), upgradeAuthority: admin,
    mintAuthority: mint.mintAuthority?.toBase58() ?? null, freezeAuthority: mint.freezeAuthority?.toBase58() ?? null,
    vaultFrozen: vault.isFrozen, vaultDelegate: vault.delegate?.toBase58() ?? null,
    vaultCloseAuthority: vault.closeAuthority?.toBase58() ?? null,
    extensionTypes: extensions, metadata: token2022Metadata(mint), caveats,
  };
}

/** Two reads: discover addresses, then verify all dependencies at one finalized slot. */
export async function collectLockEvidence(rpc: EvidenceRpc, address: string) {
  new PublicKey(address);
  const initial = await rpc<Snapshot>("getMultipleAccounts", [[address, FRIDGE_PROGRAM.toBase58()], { encoding: "base64", commitment: "finalized" }]);
  if (!initial.value[0]) return { schemaVersion: "1.0", address, state: "absent", observedSlot: initial.context.slot, note: "Absence alone does not prove a claim occurred." };
  const lock = decodeVerifiedLock(address, initial.value[0]);
  const pd = programDataAddress(required(initial.value[1], "program"));
  const keys = [address, lock.mint, lock.vault, FRIDGE_PROGRAM.toBase58(), pd, CLOCK];
  const snapshot = await rpc<Snapshot>("getMultipleAccounts", [keys, { encoding: "base64", commitment: "finalized", minContextSlot: initial.context.slot }]);
  return { evidence: verifyLockSnapshot(address, keys, snapshot), snapshot: { keys, ...snapshot }, fetchedAt: new Date().toISOString() };
}

/** Canonical Pump graduation pool, index 0 / WSOL. Other pools are not enumerated. */
export function canonicalPumpPool(mint: string): string {
  const base = new PublicKey(mint);
  const [creator] = PublicKey.findProgramAddressSync([Buffer.from("pool-authority"), base.toBuffer()], PUMP);
  return PublicKey.findProgramAddressSync([Buffer.from("pool"), Buffer.alloc(2), creator.toBuffer(), base.toBuffer(), WSOL.toBuffer()], PUMP_AMM)[0].toBase58();
}

export function decodePumpPool(address: string, raw: RawAccount, mint: string) {
  const acc = accountInfo(raw), d = acc.data;
  if (acc.executable || !acc.owner.equals(PUMP_AMM) || d.length < 211 || !d.subarray(0, 8).equals(POOL_DISC)) throw new Error("Invalid PumpSwap pool");
  const key = (offset: number) => new PublicKey(d.subarray(offset, offset + 32));
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from("pool"), d.subarray(9, 11), key(11).toBuffer(), key(43).toBuffer(), key(75).toBuffer()], PUMP_AMM);
  if (pda.toBase58() !== address || bump !== d[8] || key(43).toBase58() !== mint) throw new Error("Pool PDA/mint mismatch");
  return { address, baseMint: mint, quoteMint: key(75).toBase58(), lpMint: key(107).toBase58(), baseVault: key(139).toBase58(), quoteVault: key(171).toBase58() };
}

export function verifyPoolSnapshot(address: string, mint: string, keys: string[], snapshot: Snapshot) {
  const at = (key: string) => accountInfo(required(snapshot.value[keys.indexOf(key)], key));
  const pool = decodePumpPool(address, required(snapshot.value[keys.indexOf(address)], "pool"), mint);
  const token = (address: string) => { const acc = at(address); if (!acc.owner.equals(TOKEN_PROGRAM_ID) && !acc.owner.equals(TOKEN_2022_PROGRAM_ID)) throw new Error("Invalid token program"); return unpackAccount(new PublicKey(address), acc, acc.owner); };
  const base = token(pool.baseVault), quote = token(pool.quoteVault), lpAcc = at(pool.lpMint);
  if (!lpAcc.owner.equals(TOKEN_PROGRAM_ID) && !lpAcc.owner.equals(TOKEN_2022_PROGRAM_ID)) throw new Error("Invalid LP mint owner");
  const lp = unpackMint(new PublicKey(pool.lpMint), lpAcc, lpAcc.owner);
  if (!base.isInitialized || !quote.isInitialized || !lp.isInitialized || base.owner.toBase58() !== address || quote.owner.toBase58() !== address || base.mint.toBase58() !== mint || quote.mint.toBase58() !== pool.quoteMint || lp.mintAuthority?.toBase58() !== address) throw new Error("Invalid pool vault/LP binding");
  return { ...pool, baseBalanceRaw: base.amount.toString(), quoteBalanceRaw: quote.amount.toString(), lpSupplyRaw: lp.supply.toString(), funded: base.amount > 0n && quote.amount > 0n, frozen: base.isFrozen || quote.isFrozen, observedSlot: snapshot.context.slot };
}

export async function collectCanonicalPool(rpc: EvidenceRpc, mint: string) {
  const address = canonicalPumpPool(mint);
  const first = await rpc<Snapshot>("getMultipleAccounts", [[address], { encoding: "base64", commitment: "finalized" }]);
  if (!first.value[0]) return null;
  const pool = decodePumpPool(address, first.value[0], mint);
  const keys = [address, pool.baseVault, pool.quoteVault, pool.lpMint];
  const snapshot = await rpc<Snapshot>("getMultipleAccounts", [keys, { encoding: "base64", commitment: "finalized", minContextSlot: first.context.slot }]);
  return verifyPoolSnapshot(address, mint, keys, snapshot);
}
