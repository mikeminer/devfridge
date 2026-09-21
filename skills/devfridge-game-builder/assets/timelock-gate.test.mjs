import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTimelocks, toRawAmount } from './timelock-gate.mjs';
const now = 2_000_000_000;
const policy = { wallet: 'verified-wallet', mint: 'verified-mint', minimumRaw: 500_000_000_000n };
const lock = (address, amount, unlockAt = now + 60) => ({ address, depositor: policy.wallet, mint: policy.mint, amount, createdAt: now - 100, unlockAt });
const evidence = (...activeLocks) => ({ wallet: policy.wallet, mint: policy.mint, ts: now, activeLocks });

test('decimal conversion stays exact beyond Number precision', () => {
  assert.equal(toRawAmount('9007199254.740993', 6), 9007199254740993n);
  assert.throws(() => toRawAmount('1.0000001', 6));
  assert.throws(() => toRawAmount('500,000', 6));
  assert.throws(() => toRawAmount('0', 6));
  assert.throws(() => toRawAmount('18446744073709551616', 0));
});
test('same-mint partial locks aggregate and a sub-day expiry still qualifies', () => {
  const result = evaluateTimelocks(evidence(lock('a', '300000000000'), lock('b', '200000000000', now + 1)), policy, now);
  assert.equal(result.eligible, true); assert.equal(result.nextCheckAt, now + 1);
  assert.equal(evaluateTimelocks(evidence(lock('a', '499999999999')), policy, now).eligible, false);
});
test('expiry and duration policies are separate from original duration', () => {
  const data = evidence(lock('a', '500000000000', now));
  assert.equal(evaluateTimelocks(data, policy, now).eligible, false);
  const short = evidence(lock('a', '500000000000'));
  assert.equal(evaluateTimelocks(short, {...policy, minOriginalSeconds: 200}, now).eligible, false);
  assert.equal(evaluateTimelocks(short, {...policy, minRemainingSeconds: 61}, now).eligible, false);
  assert.equal(evaluateTimelocks(short, {...policy, minRemainingSeconds: 30}, now).nextCheckAt, now + 31);
});
test('single-lock policy rejects a total split across smaller locks', () => {
  const data = evidence(lock('a', '300000000000'), lock('b', '200000000000'));
  assert.equal(evaluateTimelocks(data, policy, now).eligible, true);
  assert.equal(evaluateTimelocks(data, {...policy, aggregation:'single'}, now).eligible, false);
});
test('recheck deadline advances at inclusive duration/freshness boundaries', () => {
  const data = {...evidence(lock('a', '500000000000', now + 30)), ts:now-90};
  const result = evaluateTimelocks(data, {...policy, minRemainingSeconds:30}, now);
  assert.equal(result.eligible, true); assert.equal(result.nextCheckAt, now + 1);
  assert.throws(() => evaluateTimelocks(data, policy, now + 1), /stale/);
  assert.equal(evaluateTimelocks({...data,ts:now}, {...policy,minRemainingSeconds:30}, now + 1).eligible, false);
});
test('duplicate, foreign, malformed, stale and future evidence fails closed', () => {
  const good = lock('a', '500000000000');
  assert.throws(() => evaluateTimelocks(evidence(good, good), policy, now));
  for (const override of [{depositor:'other'}, {mint:'other'}, {amount:500000000000}, {amount:'-1'}, {createdAt:now+60}]) {
    assert.throws(() => evaluateTimelocks(evidence({...good,...override}), policy, now));
  }
  for (const override of [{wallet:'other'}, {mint:'other'}, {ts:now-91}, {ts:now+6}, {activeLocks:null}]) {
    assert.throws(() => evaluateTimelocks({...evidence(good),...override}, policy, now));
  }
});
