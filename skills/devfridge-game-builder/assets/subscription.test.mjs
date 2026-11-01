import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlans, solToLamports, planEndTime, depositAmountFromQuote,
  prepareSubscriptionDeposits, evaluateSubscription, planForDeposit, countdown,
} from './subscription.mjs';

const W = 'Wallet1111111111111111111111111111111111111';
const M = 'Mint11111111111111111111111111111111111111';
const NOW = 1_800_000_000;
const plans = [
  { id: 'daily', label: 'Daily Pass', priceLamports: solToLamports('0.01') },
  { id: 'weekly', label: 'Weekly Pass', priceLamports: solToLamports('0.05') },
  { id: 'monthly', label: 'Monthly Pass', priceLamports: solToLamports('0.15') },
];
const lock = (address, amount, createdAt, unlockAt, extra = {}) => ({ address, depositor: W, mint: M, amount, createdAt, unlockAt, ...extra });
const evidence = locks => ({ wallet: W, mint: M, ts: NOW, activeLocks: locks });
const run = (locks, now = NOW) => evaluateSubscription(prepareSubscriptionDeposits(evidence(locks), { wallet: W, mint: M }, NOW), plans, now);

test('plans: ids, days, prices', () => {
  const checked = validatePlans(plans);
  assert.deepEqual(checked.map(p => p.days), [1, 7, 30]);
  assert.throws(() => validatePlans([{ id: 'yearly', label: 'x', priceLamports: 1n }]));
  assert.throws(() => validatePlans([{ id: 'daily', label: 'x', priceLamports: 0n }]));
  assert.throws(() => validatePlans([plans[0], plans[0]]));
  assert.throws(() => validatePlans([{ id: 'daily', label: 'x', priceLamports: 1 }]), /BigInt/);
});

test('SOL to lamports is exact', () => {
  assert.equal(solToLamports('0.01'), 10_000_000n);
  assert.equal(solToLamports('1'), 1_000_000_000n);
  assert.equal(solToLamports('0.000000001'), 1n);
  for (const bad of ['0', '0.0', '1,5', '-1', '0.0000000001', '1e3', '']) assert.throws(() => solToLamports(bad));
});

test('end time follows the plan', () => {
  assert.equal(planEndTime(plans[0], NOW), NOW + 86400);
  assert.equal(planEndTime(plans[1], NOW), NOW + 7 * 86400);
  assert.equal(planEndTime(plans[2], NOW), NOW + 30 * 86400);
});

test('deposit amount is the guaranteed minimum output', () => {
  assert.equal(depositAmountFromQuote(1_000_000n, 200), 980_000n);
  assert.equal(depositAmountFromQuote((1n << 63n), 100), (1n << 63n) * 9900n / 10000n);
  assert.throws(() => depositAmountFromQuote(0n, 200));
  assert.throws(() => depositAmountFromQuote(1n, 200), /too small/);
  assert.throws(() => depositAmountFromQuote(100n, 0));
});

test('no deposit, expired deposit -> inactive', () => {
  assert.equal(run([]).active, false);
  const r = run([lock('a', '5', NOW - 86400, NOW)]);
  assert.equal(r.active, false);
  assert.equal(r.expiresAt, null);
});

test('any positive active deposit grants access; the amount is not compared', () => {
  for (const amount of ['1', '123456789', '18446744073709551615']) {
    const r = run([lock('a', amount, NOW - 10, NOW + 86400 - 10)]);
    assert.equal(r.active, true);
    assert.equal(r.plan.id, 'daily');
  }
});

test('countdown reads the latest end time; plan is display only', () => {
  const r = run([
    lock('d', '10', NOW - 3600, NOW - 3600 + 86400),
    lock('w', '10', NOW - 86400, NOW - 86400 + 7 * 86400),
  ]);
  assert.equal(r.active, true);
  assert.equal(r.expiresAt, NOW - 86400 + 7 * 86400);
  assert.equal(r.plan.id, 'weekly');
  assert.equal(r.activeCount, 2);
  assert.deepEqual(countdown(r.expiresAt, NOW), { totalSeconds: 6 * 86400, days: 6, hours: 0, minutes: 0, seconds: 0 });
  // Unusual duration (e.g. created elsewhere) still grants access, with no plan label.
  const odd = run([lock('x', '1', NOW - 10, NOW + 3 * 86400)]);
  assert.equal(odd.active, true);
  assert.equal(odd.plan, null);
});

test('access ends exactly at the end time', () => {
  const end = NOW + 60;
  const deposits = prepareSubscriptionDeposits(evidence([lock('a', '1', NOW - 10, end)]), { wallet: W, mint: M }, NOW);
  assert.equal(evaluateSubscription(deposits, plans, end - 1).active, true);
  assert.equal(evaluateSubscription(deposits, plans, end).active, false);
  assert.equal(evaluateSubscription(deposits, plans, end - 1).remainingSeconds, 1);
  assert.throws(() => evaluateSubscription(deposits, plans, NOW + 91), /stale/);
});

test('foreign wallet or mint, duplicates and unbound arrays are rejected', () => {
  assert.throws(() => run([lock('a', '1', NOW, NOW + 10, { depositor: 'Other' })]));
  assert.throws(() => run([lock('a', '1', NOW, NOW + 10, { mint: 'OtherMint' })]));
  assert.throws(() => run([lock('a', '1', NOW, NOW + 10), lock('a', '1', NOW, NOW + 10)]));
  assert.throws(() => evaluateSubscription([lock('a', '1', NOW, NOW + 10)], plans, NOW), /trusted/);
  assert.throws(() => prepareSubscriptionDeposits({ ...evidence([]), ts: NOW - 200 }, { wallet: W, mint: M }, NOW), /stale/);
});

test('planForDeposit tolerance', () => {
  const checked = validatePlans(plans);
  assert.equal(planForDeposit({ createdAt: 0, unlockAt: 86400 + 3600 }, checked).id, 'daily');
  assert.equal(planForDeposit({ createdAt: 0, unlockAt: 86400 + 3601 }, checked), null);
  assert.equal(planForDeposit({ createdAt: 0, unlockAt: 30 * 86400 - 60 }, checked).id, 'monthly');
});
