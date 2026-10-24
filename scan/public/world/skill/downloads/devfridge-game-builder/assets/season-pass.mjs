// Pure policy evaluation, NOT RPC verification, wallet authentication or score authority.
// The trusted account decoder supplies evidence; callers cannot substitute unbound arrays.
import { evaluateTimelocks } from './timelock-gate.mjs';

export const DURATION_TOLERANCE_S = 3600;
const U64_MAX = (1n << 64n) - 1n;
const contexts = new WeakMap();
const depositContexts = new WeakMap();

function time(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw Error('Use safe non-negative Unix seconds');
}

function validateTiers(tiers) {
  if (!Array.isArray(tiers) || !tiers.length) throw Error('Configure at least one tier');
  const ids = new Set();
  let days = 0, amount = 0n;
  for (const tier of tiers) {
    if (!tier || typeof tier.id !== 'string' || !tier.id || ids.has(tier.id) || typeof tier.label !== 'string' || !tier.label) throw Error('Use unique tier ids and non-empty labels');
    if (!Number.isSafeInteger(tier.days) || tier.days < 1 || !Number.isSafeInteger(tier.days * 86400)) throw Error('Tier days must be positive safe integers');
    if (typeof tier.amountRaw !== 'bigint' || tier.amountRaw <= 0n || tier.amountRaw > U64_MAX) throw Error('Tier amountRaw must be a positive u64 BigInt');
    // Array order is entitlement rank. Incomparable requirements need a different policy.
    if (tier.days < days || tier.amountRaw < amount) throw Error('Order tiers by non-decreasing days and amount');
    ids.add(tier.id); days = tier.days; amount = tier.amountRaw;
  }
}

function validateContext(context, nowSeconds) {
  time(nowSeconds);
  if (!context) throw Error('Use prepareSeasonPassDeposits with trusted verified evidence');
  evaluateTimelocks(context.evidence, context.policy, nowSeconds);
}

/** Bind an already verified RPC snapshot to the authenticated wallet and configured mint.
 * Does not prove account owner, PDA, vault balance, RPC authenticity or wallet ownership.
 * Those checks belong to the caller's trusted verifier, before calling this adapter.
 */
export function prepareSeasonPassDeposits(evidence, { wallet, mint }, nowSeconds) {
  time(nowSeconds);
  const policy = Object.freeze({ wallet, mint, minimumRaw: 1n, maxAgeSeconds: 90, aggregation: 'single' });
  evaluateTimelocks(evidence, policy, nowSeconds);
  const deposits = Object.freeze(evidence.activeLocks.map(deposit => Object.freeze({
    address: deposit.address, depositor: deposit.depositor, mint: deposit.mint,
    amount: deposit.amount, createdAt: deposit.createdAt, unlockAt: deposit.unlockAt,
  })));
  const context = Object.freeze({ policy, evidence: Object.freeze({ wallet, mint, ts: evidence.ts, activeLocks: deposits }) });
  contexts.set(deposits, context);
  for (const deposit of deposits) depositContexts.set(deposit, context);
  return deposits;
}

function matchTier(deposit, tiers, nowSeconds) {
  if (deposit.unlockAt <= nowSeconds) return null;
  const amount = BigInt(deposit.amount);
  const duration = deposit.unlockAt - deposit.createdAt;
  for (let rank = tiers.length - 1; rank >= 0; rank--) {
    const tier = tiers[rank];
    if (amount >= tier.amountRaw && duration >= tier.days * 86400 - DURATION_TOLERANCE_S) return tier;
  }
  return null;
}

/** Only accepts a deposit object returned by prepareSeasonPassDeposits. */
export function tierForDeposit(deposit, tiers, nowSeconds) {
  validateTiers(tiers);
  validateContext(depositContexts.get(deposit), nowSeconds);
  return matchTier(deposit, tiers, nowSeconds);
}

/** Highest tier is array order. expiresAt never extends a higher tier with a lower pass.
 * activeRaw is an informational sum, NEVER an admission threshold.
 */
export function evaluateSeasonPass(deposits, tiers, nowSeconds) {
  validateTiers(tiers);
  validateContext(contexts.get(deposits), nowSeconds);
  const qualifying = [];
  let activeRaw = 0n, highestRank = -1;
  for (const deposit of deposits) {
    if (deposit.unlockAt > nowSeconds) activeRaw += BigInt(deposit.amount);
    const tier = matchTier(deposit, tiers, nowSeconds);
    if (!tier) continue;
    const rank = tiers.indexOf(tier);
    qualifying.push(Object.freeze({ deposit, tier }));
    highestRank = Math.max(highestRank, rank);
  }
  const tier = highestRank < 0 ? null : tiers[highestRank];
  let expiresAt = null;
  for (const item of qualifying) if (item.tier === tier) expiresAt = Math.max(expiresAt ?? 0, item.deposit.unlockAt);
  return { eligible: tier !== null, tier, expiresAt, qualifying, activeRaw };
}
