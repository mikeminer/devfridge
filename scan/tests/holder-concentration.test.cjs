const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require('@solana/spl-token');
const { aggregateHolders, collectHolderDistribution, holderConcentrationCheck } = require('../lib/holder-concentration.ts');
const key = n => new PublicKey(Buffer.alloc(32, n)).toBase58();
const mint = key(1), program = key(2), depositor = key(3), poolAddress = key(4), poolVault = key(5);
function fixture() {
  const id = Buffer.alloc(8); id.writeBigUInt64LE(1n);
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('lock'), new PublicKey(depositor).toBuffer(), new PublicKey(mint).toBuffer(), id], new PublicKey(program));
  const lock = { address: pda.toBase58(), depositor, mint, lockId: '1', bump, unlockAt: 200, createdAt: 1, amount: '1' };
  const input = { mint, supply: 1000n, tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), fridgeProgram: program,
    fridge: { status: 'fridged', locks: [lock] }, poolAvailable: true, now: 100,
    pool: { address: poolAddress, baseMint: mint, baseVault: poolVault, observedSlot: 100 } };
  const vault = getAssociatedTokenAddressSync(new PublicKey(mint), pda, true, TOKEN_2022_PROGRAM_ID).toBase58();
  const snapshot = { context: { slot: 101 }, value: [row(poolVault, poolAddress, 760n), row(vault, lock.address, 120n),
    row(key(6), depositor, 40n), row(key(7), depositor, 30n), row(key(8), key(9), 50n)] };
  return { input, snapshot, vault };
}
function row(address, owner, amount) {
  const b = Buffer.alloc(165); new PublicKey(mint).toBuffer().copy(b, 0); new PublicKey(owner).toBuffer().copy(b, 32);
  b.writeBigUInt64LE(amount, 64); b[108] = 1;
  return { pubkey: address, account: { owner: TOKEN_2022_PROGRAM_ID.toBase58(), executable: false, data: [b.toString('base64'), 'base64'] } };
}
test('pool reserves are excluded, split accounts merged and actual locked balances retained by depositor', () => {
  const { input, snapshot } = fixture(), r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 24); assert.equal(r.poolPct, 76); assert.equal(r.fridgePct, 12);
  assert.equal(r.outsideFridgeTop10Pct, 12); assert.equal(r.timeLockedPct, 12); assert.equal(r.ownerCount, 2);
  assert.deepEqual(r.topOwners[0], { owner: depositor, totalRaw: '190', outsideFridgeRaw: '70', timeLockedRaw: '120', claimableRaw: '0' });
  assert.equal(holderConcentrationCheck(r).level, 'safe');
});
test('lock expiry changes time-lock status, never ownership concentration', () => {
  const { input, snapshot } = fixture(); input.now = 200;
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 24); assert.equal(r.fridgePct, 12); assert.equal(r.timeLockedPct, 0);
  assert.equal(r.topOwners[0].claimableRaw, '120');
});
test('a lock cannot hide concentrated ownership from the grade', () => {
  const { input, snapshot } = fixture(); input.pool = null;
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 100); assert.equal(holderConcentrationCheck(r).level, 'danger');
});
test('top ten is ranked after full owner aggregation, including accounts beyond the largest twenty', () => {
  const { input } = fixture(); input.pool = null; input.fridge.locks = [];
  const values = Array.from({ length: 30 }, (_, i) => row(key(20 + i), i < 15 ? depositor : key(100 + i), 10n));
  input.supply = 300n;
  const r = aggregateHolders({ context: { slot: 101 }, value: values }, input);
  assert.equal(r.topOwners[0].totalRaw, '150'); assert.equal(r.top10Pct, 80); assert.equal(r.ownerCount, 16);
});
for (const [name, mutate] of [
  ['truncated account set', f => f.snapshot.value.pop()],
  ['duplicated rows', f => f.snapshot.value.push(f.snapshot.value[0])],
  ['supply changed or withheld tokens missing', f => f.input.supply++],
  ['wrong token program', f => f.snapshot.value[0].account.owner = TOKEN_PROGRAM_ID.toBase58()],
  ['unverified pool owner', f => f.snapshot.value[0] = row(poolVault, key(77), 760n)],
  ['unverified Fridge depositor', f => f.input.fridge.locks[0].depositor = key(77)],
  ['wrong Fridge vault owner', f => f.snapshot.value[1] = row(f.vault, key(77), 120n)],
  ['pool classification unavailable', f => f.input.poolAvailable = false],
  ['Fridge classification unavailable', f => f.input.fridge.status = 'unavailable'],
  ['stale account snapshot', f => f.snapshot.context.slot = 99],
]) test(name + ' cannot produce a safe concentration', async () => {
  const f = fixture(); mutate(f);
  assert.throws(() => aggregateHolders(f.snapshot, f.input));
  const r = await collectHolderDistribution(async () => f.snapshot, f.input);
  assert.equal(r.status, 'unavailable'); assert.equal(holderConcentrationCheck(r).level, 'unknown');
});
test('collector requests full mint-filtered account data and preserves context', async () => {
  const { input, snapshot } = fixture();
  const r = await collectHolderDistribution(async (method, params) => {
    assert.equal(method, 'getProgramAccounts'); assert.equal(params[0], input.tokenProgram);
    assert.deepEqual(params[1].filters, [{ memcmp: { offset: 0, bytes: mint } }]);
    assert.equal(params[1].withContext, true); assert.equal(params[1].minContextSlot, 100);
    assert.deepEqual(params[1].dataSlice, { offset: 0, length: 165 }); return snapshot;
  }, input);
  assert.equal(r.observedSlot, 101);
});
test('provider failures return unknown without leaking provider errors', async () => {
  const r = await collectHolderDistribution(async () => { throw Error('private-provider-url'); }, fixture().input);
  assert.equal(holderConcentrationCheck(r).level, 'unknown'); assert.ok(!JSON.stringify(r).includes('private-provider-url'));
});
