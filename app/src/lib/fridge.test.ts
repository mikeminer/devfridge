import assert from "node:assert/strict";
import test from "node:test";
import { PublicKey } from "@solana/web3.js";
import {
  buildClaimInstruction,
  burnPda,
  decodeLock,
  encodeClaimData,
  lockPda,
  parseAmount,
  formatAmount,
  redemptionFee,
  buildCreateLockInstruction,
} from "./fridge.ts";

import {
  CLAIM_DISCRIMINATOR,
  CREATE_LOCK_DISCRIMINATOR,
  LOCK_ACCOUNT_DISCRIMINATOR,
  PROGRAM_ID,
} from "./constants.ts";

const depositor = new PublicKey("GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W");
const mint = new PublicKey("39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump");

test("create_lock instruction layout", () => {
  const ix = buildCreateLockInstruction({
    depositor,
    mint,
    amount: 1_000_000n,
    unlockAt: 1_800_000_000n,
    lockId: 7n,
  });
  assert.equal(ix.programId.toBase58(), PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 8);
  assert.equal(ix.keys[0].isSigner, true);
  assert.deepEqual([...ix.data.slice(0, 8)], [...CREATE_LOCK_DISCRIMINATOR]);
  assert.equal(ix.data.length, 8 + 8 + 8 + 8);
});

test("claim instruction layout", () => {
  const ix = buildClaimInstruction({
    depositor,
    mint,
    lockId: 7n,
  });
  const [burn] = burnPda();
  assert.deepEqual([...ix.data.slice(0, 8)], [...CLAIM_DISCRIMINATOR]);
  assert.equal(ix.keys[0].pubkey.toBase58(), depositor.toBase58());
  assert.equal(ix.keys[5].pubkey.toBase58(), burn.toBase58());
  assert.equal(ix.data.length, 8 + 4 + 8);
});

test("redemption fee is 2 percent", () => {
  assert.equal(redemptionFee(100n), 2n);
  assert.equal(redemptionFee(50n), 1n);
  assert.equal(redemptionFee(49n), 0n);
});

test("claim data encodes swap payload", () => {
  const data = encodeClaimData(Uint8Array.from([1, 2, 3]), 9n);
  assert.deepEqual([...data.slice(0, 8)], [...CLAIM_DISCRIMINATOR]);
  assert.equal(data.readUInt32LE(8), 3);
  assert.deepEqual([...data.slice(12, 15)], [1, 2, 3]);
});

test("PDA is unique per lock id", () => {
  const [a] = lockPda(depositor, mint, 1n);
  const [b] = lockPda(depositor, mint, 2n);
  assert.notEqual(a.toBase58(), b.toBase58());
});

test("lock account decode", () => {
  const data = new Uint8Array(8 + 32 + 32 + 8 + 8 + 8 + 1 + 8);
  data.set(LOCK_ACCOUNT_DISCRIMINATOR, 0);
  data.set(depositor.toBytes(), 8);
  data.set(mint.toBytes(), 40);
  new DataView(data.buffer).setBigUint64(72, 42n, true);
  new DataView(data.buffer).setBigInt64(80, 10n, true);
  new DataView(data.buffer).setBigInt64(88, 99n, true);
  data[96] = 255;
  new DataView(data.buffer).setBigUint64(97, 3n, true);
  const lock = decodeLock(depositor, data);
  assert.equal(lock.depositor.toBase58(), depositor.toBase58());
  assert.equal(lock.mint.toBase58(), mint.toBase58());
  assert.equal(lock.amount, 42n);
  assert.equal(lock.createdAt, 10);
  assert.equal(lock.unlockAt, 99);
  assert.equal(lock.bump, 255);
  assert.equal(lock.lockId, 3n);
});

test("parse and format amounts", () => {
  assert.equal(parseAmount("1.5", 6), 1_500_000n);
  assert.equal(formatAmount(1_500_000n, 6), "1.5");
  assert.throws(() => parseAmount("0", 6));
  assert.throws(() => parseAmount("-1", 6));
});
