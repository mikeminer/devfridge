const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require('@solana/spl-token');
require('node:module').registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); } catch (err) {
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) return nextResolve(specifier + '.ts', context);
    throw err;
  }
} });
const holders = require('../lib/holder-concentration.ts');
const holderConcentrationCheck = holders.holderConcentrationCheck;
const aggregateHolders = (snapshot, input) => holders.aggregateHolders(snapshot, input, input.coverage);
const collectHolderDistribution = (rpc, input) => holders.collectHolderDistribution(async (method, params) => {
  if (method !== 'getAccountInfo') return rpc(method, params);
  const data = Buffer.alloc(82); data.writeBigUInt64LE(input.supply, 36); data[45] = 1;
  return { context: { slot: 101 }, value: { owner: input.tokenProgram, executable: false, data: [data.toString('base64'), 'base64'] } };
}, input, async () => input.coverage);
const key = n => new PublicKey(Buffer.alloc(32, n)).toBase58();
const mint = key(1), program = key(2), depositor = key(3), poolAddress = key(4), poolVault = key(5);
function fixture() {
  const id = Buffer.alloc(8); id.writeBigUInt64LE(1n);
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('lock'), new PublicKey(depositor).toBuffer(), new PublicKey(mint).toBuffer(), id], new PublicKey(program));
  const lock = { address: pda.toBase58(), depositor, mint, lockId: '1', bump, unlockAt: 200, createdAt: 1, amount: '1' };
  const input = { mint, supply: 1000n, tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), fridgeProgram: program,
    fridge: { status: 'fridged', locks: [lock] }, now: 100,
    coverage: { classificationSlot: 101, pumpStage: 'completed_curve', reserves: [{ protocol: 'pumpswap', address: poolAddress, mint, vault: poolVault, authority: poolAddress }] } };
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
  const { input, snapshot } = fixture(); input.coverage.reserves = [];
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 100); assert.equal(holderConcentrationCheck(r).level, 'danger');
});
test('top ten is ranked after full owner aggregation, including accounts beyond the largest twenty', () => {
  const { input } = fixture(); input.coverage.reserves = []; input.fridge.locks = [];
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
  ['pool classification unavailable', f => f.input.coverage.classificationSlot = NaN],
  ['Fridge classification unavailable', f => f.input.fridge.status = 'unavailable'],
  ['stale account snapshot', f => f.input.coverage.classificationSlot = 99],
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
    assert.equal(params[1].withContext, true); assert.equal(params[1].minContextSlot, undefined);
    assert.deepEqual(params[1].dataSlice, { offset: 0, length: 109 }); return snapshot;
  }, input);
  assert.equal(r.observedSlot, 101);
});
test('provider failures return unknown without leaking provider errors', async () => {
  const r = await collectHolderDistribution(async () => { throw Error('private-provider-url'); }, fixture().input);
  assert.equal(holderConcentrationCheck(r).level, 'unknown'); assert.ok(!JSON.stringify(r).includes('private-provider-url'));
});


test('complete enumeration supports more than 100000 accounts without sampling', () => {
  const { input } = fixture(); input.fridge.locks = []; input.coverage.reserves = []; input.supply = 100001n;
  const value = Array.from({ length: 100001 }, (_, i) => {
    const bytes = Buffer.alloc(32, 91); bytes.writeUInt32LE(i, 0);
    return row(new PublicKey(bytes).toBase58(), depositor, 1n);
  });
  const r = aggregateHolders({ context: { slot: 101 }, value }, input);
  assert.equal(r.accountCount, 100001); assert.equal(r.ownerCount, 1); assert.equal(r.top10Pct, 100);
});

test('bonding-curve reserves are separated without hiding deposited ownership', () => {
  const { input, snapshot } = fixture(); input.coverage.reserves[0].protocol = 'pump_curve'; input.coverage.pumpStage = 'bonding_curve';
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.protocolReservePct, 76); assert.equal(r.bondingCurvePct, 76); assert.equal(r.poolPct, 0);
  assert.equal(r.top10Pct, 24); assert.equal(r.excludedPools.length, 0); assert.equal(r.excludedReserves.length, 1);
});


test('unclassified protocol custody that can change the grade yields unknown', () => {
  const { input, snapshot } = fixture(); input.coverage.reserves = []; input.coverage.unclassifiedCustody = [poolVault];
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 100); assert.equal(r.top10WithoutUnclassifiedCustodyPct, 24);
  assert.equal(holderConcentrationCheck(r).level, 'unknown'); assert.equal(r.unclassifiedCustody[0].balanceRaw, '760');
});

test('unmapped custody with the same grade at both bounds remains included and disclosed', () => {
  const { input, snapshot } = fixture(); input.coverage.unclassifiedCustody = [key(8)];
  const r = aggregateHolders(snapshot, input);
  assert.equal(r.top10Pct, 24); assert.equal(r.top10WithoutUnclassifiedCustodyPct, 19);
  assert.equal(holderConcentrationCheck(r).level, 'safe'); assert.match(holderConcentrationCheck(r).detail, /Unmapped Raydium custody/);
});


test('compact 109-byte account headers preserve balance, owner and initialized state', () => {
  const { input, snapshot } = fixture();
  snapshot.value.forEach(row => row.account.data[0] = Buffer.from(row.account.data[0], 'base64').subarray(0, 109).toString('base64'));
  assert.equal(aggregateHolders(snapshot, input).top10Pct, 24);
});


test('collector rereads supply after enumeration rather than trusting the earlier mint read', async () => {
  const { input, snapshot } = fixture(); input.supply = 1001n;
  const r = await holders.collectHolderDistribution(async (method, params) => {
    if (method === 'getProgramAccounts') return snapshot;
    assert.equal(method, 'getAccountInfo'); assert.equal(params[1].minContextSlot, 101);
    const d = Buffer.alloc(82); d[45] = 1; d.writeBigUInt64LE(1000n, 36);
    return { context: { slot: 102 }, value: { owner: input.tokenProgram, executable: false, data: [d.toString('base64'), 'base64'] } };
  }, input, async () => input.coverage);
  assert.equal(r.status, 'complete'); assert.equal(r.supplyRaw, '1000'); assert.equal(r.supplyObservedSlot, 102);
});
