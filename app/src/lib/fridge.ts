import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getExtensionTypes,
  getExtraAccountMetaAddress,
  getMint,
  getTokenMetadata,
  getTransferHook,
  unpackMint,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type AccountMeta,
} from "@solana/web3.js";
import {
  BURN_SEED,
  CLAIM_DISCRIMINATOR,
  CREATE_LOCK_DISCRIMINATOR,
  LOCK_ACCOUNT_DISCRIMINATOR,
  LOCK_SEED,
  PASTA_MINT,
  PROGRAM_ID,
  REDEMPTION_FEE_BPS,
  RPC_FALLBACKS,
  type ClusterName,
} from "./constants";
import { fetchPastaBuybackRoute } from "./jupiter";
import { forgetLock, knownLockAddresses, rememberLock } from "./lockIndex";

export type LockAccount = {
  address: PublicKey;
  depositor: PublicKey;
  mint: PublicKey;
  amount: bigint;
  createdAt: number;
  unlockAt: number;
  bump: number;
  lockId: bigint;
};

export type MintInfo = {
  mint: PublicKey;
  decimals: number;
  name: string;
  symbol: string;
  balance: bigint;
  transferHook: boolean;
  nonTransferable: boolean;
};

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u64le(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, true);
  return buf;
}

function i64le(value: bigint): Uint8Array {
  return u64le(value);
}

function readU64(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(
    offset,
    true
  );
}

function readI64(data: Uint8Array, offset: number): bigint {
  return readU64(data, offset);
}

export function lockPda(
  depositor: PublicKey,
  mint: PublicKey,
  lockId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode(LOCK_SEED),
      depositor.toBuffer(),
      mint.toBuffer(),
      u64le(lockId),
    ],
    programId
  );
}

export function vaultAddress(mint: PublicKey, lock: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, lock, true, TOKEN_2022_PROGRAM_ID);
}

export function burnPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode(BURN_SEED)], programId);
}

export function redemptionFee(amount: bigint): bigint {
  return (amount * REDEMPTION_FEE_BPS) / 10_000n;
}

export function encodeClaimData(swapData: Uint8Array, minPastaOut: bigint): Buffer {
  const payload = concatBytes(
    CLAIM_DISCRIMINATOR,
    u32le(swapData.length),
    swapData,
    u64le(minPastaOut)
  );
  return Buffer.from(payload);
}

function u32le(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, true);
  return buf;
}

export function decodeLock(address: PublicKey, data: Uint8Array): LockAccount {
  if (data.length < 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8) {
    throw new Error("Lock account is too small");
  }
  const disc = data.slice(0, 8);
  for (let i = 0; i < 8; i++) {
    if (disc[i] !== LOCK_ACCOUNT_DISCRIMINATOR[i]) {
      throw new Error("Not a Fridge lock account");
    }
  }
  let o = 8;
  const depositor = new PublicKey(data.slice(o, o + 32));
  o += 32;
  const mint = new PublicKey(data.slice(o, o + 32));
  o += 32;
  const amount = readU64(data, o);
  o += 8;
  const createdAt = Number(readI64(data, o));
  o += 8;
  const unlockAt = Number(readI64(data, o));
  o += 8;
  const bump = data[o];
  o += 1;
  const lockId = readU64(data, o);
  return {
    address,
    depositor,
    mint,
    amount,
    createdAt,
    unlockAt,
    bump,
    lockId,
  };
}

export function buildCreateLockInstruction(args: {
  depositor: PublicKey;
  mint: PublicKey;
  amount: bigint;
  unlockAt: bigint;
  lockId: bigint;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? PROGRAM_ID;
  const [lock] = lockPda(args.depositor, args.mint, args.lockId, programId);
  const vault = vaultAddress(args.mint, lock);
  const depositorAta = getAssociatedTokenAddressSync(
    args.mint,
    args.depositor,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const data = concatBytes(
    CREATE_LOCK_DISCRIMINATOR,
    u64le(args.amount),
    i64le(args.unlockAt),
    u64le(args.lockId)
  );
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.depositor, isSigner: true, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: depositorAta, isSigner: false, isWritable: true },
      { pubkey: lock, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildClaimInstruction(args: {
  depositor: PublicKey;
  mint: PublicKey;
  lockId: bigint;
  programId?: PublicKey;
  swapData?: Uint8Array;
  minPastaOut?: bigint;
  extraKeys?: AccountMeta[];
}): TransactionInstruction {
  const programId = args.programId ?? PROGRAM_ID;
  const [lock] = lockPda(args.depositor, args.mint, args.lockId, programId);
  const vault = vaultAddress(args.mint, lock);
  const [burnAuthority] = burnPda(programId);
  const depositorAta = getAssociatedTokenAddressSync(
    args.mint,
    args.depositor,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.depositor, isSigner: true, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: true },
      { pubkey: depositorAta, isSigner: false, isWritable: true },
      { pubkey: lock, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: burnAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...(args.extraKeys ?? []),
    ],
    data: encodeClaimData(args.swapData ?? new Uint8Array(), args.minPastaOut ?? 0n),
  });
}

async function extraHookAccounts(
  connection: Connection,
  mint: PublicKey,
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey
): Promise<AccountMeta[]> {
  const mintAcc = await connection.getAccountInfo(mint);
  if (!mintAcc) return [];
  const unpacked = unpackMint(mint, mintAcc, TOKEN_2022_PROGRAM_ID);
  const hook = getTransferHook(unpacked);
  if (!hook) return [];
  const extraMeta = getExtraAccountMetaAddress(mint, hook.programId);
  return [
    { pubkey: hook.programId, isSigner: false, isWritable: false },
    { pubkey: extraMeta, isSigner: false, isWritable: false },
    { pubkey: source, isSigner: false, isWritable: false },
    { pubkey: destination, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
  ];
}

export async function fetchMintInfo(
  connection: Connection,
  mintStr: string,
  owner: PublicKey
): Promise<MintInfo> {
  let mint: PublicKey;
  try {
    mint = new PublicKey(mintStr.trim());
  } catch {
    throw new Error("Mint address is not a valid public key");
  }

  const acc = await connection.getAccountInfo(mint);
  if (!acc) throw new Error("Mint account not found");
  if (!acc.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    throw new Error("This mint is not Token-2022");
  }

  const mintData = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  let name = "Token-2022";
  let symbol = "TKN";
  try {
    const meta = await getTokenMetadata(connection, mint);
    if (meta?.name) name = meta.name;
    if (meta?.symbol) symbol = meta.symbol;
  } catch {
    // metadata extension is optional
  }

  let balance = 0n;
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  try {
    const tokenAcc = await getAccount(
      connection,
      ata,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    if (!tokenAcc.mint.equals(mint) || !tokenAcc.owner.equals(owner)) {
      throw new Error("Associated token account mint or authority is invalid");
    }
    balance = tokenAcc.amount;
  } catch {
    balance = 0n;
  }

  const extensions = getExtensionTypes(acc.data);
  return {
    mint,
    decimals: mintData.decimals,
    name,
    symbol,
    balance,
    transferHook:
      Boolean(getTransferHook(mintData)) ||
      extensions.includes(ExtensionType.TransferHook),
    nonTransferable: extensions.includes(ExtensionType.NonTransferable),
  };
}

export function parseAmount(raw: string, decimals: number): bigint {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Enter an amount");
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Amount must be a positive number");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`Max ${decimals} decimal places`);
  }
  const fracPadded = frac.padEnd(decimals, "0");
  const asBig = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  if (asBig <= 0n) throw new Error("Amount must be greater than zero");
  return asBig;
}

export function formatAmount(amount: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = (amount % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
}

export async function nextLockId(
  connection: Connection,
  depositor: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<bigint> {
  for (let id = 1n; id <= 64n; id++) {
    const [pda] = lockPda(depositor, mint, id, programId);
    const acc = await connection.getAccountInfo(pda, "confirmed");
    if (!acc) return id;
  }
  return BigInt(Date.now());
}

export function clusterFromEndpoint(endpoint: string): ClusterName {
  if (endpoint.includes("devnet")) return "devnet";
  if (endpoint.includes("testnet")) return "testnet";
  return "mainnet";
}

function listingEndpoints(connection: Connection, cluster: ClusterName): string[] {
  const pool = [...RPC_FALLBACKS[cluster], connection.rpcEndpoint];
  return [...new Set(pool)].filter((url) => {
    if (!/^https?:\/\//i.test(url)) return false;
    if (clusterFromEndpoint(url) !== cluster) return false;
    // Alchemy rejects getProgramAccounts (429). Use it for txs, not listing.
    if (cluster === "mainnet" && url.includes("alchemy.com")) return false;
    return true;
  });
}

export async function confirmSignature(
  connection: Connection,
  signature: string,
  timeoutMs = 90_000
): Promise<"confirmed" | "finalized"> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const landed = await signatureLanded(connection, signature);
    if (landed) return landed;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const landed = await signatureLanded(connection, signature);
  if (landed) return landed;
  throw new Error(
    `Transaction did not land. Signature ${signature} is not on-chain. Retry — Phantom and DevFridge must be on the same network, and the wallet needs SOL for fees.`
  );
}

async function signatureLanded(
  connection: Connection,
  signature: string
): Promise<"confirmed" | "finalized" | null> {
  const { value } = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const status = value[0];
  if (status?.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
  }
  if (
    status?.confirmationStatus === "confirmed" ||
    status?.confirmationStatus === "finalized"
  ) {
    return status.confirmationStatus;
  }
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx?.meta?.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`);
    }
    if (tx) return "confirmed";
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Transaction failed on-chain")) {
      throw err;
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("rpc-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function fetchLocksByIndex(
  connection: Connection,
  depositor: PublicKey,
  programId: PublicKey,
  cluster: ClusterName
): Promise<LockAccount[]> {
  const keys = knownLockAddresses(depositor, programId, cluster);
  if (keys.length === 0) return [];
  const infos = await connection.getMultipleAccountsInfo(keys, "confirmed");
  const locks: LockAccount[] = [];
  infos.forEach((info, i) => {
    if (!info) {
      forgetLock(keys[i].toBase58(), cluster);
      return;
    }
    try {
      locks.push(decodeLock(keys[i], info.data));
    } catch {
      forgetLock(keys[i].toBase58(), cluster);
    }
  });
  return locks;
}

function rememberDecoded(lock: LockAccount, programId: PublicKey, cluster: ClusterName) {
  rememberLock({
    address: lock.address.toBase58(),
    mint: lock.mint.toBase58(),
    lockId: lock.lockId.toString(),
    depositor: lock.depositor.toBase58(),
    programId: programId.toBase58(),
    cluster,
  });
}

async function fetchLocksByGpaAll(
  endpoint: string,
  programId: PublicKey
): Promise<LockAccount[]> {
  const conn = new Connection(endpoint, "confirmed");
  const accounts = await conn.getProgramAccounts(programId, {
    filters: [{ dataSize: 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8 }],
  });
  return accounts.map((acc) => decodeLock(acc.pubkey, acc.account.data));
}

function pubkeyOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof PublicKey) return value.toBase58();
  const rec = value as { pubkey?: PublicKey | string; toBase58?: () => string };
  if (rec.pubkey instanceof PublicKey) return rec.pubkey.toBase58();
  if (typeof rec.pubkey === "string") return rec.pubkey;
  if (typeof rec.toBase58 === "function") return rec.toBase58();
  return "";
}

async function fetchLocksBySignatures(
  connection: Connection,
  programId: PublicKey
): Promise<LockAccount[]> {
  const sigs = await connection.getSignaturesForAddress(programId, { limit: 40 });
  if (sigs.length === 0) return [];
  const txs = await connection.getTransactions(
    sigs.map((s) => s.signature),
    { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
  );
  const candidates = new Set<string>();
  for (const tx of txs) {
    if (!tx) continue;
    const msg = tx.transaction.message as unknown as {
      accountKeys?: unknown[];
      staticAccountKeys?: PublicKey[];
      instructions?: Array<{ programIdIndex: number; accounts: number[] }>;
      compiledInstructions?: Array<{ programIdIndex: number; accountKeyIndexes: number[] }>;
    };
    const keys = (msg.staticAccountKeys ?? msg.accountKeys ?? []).map(pubkeyOf);
    const compiled =
      msg.compiledInstructions ??
      msg.instructions ??
      [];
    for (const ix of compiled) {
      const pid = keys[ix.programIdIndex];
      if (pid !== programId.toBase58()) continue;
      const indexes = "accountKeyIndexes" in ix ? ix.accountKeyIndexes : ix.accounts;
      if (indexes?.[3] != null && keys[indexes[3]]) candidates.add(keys[indexes[3]]);
    }
  }
  const pubs = [...candidates].map((k) => new PublicKey(k));
  if (pubs.length === 0) return [];
  const infos = await connection.getMultipleAccountsInfo(pubs, "confirmed");
  const locks: LockAccount[] = [];
  infos.forEach((info, i) => {
    if (!info) return;
    try {
      locks.push(decodeLock(pubs[i], info.data));
    } catch {
      // not a lock account
    }
  });
  return locks;
}

export async function fetchAllLocks(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID,
  cluster?: ClusterName
): Promise<LockAccount[]> {
  const net = cluster ?? clusterFromEndpoint(connection.rpcEndpoint);
  const endpoints = listingEndpoints(connection, net);
  const jobs: Promise<LockAccount[]>[] = endpoints.map((endpoint) =>
    withTimeout(fetchLocksByGpaAll(endpoint, programId), 8000)
  );
  if (clusterFromEndpoint(connection.rpcEndpoint) === net) {
    jobs.push(withTimeout(fetchLocksBySignatures(connection, programId), 8000));
  }

  const settled = await Promise.allSettled(jobs);
  const found = new Map<string, LockAccount>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const lock of result.value) {
      found.set(lock.address.toBase58(), lock);
      rememberDecoded(lock, programId, net);
    }
  }
  return [...found.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchLocks(
  connection: Connection,
  depositor: PublicKey,
  programId: PublicKey = PROGRAM_ID,
  cluster?: ClusterName
): Promise<LockAccount[]> {
  const net = cluster ?? clusterFromEndpoint(connection.rpcEndpoint);
  const all = await fetchAllLocks(connection, programId, net);
  const mine = all.filter((l) => l.depositor.equals(depositor));
  if (mine.length > 0) return mine;

  const indexed = await fetchLocksByIndex(connection, depositor, programId, net);
  const seen = new Set(indexed.map((l) => l.address.toBase58()));
  for (const lock of all) {
    if (lock.depositor.equals(depositor) && !seen.has(lock.address.toBase58())) {
      indexed.push(lock);
    }
  }
  return indexed.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createLockTransaction(
  connection: Connection,
  depositor: PublicKey,
  mint: PublicKey,
  amount: bigint,
  unlockAt: bigint,
  lockId: bigint,
  programId: PublicKey = PROGRAM_ID
): Promise<Transaction> {
  if (amount <= 0n) throw new Error("Amount must be greater than zero");
  const now = Math.floor(Date.now() / 1000);
  if (unlockAt <= BigInt(now)) throw new Error("Unlock time must be in the future");

  const depositorAta = getAssociatedTokenAddressSync(
    mint,
    depositor,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const ataInfo = await connection.getAccountInfo(depositorAta);
  if (!ataInfo) throw new Error("You do not have a Token-2022 account for this mint");

  const tokenAcc = await getAccount(
    connection,
    depositorAta,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
  if (!tokenAcc.mint.equals(mint)) throw new Error("ATA mint mismatch");
  if (!tokenAcc.owner.equals(depositor)) throw new Error("ATA authority mismatch");
  if (tokenAcc.amount < amount) throw new Error("Insufficient token balance");

  const [lock] = lockPda(depositor, mint, lockId, programId);
  const vault = vaultAddress(mint, lock);
  const ix = buildCreateLockInstruction({
    depositor,
    mint,
    amount,
    unlockAt,
    lockId,
    programId,
  });
  const extras = await extraHookAccounts(
    connection,
    mint,
    depositorAta,
    vault,
    depositor
  );
  ix.keys.push(...extras);

  const tx = new Transaction().add(ix);
  tx.feePayer = depositor;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

async function loadLookupTables(
  connection: Connection,
  addresses: PublicKey[]
): Promise<AddressLookupTableAccount[]> {
  if (addresses.length === 0) return [];
  const tables = await Promise.all(
    addresses.map(async (addr) => {
      const res = await connection.getAddressLookupTable(addr);
      return res.value;
    })
  );
  return tables.filter((t): t is AddressLookupTableAccount => Boolean(t));
}

function serializeSize(tx: VersionedTransaction): number {
  return tx.serialize().length;
}

export async function claimTransaction(
  connection: Connection,
  depositor: PublicKey,
  lock: LockAccount,
  programId: PublicKey = PROGRAM_ID,
  opts: { localFeeBurn?: boolean } = {}
): Promise<Transaction | VersionedTransaction> {
  if (!lock.depositor.equals(depositor)) {
    throw new Error("Only the original depositor can claim");
  }
  const now = Math.floor(Date.now() / 1000);
  if (now < lock.unlockAt) {
    throw new Error("This lock is still frozen");
  }

  const depositorAta = getAssociatedTokenAddressSync(
    lock.mint,
    depositor,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const tx = new Transaction();
  const ataInfo = await connection.getAccountInfo(depositorAta);
  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        depositor,
        depositorAta,
        depositor,
        lock.mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  const vault = vaultAddress(lock.mint, lock.address);
  const fee = redemptionFee(lock.amount);
  const isPasta = lock.mint.equals(PASTA_MINT);
  const endpoint = connection.rpcEndpoint.toLowerCase();
  const localFeeBurn =
    Boolean(opts.localFeeBurn) ||
    endpoint.includes("devnet") ||
    endpoint.includes("testnet");

  if (fee === 0n || isPasta || localFeeBurn) {
    const extraKeys = await extraHookAccounts(
      connection,
      lock.mint,
      vault,
      depositorAta,
      lock.address
    );
    tx.add(
      buildClaimInstruction({
        depositor,
        mint: lock.mint,
        lockId: lock.lockId,
        programId,
        swapData: new Uint8Array(),
        minPastaOut: isPasta ? fee : 0n,
        extraKeys,
      })
    );
    tx.feePayer = depositor;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    return tx;
  }

  const [burnAuthority] = burnPda(programId);
  const feeAta = getAssociatedTokenAddressSync(
    lock.mint,
    burnAuthority,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  const pastaAta = getAssociatedTokenAddressSync(
    PASTA_MINT,
    burnAuthority,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  const prelude: TransactionInstruction[] = [];
  if (!ataInfo) {
    prelude.push(
      createAssociatedTokenAccountIdempotentInstruction(
        depositor,
        depositorAta,
        depositor,
        lock.mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }
  prelude.push(
    createAssociatedTokenAccountIdempotentInstruction(
      depositor,
      feeAta,
      burnAuthority,
      lock.mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      depositor,
      pastaAta,
      burnAuthority,
      PASTA_MINT,
      TOKEN_2022_PROGRAM_ID
    )
  );

  const { blockhash } = await connection.getLatestBlockhash();
  let lastError: Error | null = null;
  for (const maxAccounts of [32, 24, 16]) {
    try {
      const route = await fetchPastaBuybackRoute(
        lock.mint,
        fee,
        burnAuthority,
        maxAccounts
      );
      const extraKeys: AccountMeta[] = [
        { pubkey: PASTA_MINT, isSigner: false, isWritable: true },
        { pubkey: feeAta, isSigner: false, isWritable: true },
        { pubkey: pastaAta, isSigner: false, isWritable: true },
        { pubkey: route.swapProgram, isSigner: false, isWritable: false },
        ...route.swapAccounts,
      ];
      const claimIx = buildClaimInstruction({
        depositor,
        mint: lock.mint,
        lockId: lock.lockId,
        programId,
        swapData: Uint8Array.from(route.swapData),
        minPastaOut: route.minPastaOut,
        extraKeys,
      });
      const ixs = [...prelude, ...route.setup, claimIx, ...route.cleanup];
      const tables = await loadLookupTables(connection, route.lookupTableAddresses);
      const message = new TransactionMessage({
        payerKey: depositor,
        recentBlockhash: blockhash,
        instructions: ixs,
      }).compileToV0Message(tables);
      const vtx = new VersionedTransaction(message);
      if (serializeSize(vtx) <= 1232) return vtx;
      lastError = new Error(
        `Buyback route still too large (${serializeSize(vtx)} bytes) with maxAccounts=${maxAccounts}`
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Could not fit the $PASTA buyback in one transaction");
}

export function shortKey(key: PublicKey | string): string {
  const s = typeof key === "string" ? key : key.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function formatWhen(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}
