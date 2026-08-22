# Security Policy — DevFridge

Program ID: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`

## Supported Code

Security fixes target the current `master` branch and the deployed DevFridge program and web apps.

## Audit Status

**No independent security audit is claimed or published at this time.**

The Fridge Anchor program has been reviewed by the development team and subjected to automated static analysis, but no third-party security firm has performed a formal audit. Users should treat this as unaudited software and limit their exposure accordingly.

Public source, automated tests, and operational monitoring are transparency measures, not substitutes for an independent audit.

### Scanner Boundary

DevFridge Scan reports observable on-chain and market signals. Its risk grade is not a security audit, endorsement, investment recommendation, or guarantee. Sponsored placements never change scanner checks, warnings, thresholds, or grades.

### Automated Analysis

| Tool | Status | Result |
|------|--------|--------|
| `cargo clippy -- -D warnings` | CI (every push) | Clean — zero warnings |
| `cargo audit` | CI (every push) | 2 advisories in Solana SDK transitive deps (see below) |
| Sec3 X-ray v0.0.6 | CI (every push) | **No issues detected** across all 4 attack surfaces |

**Sec3 X-ray report summary (2026-08-22):**
Analyzed all 4 instruction entry points (`create_lock`, `claim`, `boost`, `crank_buyback`). Result: "No issues detected."
Full report available as a GitHub Actions artifact on every push.

**cargo audit known advisories (upstream, not fixable without Anchor version bump):**
- `RUSTSEC-2024-0344`: `curve25519-dalek` timing variability — transitive dep from Solana SDK. Does not affect Fridge program logic (no custom scalar operations).
- `RUSTSEC-2022-0093`: `ed25519-dalek` double-key oracle — transitive dep from Solana SDK. Does not affect Fridge (no custom ed25519 signing).

### Sealevel-Attacks Checklist

Cross-referenced against [coral-xyz/sealevel-attacks](https://github.com/coral-xyz/sealevel-attacks):

| Attack Vector | Status | Notes |
|---------------|--------|-------|
| **Missing signer check** | Mitigated | `depositor`, `payer`, `cranker` are all `Signer<'info>` |
| **Missing owner check** | Mitigated | Anchor `Account<>` and `InterfaceAccount<>` enforce owner/program checks |
| **Account data matching** | Mitigated | `has_one`, `require_keys_eq!`, and PDA seed constraints enforce relationships |
| **Reinitialization** | Mitigated | `init` on Lock prevents reuse; `init_if_needed` on Boost is intentional (extends expiry window) |
| **Arbitrary CPI** | Mitigated | Jupiter CPI validates `program_id == JUPITER_V6` before `invoke_signed` |
| **Integer overflow** | Mitigated | All arithmetic uses `checked_mul`, `checked_div`, `checked_add`, `checked_sub` |
| **PDA seed collision** | Mitigated | Lock PDA seeds include `[depositor, mint, lock_id]` — unique per user per mint per lock |
| **Type cosplay** | Mitigated | Anchor 8-byte discriminator prevents account type confusion |
| **Closing accounts** | Mitigated | `close = depositor` on claim; vault closed via `close_account` CPI |
| **Duplicate mutable accounts** | Mitigated | Anchor rejects duplicate writable accounts in named structs |
| **Bump seed canonicalization** | Mitigated | PDA bumps stored on creation, reused on claim via `bump = lock.bump` |

**Items to note:**

- `burn_authority` and `vault` in `BoostFeature`/`CrankBuyback` are `UncheckedAccount` — acceptable because they are PDAs with fixed seeds (`[BURN_SEED]`, `[BOOST_VAULT_SEED]`) and the program never trusts their data content.
- `mint` in `BoostFeature` is `UncheckedAccount` — validated by `constraint = lock.mint == mint.key()`.
- `init_if_needed` is used on `depositor_ata` (Claim), `boost` (BoostFeature), `wsol_ata` and `pasta_ata` (CrankBuyback). These are all intentional: ATAs may not exist yet, and Boost accounts extend rather than reset.
- The `test-cluster` feature flag bypasses Jupiter buyback and burns the locked mint directly. **This must never be enabled on mainnet.** CI does not build with this feature outside of test targets.
- `remaining_accounts` is used for Jupiter route accounts. The program validates the first remaining account is the Jupiter program ID but does not individually validate subsequent accounts — Jupiter itself enforces its own account constraints.

## Bounty Program

We offer a bug bounty funded from future Feature (boost) SOL fees. There is no upfront bounty pool — payouts are made from accrued protocol revenue on confirmed findings only.

**Scope:** The Anchor program in `programs/fridge/src/lib.rs` and the IDL in `idl.json`.

**Severity tiers:**
- **Critical** (loss of locked funds, unauthorized claim): up to 50% of accrued boost vault balance at time of report
- **High** (fee bypass, griefing that blocks claims): up to 25% of accrued boost vault balance
- **Medium** (incorrect accounting, minor state corruption): discretionary, disclosed publicly

**Out of scope:** Frontend, bot, scanner API, social engineering, known limitations listed above.

## Reporting a Vulnerability

Use only the contacts published at https://connect.devfridge.cool.

Alternatively, open a private security advisory on GitHub at [github.com/mikeminer/devfridge/security/advisories](https://github.com/mikeminer/devfridge/security/advisories).

Please include:
- The affected program, API, frontend, bot, or SDK component
- Clear reproduction steps
- The expected security impact
- A safe proof of concept that does not expose user funds or secrets

Do not open a public issue for an unpatched exploitable vulnerability. Never send a private key, seed phrase, production secret, or unnecessary personal data.

We commit to:
- Acknowledging receipt within 48 hours
- Providing a fix timeline within 7 days
- Crediting the reporter (unless they prefer anonymity)

## Known Limitations

1. **No formal audit.** See above.
2. **Thin liquidity.** $PASTA is a micro-cap token (~$8.9k FDV). The Jupiter buyback path depends on available DEX liquidity at claim time. Low liquidity may cause claims of non-PASTA tokens to fail or suffer high slippage.
3. **Program is not frozen.** The upgrade authority has not been revoked. The deployer can upgrade the program. This is disclosed, not hidden.
4. **Permissionless crank.** Anyone can call `crank_buyback`. This is by design (protocol-owned liquidity disposal), but means the timing of PASTA burns is not controlled by the team.
5. **Holder concentration.** Top-10 holders control ~78% of supply (including the LP pool at 45%). See [`HOLDERS.md`](HOLDERS.md) for full wallet-level breakdown, insider disclosures, and verification methodology.
