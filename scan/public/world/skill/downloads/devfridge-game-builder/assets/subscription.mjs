// Subscription pass policy: Daily / Weekly / Monthly paid in SOL.
// Pure evaluation, NOT RPC verification, wallet authentication or score authority.
// The trusted account decoder supplies evidence; callers cannot substitute unbound arrays.
//
// Access rule: the connected wallet has at least one ACTIVE deposit of the configured mint.
// The deposited amount is NOT compared with a price or quote (swap output varies);
// only its existence, identity and end time matter. The countdown reads the deposit end time.
import { evaluateTimelocks } from './timelock-gate.mjs';

export const PLAN_DAYS = Object.freeze({ daily: 1, weekly: 7, monthly: 30 });
export const PLAN_MATCH_TOLERANCE_S = 3600;
const U64_MAX = (1n << 64n) - 1n;
const contexts = new WeakMap();

function time(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw Error('Use safe non-negative Unix seconds');
}

/** Owner plans: [{ id: 'daily'|'weekly'|'monthly', label, priceLamports: BigInt }].
 * Days come from the plan id; the owner sets which plans exist and their SOL price. */
export function validatePlans(plans) {
  if (!Array.isArray(plans) || !plans.length || plans.length > 3) throw Error('Configure one to three plans');
  const ids = new Set();
  for (const plan of plans) {
    if (!plan || !Object.hasOwn(PLAN_DAYS, plan.id) || ids.has(plan.id)) throw Error('Plan ids must be unique daily, weekly or monthly');
    if (typeof plan.label !== 'string' || !plan.label.trim()) throw Error('Plans need a label');
    if (typeof plan.priceLamports !== 'bigint' || plan.priceLamports <= 0n || plan.priceLamports > U64_MAX) throw Error('priceLamports must be a positive u64 BigInt');
    ids.add(plan.id);
  }
  return plans.map(plan => Object.freeze({ ...plan, days: PLAN_DAYS[plan.id] }));
}

/** Converts a decimal SOL string such as "0.05" to lamports without floating point. */
export function solToLamports(value) {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,9})?$/.test(value)) throw Error('Use a decimal SOL string with at most 9 decimals');
  const [whole, fraction = ''] = value.split('.');
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  if (lamports <= 0n) throw Error('Price must be positive');
  return lamports;
}

/** End time for the deposit, computed when the wallet handoff is prepared. */
export function planEndTime(plan, signingNowSeconds) {
  time(signingNowSeconds);
  const days = PLAN_DAYS[plan?.id];
  if (!days) throw Error('Unknown plan');
  return signingNowSeconds + days * 86400;
}

/** Amount to deposit in the same transaction as the SOL purchase: the swap's guaranteed
 * minimum output, so the deposit can never exceed what the purchase delivers. */
export function depositAmountFromQuote(simulatedOutRaw, slippageBps) {
  if (typeof simulatedOutRaw !== 'bigint' || simulatedOutRaw <= 0n || simulatedOutRaw > U64_MAX) throw Error('Simulated output must be a positive u64 BigInt');
  if (!Number.isSafeInteger(slippageBps) || slippageBps < 1 || slippageBps > 1000) throw Error('Slippage must be 1-1000 basis points');
  const minOut = simulatedOutRaw * BigInt(10000 - slippageBps) / 10000n;
  if (minOut <= 0n) throw Error('Quote too small for a deposit');
  return minOut;
}

/** Bind an already verified RPC snapshot to the authenticated wallet and configured mint.
 * Does not prove account owner, PDA, vault balance, RPC authenticity or wallet ownership. */
export function prepareSubscriptionDeposits(evidence, { wallet, mint }, nowSeconds) {
  time(nowSeconds);
  // Any positive deposit counts: minimumRaw 1n is a structural check, not a price check.
  const policy = Object.freeze({ wallet, mint, minimumRaw: 1n, maxAgeSeconds: 90, aggregation: 'single' });
  evaluateTimelocks(evidence, policy, nowSeconds);
  const deposits = Object.freeze(evidence.activeLocks.map(d => Object.freeze({
    address: d.address, depositor: d.depositor, mint: d.mint, amount: d.amount, createdAt: d.createdAt, unlockAt: d.unlockAt,
  })));
  contexts.set(deposits, Object.freeze({ policy, evidence: Object.freeze({ wallet, mint, ts: evidence.ts, activeLocks: deposits }) }));
  return deposits;
}

/** Which plan a deposit looks like (display only, never an admission rule). */
export function planForDeposit(deposit, plans) {
  const duration = deposit.unlockAt - deposit.createdAt;
  let best = null;
  for (const plan of plans) {
    const diff = Math.abs(duration - plan.days * 86400);
    if (diff <= PLAN_MATCH_TOLERANCE_S && (!best || diff < best.diff)) best = { plan, diff };
  }
  return best?.plan ?? null;
}

/** Only accepts an array returned by prepareSubscriptionDeposits.
 * Returns { active, expiresAt, remainingSeconds, deposit, plan, activeCount }. */
export function evaluateSubscription(deposits, plans, nowSeconds) {
  const checked = validatePlans(plans);
  time(nowSeconds);
  const context = contexts.get(deposits);
  if (!context) throw Error('Use prepareSubscriptionDeposits with trusted verified evidence');
  evaluateTimelocks(context.evidence, context.policy, nowSeconds); // rechecks freshness
  let latest = null, activeCount = 0;
  for (const deposit of deposits) {
    if (deposit.unlockAt <= nowSeconds || BigInt(deposit.amount) <= 0n) continue;
    activeCount++;
    if (!latest || deposit.unlockAt > latest.unlockAt) latest = deposit;
  }
  if (!latest) return { active: false, expiresAt: null, remainingSeconds: 0, deposit: null, plan: null, activeCount: 0 };
  return {
    active: true, expiresAt: latest.unlockAt, remainingSeconds: latest.unlockAt - nowSeconds,
    deposit: latest, plan: planForDeposit(latest, checked), activeCount,
  };
}

/** Countdown parts for the UI; recompute from expiresAt, never from a stored counter. */
export function countdown(expiresAt, nowSeconds) {
  time(nowSeconds);
  const left = Math.max(0, (expiresAt ?? 0) - nowSeconds);
  return { totalSeconds: left, days: Math.floor(left / 86400), hours: Math.floor(left % 86400 / 3600), minutes: Math.floor(left % 3600 / 60), seconds: left % 60 };
}
