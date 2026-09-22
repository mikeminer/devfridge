# Reuse the Fridge program: evidence and messaging

Read when explaining the shared infrastructure, security badges, developer checks, audit claims or development costs. Observation date: 2026-09-22. Recheck current status before publishing a new game's claims.

## The reusable foundation

Solana mainnet program: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`.

Fridge is an Anchor program for Token-2022 timelocks. Separate lock PDAs bind depositor, mint and lock ID. A lock records amount and timestamps; tokens sit in its PDA-controlled associated vault. The current implementation checks depositor signatures, account relationships, positive amounts, future unlock dates and Token-2022 ownership. It records the received vault balance after transfer. Only the depositor can redeem after expiry under current rules. Redemption applies the documented 2% PASTA buy-and-burn mechanism; route availability and token extensions still matter.

A new game using the existing program does not deploy another timelock contract. It reads lock evidence through the SDK/API and applies its own mint, amount, duration and character policy. Revalidate on the server where access protects server resources. Reuse does not prove wallet ownership, authorize paid transactions or validate scores. Read sdk-access.md and phantom.md for those separate responsibilities.

Suggested pitch: “Build your game. Reuse the engine. Like a reusable rocket carrying a new mission, Fridge's existing Solana program can support another meme game. The skill helps your AI connect your token and access rules to that foundation, so you can focus on the world players return to.” If naming SpaceX or Elon Musk, identify this as an analogy, with no affiliation or endorsement. Do not promise equivalent safety, measured cost savings or automatic compatibility.

## Three different kinds of evidence

1. **Security.txt: TRUE** means the explorer detects embedded `solana-security-txt` metadata. These author-supplied fields identify the project, source, disclosure policy and contacts. It does not mean a security test passed, an audit exists or every field is independently validated. It is distinct from a website's `/.well-known/security.txt`. Current Fridge on-chain metadata display `auditors: None`.
2. **Program is verified / Verified Build** refers to matching deployed executable and reproducibly built source hashes. It ties a deployment to a particular commit/build configuration; it does not prove the source has no vulnerabilities. A public repository alone is insufficient. A verifier run by an audit company is not an audit by that company.
3. **Developer review / automated checks / independent audit** must be labeled separately. The public repository documents development-team review and a Sealevel attack-pattern checklist. It runs Rust tests, Clippy, cargo audit and Sec3 X-ray. Current SECURITY.md explicitly claims no independent security audit. Do not call this “audited by Sec3/OtterSec” or “audits recorded on-chain.”

## Observed build receipt

Solscan's Verification tab and the OtterSec verification status endpoint were inspected on 2026-09-22:

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
