# Subscription pass: Daily, Weekly and Monthly in SOL

New games sell access as a **subscription pass**: Daily (1 day), Weekly (7 days) or Monthly (30 days), paid in SOL. In one wallet-approved transaction, the SOL buys the game's Token-2022 token on its market and the bought tokens are deposited in the existing Fridge program until the pass ends. The player sees a subscription with a countdown, never a timelock.

This is developer documentation: it names the real mechanics so builders and reviewers can implement and audit them. Player copy follows [the copy rules below](#player-copy). Read [program-and-verification.md](program-and-verification.md) for the program layout and [in-game-market.md](in-game-market.md) for the route, quote and swap rules this purchase reuses. This reference describes a build contract; the package does not contain a production transaction builder or native validator.

## Owner choices (asked at the start)

Ask these in [discovery](discovery.md) together with the RPC, the Token-2022 mint and the website domain:

- Which plans to sell: any of `daily`, `weekly`, `monthly` (default proposal: all three).
- The SOL price of each plan. Prices are the owner's decision; never copy another game's prices. Convert with `solToLamports('0.05')` from [subscription.mjs](../assets/subscription.mjs); never use floating point.
- What the subscription opens and what stays free.

Configure `[{ id: 'daily', label: 'Daily Pass', priceLamports }, …]`. Days come from the plan id (1 / 7 / 30) and are not configurable per game, so every DevFridge game means the same thing by "Weekly".

## Admission rule

**A wallet has an active subscription when it has at least one deposit of the configured mint whose end time is in the future.** The deposited amount is never compared with a price, a quote or a tier: the swap output changes with the market, so an exact-amount check would reject valid purchases. Only existence, identity (wallet + mint, verified account) and end time matter.

- The countdown reads the deposit's own `unlockAt`. With several active deposits, use the latest end time.
- The plan label shown ("Weekly Pass") is display only: the plan whose duration matches the deposit's original length within one hour. A deposit with another length still grants access, without a plan label.
- A deposit made outside the game for the same mint and wallet also grants access. This is intended: the rule is "a subscription exists", not "this game sold it".
- Buying again while active is allowed and creates another deposit; access then lasts until the latest end time. Do not add the durations together.
- Access ends exactly at `unlockAt`. Re-read at that moment and show the expired state with a way to subscribe again. There is no automatic renewal.

The [subscription helper](../assets/subscription.mjs) implements this:

```js
import { validatePlans, prepareSubscriptionDeposits, evaluateSubscription, countdown } from './subscription.mjs';
// accountVerifier must perform every chain-account check below and bind the session wallet.
const evidence = await accountVerifier.readVerifiedDeposits(connectedWallet, configuredMint);
const now = Math.floor(Date.now() / 1000);
const deposits = prepareSubscriptionDeposits(evidence, { wallet: connectedWallet, mint: configuredMint }, now);
const sub = evaluateSubscription(deposits, ownerPlans, now); // { active, expiresAt, remainingSeconds, plan, deposit }
const left = countdown(sub.expiresAt, now);                   // { days, hours, minutes, seconds }
```

Evidence uses the unchanged [timelock-gate.mjs](../assets/timelock-gate.mjs) shape `{ wallet, mint, ts, activeLocks: [{ address, depositor, mint, amount, createdAt, unlockAt }] }`, at most 90 seconds old; each evaluation rechecks freshness. **Trust boundary:** the helper validates shape, identity and freshness only. It does not authenticate a wallet, verify RPC data, decode accounts, derive PDAs or inspect vaults; the trusted verifier does that first. Never feed localStorage, URL parameters or client claims into it. An unavailable read is an unavailable result, never an active subscription. Run `node --test assets/subscription.test.mjs`.

Count the countdown down locally between reads, but recompute it from `expiresAt`, and re-verify at a new session, after resume and at expiry. Do not interrupt a round already in progress with wallet prompts.

## Purchase transaction

Build it inside the game; sending the player to a website is not the purchase path.

1. **Route and quote.** Resolve the token's live market from chain state exactly as in [in-game-market.md](in-game-market.md): the Pump bonding curve while it trades, the canonical PumpSwap pool after graduation, or another reviewed route. Input is the plan's exact `priceLamports`. Simulate to get the expected output.
2. **Deposit amount = guaranteed minimum output.** `depositAmountFromQuote(simulatedOut, slippageBps)` returns `floor(out × (10000 − slippage) / 10000)`. The swap's `minOut` and the deposit amount are the same number, so the deposit can never exceed what the purchase delivers; any extra tokens stay in the player's wallet. Default slippage 2%, owner-configurable 1–5%.
3. **End time.** `unlock_at = planEndTime(plan, signingNow)` (now + 1 / 7 / 30 days), computed when the wallet handoff is prepared, not when the review opens.
4. **One v0 transaction**, in this order: `SetComputeUnitLimit` (≤ 400,000), any route-required ATA/wrapped-SOL setup, the swap with `minOut`, then exactly one Fridge `create_lock` with `amount = minOut`, `unlock_at` and the chosen lock ID. No unrelated instructions, transfers, delegates, tips or lookup tables the validator cannot fully resolve.

Fridge layout, pinned 2026-10-24 (`idl.json` at commit `b8685f4f5e2d7c5cd97125876e0e767ac43067d4`, SHA-256 `ff7d8b5857f4824cce29d731cfa72c57b48f065743e0b3fa37da9d87e9e06c57`; recheck the deployed program before each release):

- Program `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`; `create_lock` discriminator `abd85ca7a508995a`; data `amount u64 LE`, `unlock_at i64 LE`, `lock_id u64 LE`, no trailing bytes.
- Accounts: depositor (signer, writable), mint, depositor's Token-2022 ATA (writable), deposit PDA (writable), its Token-2022 vault ATA (writable), Token-2022 program, associated-token program, System program.
- Deposit PDA `["lock", depositor, mint, lockIdLE]`. Choose the first free ID in 1–64 (a timestamp ID only after a collision check). Persist it before handoff and never change it while reconciling.

Before the review: verify the initialized Token-2022 mint, owner and decimals; reject TransferFee, TransferHook and unknown extensions. Check SOL for the price plus live rent (deposit, vault, first-time ATA) and a current fee budget. Every precheck failure gets its own plain sentence and a retry.

Order: authenticated wallet → prechecks → review → freshly built transaction → read-only simulation of the **final** transaction → native validator when applicable → **synchronous durable pending record** → wallet handoff → signature/PDA reconciliation → fresh subscription read. Browser wallets use `signAndSendTransaction`; MWA uses `signAndSendTransactions`, with the documented `signTransactions` fallback only after a definite `-32601` before any signature. A timeout is never a reason to sign again.

The [RPC proxy](rpc-proxy.md) must allow `simulateTransaction`, and its transaction program allowlist must contain exactly the reviewed programs: Compute Budget, Associated Token, the route's swap program(s) and Fridge, with the swap program and Fridge required.

## Read and decode accounts

Use `confirmed` reads with a six-second timeout. `getProgramAccounts` on the program with `dataSize: 105`, the Lock discriminator `08ff24cad2163989` at offset 0 (base58-encode the bytes; do not pass the hex string), depositor at 8 and mint at 40. Remaining fields: amount 72, createdAt 80, unlockAt 88, bump 96, ID 97. The public Solana RPC answers this query (checked 2026-11-01); private providers may restrict it.

If the method is unavailable, derive IDs 1–64 and batch `getMultipleAccounts`; this cannot discover timestamp IDs, so also check pending/known deposit addresses. A partial search never proves "no subscription": show an unavailable/retry state.

For every candidate check program owner, data length, discriminator, depositor, mint, safe timestamps and `amount > 0`; rederive PDA, ID and bump; derive the vault ATA and verify owner, mint, PDA authority and a positive balance. Reject malformed, duplicate, foreign or inconsistent records. Keep the RPC observation time as the evidence timestamp.

## Android validator and recovery

The native host validates the unsigned v0 transaction independently of JavaScript: one required signer equal to the connected wallet, zero signatures, expected fee payer, exact account keys and flags, bounded parsing of every instruction, no extra instructions/accounts/trailing bytes, at most one compute-limit instruction ≤ 400,000. Require the reviewed swap with input lamports equal to a configured plan price and the reviewed `minOut`, then exactly one `create_lock` for the configured mint with `amount == minOut` and `unlock_at` within `now + plan.days × 86400 − 1800` … `+ 300`. Re-derive ATA, PDA and vault. Test valid fixtures and tampering of every field, route account, program, price, minimum, amount, signer, compute budget, truncation and trailing bytes.

Persist `requestId`, wallet, mint, plan, price, `minOut`, lock ID/PDA, intended end time, transport, handoff status and any signature before handoff. States: `awaiting-wallet` → `submitted(signature)` / `unknown` → `confirmed`, plus authoritative `declined`. Reconcile the signature and the exact deposit PDA, then read the subscription again. A verified deposit PDA establishes access even if the signature was lost. Age alone never proves nothing was sent; a possibly submitted request moves to `unknown` and offers a status check, never a new payment. Map `AUTH_FAILED`, `DECLINED`/`WALLET_REJECTED`/`WALLET_CANCELLED` (only when authoritative), `BUSY`, `NOT_FOREGROUND` and `OUTCOME_UNKNOWN` to plain messages.

## Player copy

The player buys a subscription. Player UI, wallet identity, errors and Store copy never mention timelocks, locking, vaults, deposits, the Fridge or DevFridge program, program addresses, PASTA, redemption or withdrawal. Price wording is normal here: the pass is sold in SOL.

```player-copy/pass
<Game> subscription
Daily Pass · <price> SOL
Weekly Pass · <price> SOL
Monthly Pass · <price> SOL
Subscribe
Subscription active · <time> left
Your <plan> ends on <date>
Subscription ended. Subscribe again to keep playing.
Not enough SOL for this pass and the network fee.
Approve in your wallet
We could not confirm the result. Check your wallet activity before you pay again.
Check again
```

Before approval the review shows: plan, price in SOL, network fee and first-time account setup, the end date in local time and UTC, and one plain sentence about what the SOL buys:

```player-copy/details
Details
Your SOL buys <TOKEN> for your wallet. That <TOKEN> stays set aside for your subscription until it ends.
Token value can change.
Network fees and account setup are separate.
Token address
Copy
```

This sentence stays even though the mechanism is not explained: the wallet's own confirmation screen shows the token purchase, and a player who sees a swap they were not told about may reject the transaction or report the game. It also keeps the Store listing and legal pages truthful. Full mechanics (deposit, end time, the 2% PASTA fee when tokens leave the program, market risk) belong in the game's [terms](public-site.md) and reviewer notes, not in game screens.

Map program errors from structured codes, not raw strings: `6000 InvalidAmount` → "This pass could not be prepared. Try again."; `6001 InvalidUnlockTime` → "The pass end time expired. Review it again."; `6002 InvalidMint` → "This token could not be verified."; `6003 InvalidTokenAccount` → "Your token account could not be verified."; `6004 InvalidAuthority` → "Connect the wallet you are paying with."; `6008 InsufficientBalance` → "The purchase returned fewer tokens than expected. Try again." Unknown codes get a generic message and a private diagnostic ID.

MWA identity uses the game's real name and the owner's HTTPS website domain from discovery. A missing domain blocks release, not development.

## Copy checks

Run [check-player-copy.mjs](../assets/check-player-copy.mjs) on pass, market and details UI. Rules: `mechanics` (lock/timelock/redeem/withdraw/refund), `brand` (DevFridge/Fridge), `pasta`, `pass-mechanism` (vault, deposit, smart contract, program address/account/ID) and `token-promise` (earn, reward, profit, prize).

```sh
node assets/check-player-copy.mjs references
node assets/check-player-copy.mjs src/ui/pass --scope pass
node assets/check-player-copy.mjs src/ui/details --scope details
node assets/check-player-copy.mjs dist/pass.js --dist --scope pass
node --test assets/subscription.test.mjs assets/check-player-copy.test.mjs
```

The checker is lexical, English-oriented and cannot certify translations or computed strings. Add rendered-text assertions and device screenshots for plan selection, insufficient SOL, review, active countdown, expiry, rejection and unknown result.

## Existing games with token-amount passes

Games already released with token-amount Season Pass tiers (for example Street Meat) keep their policy unless the owner asks to migrate. [season-pass.mjs](../assets/season-pass.mjs) still implements that legacy rule (one deposit meeting a tier's exact raw amount and duration, one-hour tolerance); its tests remain in `assets/season-pass.test.mjs`. Do not use it for new games.
