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
| **Arbitrary CPI** | Mitigated | Jupiter v6 exact-in routes only. Source, destination, mints, and fee accounts are pinned to the burn-PDA escrow and the burn-PDA PASTA ATA. Other writable burn-controlled token accounts are rejected. Output is a balance delta, not an absolute balance. |
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
- Jupiter route accounts still arrive as `remaining_accounts`, after named accounts for the PASTA mint, the burn-PDA fee ATA, the burn-PDA PASTA ATA, and the Jupiter v6 program. The program parses the route header and rejects any destination other than that PASTA ATA. A pre-seeded PASTA balance does not count: the burn PDA's PASTA balance must increase by at least the program floor (`MIN_CLAIM_PASTA_OUT` = 1 PASTA, or `max(1 PASTA, lamports)` on `crank_buyback`), and the caller cannot set a lower minimum. The escrowed input must be spent in full. Burn-PDA lamports must not fall during the CPI.
- `crank_buyback` is restricted to `CRANK_AUTHORITY` (`GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W`) and capped at 0.5 SOL per instruction.

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
2. **Thin liquidity.** $PASTA is a micro-cap token (~$8.9k FDV, ~$6.3k pool depth). LP tokens are permanently burned (supply = 0), so liquidity cannot be rugged, but it is thin. The Jupiter buyback path depends on available DEX liquidity at claim time — low liquidity may cause non-PASTA claims to fail due to slippage. See [`LIQUIDITY.md`](LIQUIDITY.md) for full details and live tracking links.
3. **Program is not frozen.** The upgrade authority has not been revoked. The deployer can upgrade the program. This is disclosed, not hidden.
4. **Crank authority.** `crank_buyback` is not permissionless. Only the treasury crank authority can call it, and each call is capped at 0.5 SOL. Burns can still lag Feature payments until that authority cranks. The PASTA-per-lamport floor is a backstop against dust output, not a price oracle: a quote that cannot clear it reverts and leaves the vault in place.
5. **Claim account migration.** `claim` now requires `pasta_mint`, `fee_ata` (burn-PDA ATA for the locked mint), `pasta_ata`, and `jupiter_program` on every claim, including PASTA and devnet/testnet burns that do not swap. The fee ATA must exist before the instruction. `test-cluster` still burns the locked mint in place and does not invoke Jupiter. Do not enable `test-cluster` on mainnet.
6. **Holder concentration.** Top-10 holders control ~78% of supply (including the LP pool at 45%). See [`HOLDERS.md`](HOLDERS.md) for full wallet-level breakdown, insider disclosures, and verification methodology.
