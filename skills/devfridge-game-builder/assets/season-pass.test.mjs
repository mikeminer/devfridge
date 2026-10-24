import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION_TOLERANCE_S, prepareSeasonPassDeposits, evaluateSeasonPass, tierForDeposit } from './season-pass.mjs';

const now = 2_000_000_000;
const identity = { wallet: 'authenticated-wallet', mint: 'configured-mint' };
// Synthetic fixtures, not product defaults.
const tiers = [
  { id: 'a', label: 'A', days: 2, amountRaw: 100n },
  { id: 'b', label: 'B', days: 4, amountRaw: 200n },
  { id: 'c', label: 'C', days: 8, amountRaw: 300n },
];
const deposit = (id, amount = '100', duration = 2 * 86400, expiry = now + 100) => ({ address: id, depositor: identity.wallet, mint: identity.mint, amount, createdAt: expiry - duration, unlockAt: expiry });
const prepare = (rows, overrides = {}) => prepareSeasonPassDeposits({ ...identity, ts: now, activeLocks: rows, ...overrides }, identity, now);
const evaluate = rows => evaluateSeasonPass(prepare(rows), tiers, now);

test('each duration tier accepts exactly tolerance and full duration ±1 second', () => {
  assert.equal(DURATION_TOLERANCE_S, 3600);
  for (let rank = 0; rank < tiers.length; rank++) {
    const tier = tiers[rank];
    for (const offset of [-3601, -3600, -3599, -1, 0, 1]) {
      const data = prepare([deposit('one', String(tier.amountRaw), tier.days * 86400 + offset)]);
      const actual = tierForDeposit(data[0], tiers, now);
      assert.equal(actual?.id ?? null, offset < -3600 ? tiers[rank - 1]?.id ?? null : tier.id);
    }
  }
});

test('each amount boundary is exact; larger and longer requirements are monotone', () => {
  for (let rank = 0; rank < tiers.length; rank++) {
    const tier = tiers[rank];
    for (const offset of [-1n, 0n, 1n]) {
      const actual = evaluate([deposit('one', String(tier.amountRaw + offset), tier.days * 86400 + 1)]).tier;
      assert.equal(actual?.id ?? null, offset < 0n ? tiers[rank - 1]?.id ?? null : tier.id);
    }
  }
  assert.equal(evaluate([deposit('one', '10000', 20 * 86400)]).tier.id, 'c');
});

test('expired deposits never admit; activeRaw is informational and never combined for admission', () => {
  assert.equal(evaluate([deposit('expired', '300', 8 * 86400, now)]).eligible, false);
  const result = evaluate([deposit('a', '60'), deposit('b', '60')]);
  assert.equal(result.activeRaw, 120n);
  assert.equal(result.eligible, false);
  assert.equal(result.expiresAt, null);
  assert.deepEqual(result.qualifying, []);
});

test('verified identity binding, immutable snapshots, missing and forged contexts fail closed', () => {
  for (const change of [{ mint: 'foreign-mint' }, { depositor: 'foreign-wallet' }]) assert.throws(() => prepare([{ ...deposit('a'), ...change }]));
  assert.throws(() => prepare([deposit('a')], { wallet: 'foreign-wallet' }));
  assert.throws(() => prepare([deposit('a')], { mint: 'foreign-mint' }));
  assert.throws(() => evaluateSeasonPass([deposit('a')], tiers, now), /prepareSeasonPassDeposits/);
  assert.throws(() => tierForDeposit({ ...deposit('a'), verified: true }, tiers, now), /prepareSeasonPassDeposits/);
  const original = deposit('a');
  const data = prepare([original]);
  original.mint = 'changed-after-verification';
  assert.equal(evaluateSeasonPass(data, tiers, now).eligible, true);
  assert.throws(() => { data[0].mint = 'changed'; }, TypeError);
  assert.throws(() => evaluateSeasonPass([...data], tiers, now), /prepareSeasonPassDeposits/);
  assert.throws(() => prepare([deposit('same'), deposit('same')]));
});

test('highest tier and its latest expiry win; lower tiers cannot prolong higher privileges', () => {
  const result = evaluate([deposit('lower', '100', 2 * 86400, now + 1000), deposit('higher-1', '300', 8 * 86400, now + 10), deposit('higher-2', '300', 8 * 86400, now + 50)]);
  assert.equal(result.tier.id, 'c');
  assert.equal(result.expiresAt, now + 50);
  assert.equal(result.qualifying.length, 3);
  const data = prepare(result.qualifying.map(item => ({ ...item.deposit })));
  assert.equal(evaluateSeasonPass(data, tiers, now + 50).tier.id, 'a');
});

test('freshness is checked every time, not merely during preparation', () => {
  const data = prepare([deposit('a')]);
  assert.equal(evaluateSeasonPass(data, tiers, now + 90).eligible, true);
  assert.throws(() => evaluateSeasonPass(data, tiers, now + 91), /stale/);
  assert.throws(() => prepare([deposit('a')], { ts: now - 91 }), /stale/);
  assert.throws(() => prepare([deposit('a')], { ts: now + 6 }), /timestamp/);
});

test('amounts above 2^53 remain exact and invalid tiers/time are rejected', () => {
  const large = [{ id: 'large', label: 'Large', days: 2, amountRaw: 9007199254740993n }];
  assert.equal(evaluateSeasonPass(prepare([deposit('a', '9007199254740992')]), large, now).eligible, false);
  assert.equal(evaluateSeasonPass(prepare([deposit('a', '9007199254740993')]), large, now).activeRaw, 9007199254740993n);
  for (const bad of [[], [...tiers].reverse(), [{ ...tiers[0], amountRaw: 100 }], [{ ...tiers[0], days: 0 }]]) assert.throws(() => evaluateSeasonPass(prepare([]), bad, now));
  assert.throws(() => evaluateSeasonPass(prepare([]), tiers, NaN));
});
