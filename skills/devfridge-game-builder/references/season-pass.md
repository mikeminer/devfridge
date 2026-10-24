# Season Pass: policy, activation and player copy

Use a Season Pass as the default product model. Internally, one Fridge `create_lock` deposit establishes the pass. New wording does not change the program, make tokens liquid during the term, or remove fees. Read [program-and-verification.md](program-and-verification.md) before implementing a transaction and [seeker-wallet.md](seeker-wallet.md) for transport-specific requirements. This reference describes a build contract; the package does not contain a production transaction builder or native validator.

## Owner choices and tiers

Ask which features remain free, which the pass enables, and the amount and duration of every tier. Propose 1 Month / 6 Months / 1 Year only as a starting point; amounts, day counts, rank and benefits require the owner's decision. Configure `{ id, label, days, amountRaw }`, with positive integer days and exact raw `BigInt` amounts calculated from verified mint decimals. Keep the array in increasing entitlement rank, with non-decreasing duration and amount. Incomparable plans require an explicit policy rather than guessing a highest tier.

Mark and preselect the longest tier as **Best value** only when its token amount per day is strictly lower than every shorter tier. Compare cross-products with `BigInt`, not floating-point division. Otherwise omit that badge and ask which tier to select initially. This is a comparison of required tokens per day, not a market-value or investment claim.

**Example (Street Meat) — not a default:** 2,000,000 MEAT for 30 days, 7,000,000 for 182 days and 11,000,000 for 365 days; free access to levels 1–3 and a daily level. These quantities and benefits are not defaults for another game. Never silently copy them.

## Verified evidence and exact admission

The shipped [season-pass.mjs](../assets/season-pass.mjs) exports:

- `DURATION_TOLERANCE_S = 3600`.
- `prepareSeasonPassDeposits(evidence, { wallet, mint }, nowSeconds)`: validates and binds a trusted evidence snapshot to the authenticated connected wallet and configured mint.
- `tierForDeposit(deposit, tiers, nowSeconds)`: returns a tier or `null` for one prepared deposit.
- `evaluateSeasonPass(deposits, tiers, nowSeconds)`: returns `{ eligible, tier, expiresAt, qualifying, activeRaw }`.

`prepareSeasonPassDeposits` takes the unchanged [timelock-gate.mjs](../assets/timelock-gate.mjs) evidence shape: `{ wallet, mint, ts, activeLocks: [{ address, depositor, mint, amount, createdAt, unlockAt }] }`. Amount is a raw decimal string; times are safe integer Unix seconds. It runs the existing helper with `maxAgeSeconds: 90`, `aggregation: 'single'`, and a structural minimum of `1n`. It returns a frozen copied array tracked by a module-private `WeakMap`. Only those arrays and their member objects are accepted; reconstructed JSON, a `verified: true` flag, changed identity or duplicate address cannot bypass the binding. Each evaluation rechecks freshness and expiry.

**Trust boundary:** this adapter validates evidence shape, expected identity and freshness. It does not authenticate a wallet, verify an RPC response cryptographically, decode the program accounts, derive PDAs, or inspect a vault. The trusted account verifier must do that first. Never feed localStorage, URL parameters or an unauthenticated client claim into the adapter. A compromised client can call arbitrary JavaScript; any valuable server-side entitlement or leaderboard still needs independent server authority. An unavailable read is an unavailable result, never a successful pass.

```js
import { prepareSeasonPassDeposits, evaluateSeasonPass } from './season-pass.mjs';
// accountVerifier must perform every chain-account check below and bind the session wallet.
const evidence = await accountVerifier.readVerifiedPasses(connectedWallet, configuredMint);
const nowSeconds = Math.floor(Date.now() / 1000);
const deposits = prepareSeasonPassDeposits(evidence, {
  wallet: connectedWallet, mint: configuredMint,
}, nowSeconds);
const admission = evaluateSeasonPass(deposits, ownerConfiguredTiers, nowSeconds);
```

One deposit must independently meet all requirements: correct wallet and mint, `unlockAt > nowSeconds`, `amount >= tier.amountRaw`, and `unlockAt - createdAt >= tier.days * 86400 - 3600`. Never sum deposits to admit a player or round duration to days. Larger amounts and longer durations remain eligible. `activeRaw` sums verified active amounts for diagnostics only; it is never an admission threshold. `qualifying` contains `{ deposit, tier }` records for every independently qualifying deposit.

The result reports the highest rank met. **`expiresAt` is the latest expiry among deposits supporting that reported tier.** A lower tier with a later expiry must not prolong higher-tier benefits. Re-evaluate at that expiry; the player may then qualify for a lower tier. This is the security-safe meaning of “latest qualifying expiry” when several tiers coexist. Fresh verification is required at a new session and before stale evidence is reused; a 90-second snapshot is not a permanent entitlement. Do not interrupt an already authorised game round with repeated wallet prompts.

Tests cover every tier's duration and amount boundaries, tolerance ±1 second, expiry, foreign identities, stale/future evidence, duplicate deposits, two individually insufficient deposits, monotonic eligibility, later expiry, tier downgrade and values greater than `2^53`.

## Direct on-chain activation

Build the transaction inside the game. Sending the player to a website is not the default activation path. Optional legacy SDK navigation remains described only in [sdk-access.md](sdk-access.md).

The repository IDL pinned on 2026-10-24 is `idl.json` at commit `b8685f4f5e2d7c5cd97125876e0e767ac43067d4`, SHA-256 `ff7d8b5857f4824cce29d731cfa72c57b48f065743e0b3fa37da9d87e9e06c57`. Recheck the deployed program and this layout before each release: a repository match is not proof that an upgradeable deployment is unchanged. See the source and live-verification caveats in [program-and-verification.md](program-and-verification.md).

- Program: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`.
- `create_lock` discriminator: `abd85ca7a508995a`; data follows with `amount u64 LE`, `unlock_at i64 LE`, `lock_id u64 LE`, and no trailing bytes.
- Ordered accounts: depositor (signer, writable), mint, depositor's Token-2022 ATA, deposit PDA, its Token-2022 vault ATA, Token-2022 program, associated-token program, System program. Verify exact flags against the pinned IDL; the depositor ATA, deposit PDA and vault are writable.
- Derive the deposit PDA from `["lock", depositorBytes, mintBytes, lockIdLE]`. Choose the first free ID in 1–64; if all are occupied, a timestamp ID may be proposed and checked for collision. Persist the chosen ID before handoff; do not change it when reconciling an unknown result.
- Build a v0 transaction with one `SetComputeUnitLimit` instruction first, at most 400,000 units, followed by exactly one `create_lock`. No lookup tables, unrelated instructions or hidden transfers.
- Calculate `unlock_at = current signing time + tier.days * 86400` when preparing the actual wallet handoff, not when the review screen first opens. If the review remains open long enough to change the displayed end time, refresh the displayed time before final approval.

Before opening the review screen, verify the initialized Token-2022 mint, owner and decimals; reject TransferFee, TransferHook and unknown unsupported mint extensions. Verify the player's ATA program owner, mint, authority, unfrozen state and absence of incompatible CpiGuard. Check the selected tier's token balance and SOL needed for **live** rent of the deposit and vault accounts plus a current fee budget. A precheck failure must give its own plain sentence and keep a visible way to retry; do not fail silently.

Use this order: authenticated wallet → verified balances/accounts → review → freshly built transaction → read-only simulation → native validator when applicable → **synchronous durable pending record** → wallet handoff → signature/PDA reconciliation → fresh pass read. The pending record comes before the wallet opens, despite some older example flows placing persistence after signing. Only an explicit user action invokes a wallet signature; preparing this skill does not authorize one.

Browser injected-wallet flow uses `signAndSendTransaction`; MWA uses `signAndSendTransactions`. If MWA returns method-not-supported (`-32601`) before accepting a signature/send, capability fallback may use `signTransactions` and send the returned signed bytes through the game's allowlisted RPC proxy. A timeout or uncertain response is not method-not-supported and must never trigger a fresh signature. Retrying identical signed bytes, when valid and authorized, retains the same signature; it is not a new purchase. Every module of a lazy chain chunk imports its Buffer polyfill first rather than relying on another chunk's loading order.

## Read and decode accounts

Use `confirmed` reads with a bounded six-second timeout. Query `getProgramAccounts` on the program with data size `105`, the account discriminator at offset `0`, depositor at `8`, and mint at `40`. The pinned Lock discriminator is `08ff24cad2163989`; remaining fields are amount at `72`, createdAt at `80`, unlockAt at `88`, bump at `96`, and ID at `97`. Encode memcmp discriminator bytes as required by the RPC client; do not pass the hex string as an assumed base58 value.

If that RPC method is unavailable, derive IDs 1–64 and batch `getMultipleAccountsInfo`. This fallback cannot discover timestamp IDs or arbitrary IDs outside its range; retain pending/known deposit addresses and verify those directly too. A successful bounded search proves only its searched set. Do not tell a player with an unknown timestamp deposit that they have no pass. If both paths fail or evidence is incomplete, expose an unavailable/retry state.

For every candidate check program owner, exact data length, discriminator, depositor, mint, safe timestamps and unsigned raw amounts; rederive PDA, stored ID and bump; derive the Token-2022 vault ATA and verify its owner, mint, PDA authority and balance at least the recorded amount. Reject malformed, duplicate, foreign or inconsistent records. Preserve the RPC observation time; do not refresh the evidence timestamp just by rereading a local cache. The optional Scan SDK read path has different aggregation and caching semantics; it must not silently replace this evaluator.

## Android validator and recovery contract

Before opening a wallet, the native host validates the unsigned serialized v0 transaction independently of JavaScript. Require exactly one required signer equal to the connected wallet, zero nonzero signatures, no address lookup tables, the expected fee payer, exact account keys and signer/writable flags. Parse every compact length and instruction with bounds checks; reject duplicates that alter effective privileges, extra accounts, extra instructions, truncation and trailing bytes. Permit at most one `SetComputeUnitLimit` first and at most 400,000 units. Require exactly one expected-program `create_lock`, configured mint, an amount matching a configured tier and an end time within `now + tier.days * 86400 - 1800` through `now + tier.days * 86400 + 300`. Re-derive the depositor ATA, deposit PDA and vault. Confirm native and JS tier configurations agree.

Test valid fixtures, each field/account tamper, wrong signer/mint/program, excessive compute units, lookup tables, already-signed data, truncation at every boundary, trailing bytes and byte-flip fuzz. A random fuzzer is additional coverage, not a substitute for valid fixtures and explicit invariants. Wallet calls are single-flight, the activity must be RESUMED, and the gate must not re-render destructively during handoff. See [release-pitfalls.md](release-pitfalls.md).

Persist `requestId`, wallet, mint, tier, amount, chosen ID/PDA, intended expiry, creation time, transport, handoff status and any signature in a durable record before handoff. States: `awaiting-wallet` → `submitted(signature)` / `unknown` → `confirmed`, plus authoritative `declined`. Reconcile both signature status and the exact deposit PDA before presenting transaction confirmation; then perform a fresh admission read. A fully verified qualifying PDA may establish pass eligibility even when a lost signature leaves the original transaction's status unknown; do not invent that signature or assert that the same request was confirmed.

A stale `awaiting-wallet` record without a signature must get active reconciliation within a ten-minute recovery window. This time limit prevents a broken UI from waiting forever; **age alone never proves a broadcast did not happen**. Clear it only when durable native handoff evidence establishes no request was sent, or the wallet returned an authoritative decline with no competing in-flight request. If handoff may have happened and its outcome cannot be excluded, move to `unknown`, preserve the record and offer status checks/support instead of re-signing. A JS `TIMEOUT` means unknown. A missing PDA at one RPC read is not sufficient proof of failure. Never erase a possibly submitted record merely to enable another payment.

Map transport outcomes before display: `AUTH_FAILED` → reconnect instruction; `DECLINED`, `WALLET_REJECTED`, `WALLET_CANCELLED` → an accurately classified decline/cancellation only when authoritative; `BUSY` → finish the existing wallet request; `NOT_FOREGROUND` → return to the game; `OUTCOME_UNKNOWN` → check status, do not submit again. Never expose raw RPC or native text. The game must distinguish “the sheet was dismissed” from “the wallet refused the transaction.”

## Player copy and disclosures

Default gate and review copy follows the player's chosen locale. Translate the same disclosure substance, and test every supported language; the shipped lexical scanner is English-oriented and cannot certify all translations.

```player-copy/pass
<Game> Season Pass
Get Season Pass
Not enough <TOKEN> for the <tier> pass
Your <X> <TOKEN> stays held on-chain for <N> days, until your pass ends.
Activate Season Pass · <tier>
<TOKEN> held
Pass length
Pass ends
Approve in wallet
Season Pass active (<tier>) until <date>
```

Use a proper tier radiogroup. Live balance determines insufficient-token messaging and whether activation is enabled. Keep the selected tier's held-token amount and duration visible. The review shows the end time in local time **and UTC**, rent and network fees. Tokens are unavailable for use until the term ends; state that clearly without implying an early exit. The pass does not set a market value; token value can fall.

```player-copy/details
Details
The Solana program behind the Season Pass
Each deposit is checked on-chain against the connected wallet and selected tier.
Network fees and account rent apply.
Copy token address
Your tokens are unavailable for use until your pass ends.
When your pass ends and your <TOKEN> leaves the program, a 2% fee buys and burns PASTA.
The pass does not fix the token's market value. Its value can fall.
```

The Details section contains the actual program address, full mint and Copy control, verification policy, fees and rent. It may contain PASTA in the fee disclosure; this exception does not permit hiding the tokens' unavailable period or the fee elsewhere. Developer documentation and reviewer technical notes describe actual timelock mechanics honestly even though player text uses Season Pass terminology.

Player UI, wallet identity, errors and store copy avoid mechanical terms (`lock`, `locked`, `locking`, `unlock`, `timelock`, withdrawal/redemption/refund forms), DevFridge/Fridge branding and PASTA outside Details. Pass screens avoid pay/price/charge framing. Token-related copy never promises earnings, prizes, rewards or profit. Technical identifiers and dedicated developer documentation may use their accurate names. An owner-approved Free Play sponsor card has a narrow, explicit exception for its sponsor identity and Scan URL, never in pass or market chunks.

Implement a `plainWords` mapper from **structured error codes**, not raw-error string replacement. Pinned program errors: `6000 InvalidAmount` → “Choose a valid token amount.”; `6001 InvalidUnlockTime` → “Choose a pass ending in the future.”; `6002 InvalidMint` → “This token could not be verified.”; `6003 InvalidTokenAccount` → “The token account could not be verified.”; `6004 InvalidAuthority` → “Connect the wallet that owns these tokens.”; `6008 InsufficientBalance` → “Not enough tokens for this pass.” Reverify meanings against the pinned IDL. Unknown codes get a generic plain message and a private redacted diagnostic identifier, never the raw CamelCase name or RPC body. Unknown transaction outcomes get a distinct status-check message.

MWA identity uses the game's real name, `favicon.ico` relative to the identity URI, and the owner's real HTTPS domain. Ask for the domain in discovery. A missing domain blocks release, not local development. Do not substitute ecosystem branding or ship a guessed domain.

## Copy checks and their limits

[check-player-copy.mjs](../assets/check-player-copy.mjs) lexically scans JS/TS/JSX string literals and template fragments, HTML visible text and accessible labels, Android XML strings/manifest labels, Kotlin/Java outcome strings, and explicit Markdown player-copy fences. It skips comments, static module specifiers and object-property names. It is dependency-free, not a complete JS/TS parser or a translation checker. Scan dedicated UI/error modules; internal protocol strings can need reviewed, exact exceptions. Computed text, concatenation across modules, server copy and minifier transformations require DOM/screenshot assertions in addition to this guard.

```sh
node assets/check-player-copy.mjs references
node assets/check-player-copy.mjs src/ui/pass --scope pass
node assets/check-player-copy.mjs src/ui/market --scope market
node assets/check-player-copy.mjs dist/pass.js dist/market.js --dist --scope pass
node assets/check-player-copy.mjs dist/sponsor.js --dist --scope free-play --config copy-allowlist.json
node --test assets/season-pass.test.mjs assets/check-player-copy.test.mjs
```

Markdown authoring uses fences named `player-copy/pass`, `player-copy/market`, `player-copy/details`, `player-copy/free-play` or `player-copy/general`; unlabelled developer prose is not scanned. Config allowlist entries require exact `file`, `scope`, `text`, `rules` and a non-empty `reason`, with text limited to 512 characters. File paths are relative to the CLI working directory with `/` separators. No regex, path glob or blanket bundle exception is accepted. Brand exceptions are valid only in `free-play`; pass/market brand findings cannot be exempted. In dist mode, a raw `devfridge` check also catches identifiers; keep the opted-in sponsor component isolated from pass and market chunks, and allow only its reviewed text/URL literals. Example allowlist schema:

```json
{"allowlist":[{"file":"dist/sponsor.js","scope":"free-play","text":"scan.devfridge.cool","rules":["brand"],"reason":"Owner opted into the Free Play sponsor card; fixed permitted host."}]}
```

The CLI reports file, line and rule without echoing source content. Add actual rendered visible-text assertions for tier selection, balance failure, review, active state, offline status, rejected request and unknown-result recovery. Screenshot each state on device and inspect accessible labels too. Do not claim a string scan proves a live screenshot or all supported locales were reviewed.
