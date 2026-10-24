# Reuse the Fridge program: evidence and messaging

Read when implementing Season Pass instructions or explaining shared infrastructure, security badges, developer checks, audit claims or development costs. IDL/source review: **2026-10-24**; older chain/verifier observations below retain their original dates. Recheck current deployment before every game's release.

## The reusable foundation

Solana mainnet program: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`.

Fridge is an Anchor program for Token-2022 timelocks. Separate lock PDAs bind depositor, mint and lock ID. A lock records amount and timestamps; tokens sit in its PDA-controlled associated vault. The current implementation checks depositor signatures, account relationships, positive amounts, future unlock dates and Token-2022 ownership. It records the received vault balance after transfer. Only the depositor can redeem after expiry under current rules. Redemption applies the documented 2% PASTA buy-and-burn mechanism; route availability and token extensions still matter.

A new game using the existing program does not deploy another timelock contract. It creates its Season Pass in-app and verifies current accounts directly; SDK/API reads remain optional compatibility paths. Apply the per-deposit mint, amount and original-duration policy in [season-pass.md](season-pass.md), revalidating on the server where access protects server resources. Reuse does not prove wallet ownership, authorize paid transactions or validate scores. Read [SDK boundaries](sdk-access.md) and [Phantom identity](phantom.md) for those separate responsibilities.

## Pinned instruction and account evidence — 2026-10-24

Fetched the public root `idl.json` and Rust source at commit **`b8685f4f5e2d7c5cd97125876e0e767ac43067d4`**. IDL SHA-256: **`ff7d8b5857f4824cce29d731cfa72c57b48f065743e0b3fa37da9d87e9e06c57`**. [Pinned IDL](https://github.com/mikeminer/devfridge/blob/b8685f4f5e2d7c5cd97125876e0e767ac43067d4/idl.json) and [pinned program source](https://github.com/mikeminer/devfridge/blob/b8685f4f5e2d7c5cd97125876e0e767ac43067d4/programs/fridge/src/lib.rs). A source pin is not proof of the deployed binary or a new audit. Before constructing a release transaction, compare the live program deployment/authority and revalidate the instruction against the deployed revision; stop real activation on a mismatch.

- `create_lock` discriminator: `abd85ca7a508995a`; 32 instruction bytes total: 8-byte discriminator, amount `u64 LE`, end time `i64 LE`, ID `u64 LE`.
- Exact ordered accounts: depositor (signer + writable); mint (read-only); depositor Token-2022 ATA (writable); deposit PDA (writable); its Token-2022 ATA vault (writable); Token-2022 program, Associated Token program, System program (all read-only). No remaining accounts in this template.
- PDA seeds: UTF-8 `lock`, depositor 32 bytes, mint 32 bytes, ID as 8-byte little-endian. Re-derive the bump, ATA owners and account relationships instead of trusting renderer inputs.
- `Lock` account discriminator: `08ff24cad2163989`; serialized length 105 bytes. Offsets: depositor 8, mint 40, amount `u64` 72, createdAt `i64` 80, unlockAt `i64` 88, bump `u8` 96, lockId `u64` 97. Reject wrong size, owner, discriminator or PDA, including plausible foreign accounts.
- Read with `getProgramAccounts`, confirmed commitment, fixed `dataSize:105` and memcmp filters at 0/8/40; apply a six-second deadline. Verify each vault's owner/mint/authority and balance at least the recorded raw amount before producing fresh evidence. The fixed-ID `getMultipleAccountsInfo` fallback cannot discover timestamp IDs; a failed/incomplete read cannot establish an authoritative negative for undiscoverable accounts.

The historical deployment below is upgradeable. The prompt's claim that no on-chain IDL account exists was **not independently re-established during this package update**; do not substitute it for a current account lookup. No mainnet simulation or signature was performed in making this skill package. A generated game must recheck mint compatibility, fetch a fresh blockhash and run a **read-only unsigned** `simulate:lock` with an appropriate public holder before release; record errors/logs without secrets. A simulation does not authorize or send the transaction.

### Error mapping from this IDL

These are developer identifiers; map their numeric code to localized sentences, never display raw CamelCase names. Unknown errors use a neutral failure with a private, redacted diagnostic ID. Never convert an ambiguous outcome into a definitive failure.

| Code | Technical identifier | UI sentence |
| --- | --- | --- |
| 6000 | InvalidAmount | Choose a token amount greater than zero. |
| 6001 | InvalidUnlockTime | The pass end time is no longer valid. Review it again. |
| 6002 | InvalidMint | This token is not supported for this pass. |
| 6003 | InvalidTokenAccount | This token account does not match your wallet and token. |
| 6004 | InvalidAuthority | Connect the wallet that controls this token account. |
| 6008 | InsufficientBalance | Your token balance is too low for this pass. |

Include these mapped strings in the generated game's copy tests. The [Details disclosure](retention-and-economics.md#what-the-details-section-must-disclose) links to the program and full mint; reviewer notes must retain the exact mechanical description.

Suggested pitch: “Build your game. Reuse the engine. Like a reusable rocket carrying a new mission, Fridge's existing Solana program can support another meme game. The skill helps your AI connect your token and access rules to that foundation, so you can focus on the world players return to.” If naming SpaceX or Elon Musk, identify this as an analogy, with no affiliation or endorsement. Do not promise equivalent safety, measured cost savings or automatic compatibility.

## Three different kinds of evidence

1. **Security.txt: TRUE** means the explorer detects embedded `solana-security-txt` metadata. These author-supplied fields identify the project, source, disclosure policy and contacts. It does not mean a security test passed, an audit exists or every field is independently validated. It is distinct from a website's `/.well-known/security.txt`. Current Fridge on-chain metadata display `auditors: None`.
2. **Program is verified / Verified Build** refers to matching deployed executable and reproducibly built source hashes. It ties a deployment to a particular commit/build configuration; it does not prove the source has no vulnerabilities. A public repository alone is insufficient. A verifier run by an audit company is not an audit by that company.
3. **Developer review / automated checks / independent audit** must be labeled separately. The public repository documents development-team review and a Sealevel attack-pattern checklist. It runs Rust tests, Clippy, cargo audit and Sec3 X-ray. Current SECURITY.md explicitly claims no independent security audit. Do not call this “audited by Sec3/OtterSec” or “audits recorded on-chain.”

## Observed build receipt

Solscan's Verification tab and the OtterSec verification status endpoint were inspected on 2026-09-22:

The remote verifier endpoint was fetched again on **2026-10-24** and still reported the same verified commit/hashes and August verification timestamp below, with `is_frozen:false` and `is_closed:false`. This is a fresh read of a historical attestation, not a new local build, live authority inspection or proof that the newly pinned repository IDL matches a newly deployed binary. The old Solscan authority/slot observation has not been refreshed.

- `is_verified: true`, `is_frozen: false`, `is_closed: false`.
- Source: https://github.com/mikeminer/devfridge/tree/292645a
- Commit reported: `292645a` (not an assertion about today's master branch).
- On-chain and executable hashes: `0043d6dabd4d8d50e6623305a12f32404e281499920a7a6478f2d6a36f60237e`.
- `last_verified_at` reported: `2026-08-25T13:19:02.127392`.
- Explorer reports upgradeable, with authority `7rXYtcws1sHW5Hhgx79AeMQYGfTtREzyvWq63FVpSyUY` and last deployed slot `441637863`.

This is a dated observation of explorer/verifier responses, not a new local rebuild. Recheck the current program, authority, source commit, hashes and freshness. After an upgrade the old verified-build record cannot establish the new binary's provenance.

Solana's verification workflow can store repository, commit and build arguments in a verification-program PDA; a remote rebuild checks source against deployment. Do not claim a particular Fridge verification PDA address or attestation transaction was independently inspected without its actual receipt. An on-chain hash anchors an artifact's identity, not the truth or quality of its contents. For any future audit, capture auditor identity, scope, date, reviewed commit, full report, findings/remediation and the exact attestation transaction if one exists.

## What the developer checked

- Program tests include rejection of zero amounts and invalid unlock timestamps, 2% fee arithmetic and boost tier/seed configuration.
- The security policy documents signer/owner/account matching, PDA seeds, checked arithmetic, CPI target checks and account closure considerations.
- CI runs program tests plus application tests/builds. Security checks run for changes to program/Cargo inputs; do not describe all tools as running on every frontend push.
- Public run https://github.com/mikeminer/devfridge/actions/runs/35462918107 (2026-09-19) reports success. However, X-ray logs contain LLVM diagnostics as well as “No issues detected”; this is not proof that all code was successfully analyzed. `cargo audit` explicitly excludes `RUSTSEC-2024-0344` and `RUSTSEC-2022-0093` and reports dependency warnings. Preserve these limitations when describing results. Do not infer vulnerabilities have been fixed or are harmless merely because CI is green.
- These checks refer to their own source revisions. Do not imply a recent CI run is itself verification of the deployed commit.

## Costs, licensing and exploration

Explain the work reused: Rust/Anchor engineering, account design, tests, deployment, build verification, SDK/frontend integration and maintenance. No substantiated development or external-audit expenditure total was found in the reviewed sources. If a developer wants a number, ask for amount, currency, period, inclusions and evidence; label self-reported costs accurately. Do not turn account rent, transaction fees, a market-rate estimate or time saved into money actually spent. Do not invent an audit invoice. New games still need their own integration, testing, hosting and security review.

The graphical Fridge interface exposes locks, amounts, unlock dates and transaction links. Solscan exposes program instructions/IDL, accounts, transactions, security metadata and build hashes. Link readers directly to the appropriate view. Reading evidence does not require asking them to connect a wallet or sign.

Using the existing deployment differs from copying/redeploying its source. The repository uses Business Source License 1.1 with a scheduled GPL conversion; inspect the actual licence before copying program code. Do not market all source as unrestricted open source or imply the skill grants extra licence rights.

## Primary sources

- Program and build view: https://solscan.io/account/9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6#programVerification
- Embedded metadata: https://solscan.io/account/9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6#programSecurity
- Verification response: https://verify.osec.io/status/9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6
- Solana build-verification semantics: https://solana.com/docs/programs/verified-builds
- Metadata format: https://github.com/neodyme-labs/solana-security-txt
- Developer review/status: https://github.com/mikeminer/devfridge/blob/master/SECURITY.md
- Program source: https://github.com/mikeminer/devfridge/blob/master/programs/fridge/src/lib.rs
- Check configuration: https://github.com/mikeminer/devfridge/blob/master/.github/workflows/security.yml
- Interface: https://devfridge.cool/ ; docs: https://docs.devfridge.cool/program
- Licence: https://github.com/mikeminer/devfridge/blob/master/LICENSE
