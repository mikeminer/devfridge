---
type: "Documentation"
title: "How the risk grade works"
description: "DevFridge investor knowledge: How the risk grade works"
resource: "https://docs.devfridge.cool/methodology"
tags: ["devfridge", "investors"]
timestamp: "2026-09-10T15:18:04Z"
generated: true
---

# How the risk grade works

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/methodology) · ok · last successful observation: 2026-09-10T15:18:04Z · last attempt: 2026-09-10T15:18:04Z.

METHODOLOGY

## How the risk grade works

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

DevFridge turns the visible checks in each report into an A–E risk grade. The grade is a compact summary of the current snapshot, not a prediction, audit, endorsement, or guarantee.

### Checks included

- Whether mint authority is revoked.

- Whether freeze authority is revoked.

- Top-10 on-chain owner concentration, excluding verified bonding-curve and supported AMM reserves and attributing Fridge vault balances to depositors.

- Whether DEX liquidity is present and whether LP status can be verified.

- Whether a live DevFridge lock exists.

- Whether Metaplex metadata is mutable or unavailable.

- Whether Token-2022 extensions require additional review.

### Grade calculation

Each displayed check contributes points: safe 0, unknown 1, caution 2, and danger 4.

- A: 0 points

- B: 1–2 points

- C: 3–4 points

- D: 5–7 points

- E: 8 or more points

Unknown data is never treated as safe. Concentration is caution above 40% and danger above 70%. These thresholds are product heuristics for triage, not universal standards.

### Holder concentration

Scan reads the complete mint-filtered token account set, checks that balances sum to mint supply, and groups accounts by their on-chain owner. It does not estimate ownership from the largest 20 token accounts. Missing or inconsistent data produces an unknown check.

Pump.fun bonding-curve vaults, PumpSwap pools (including secondary pools and either side of arbitrary quote pairs), and Raydium AMM V4/CPMM/CLMM, Orca Whirlpool and Meteora DLMM vaults are verified against their program-owned state and token authority before exclusion. Both SPL Token and Token-2022 accounts are supported. Actual vault balances are used, never virtual reserves. Fridge balances remain assigned to each depositant: a timelock changes when tokens can be claimed, not who owns the claim. The report separately shows concentration outside Fridge, all Fridge balances, active time-locks and excluded pool reserves. Expired but unclaimed vaults still belong to the depositant. Every percentage uses total mint supply, including pool and locked balances, as its denominator; the grade uses the combined owner balance, including Fridge.

Account enumeration has no fixed 100,000-account cutoff; full reads get up to 30 seconds. If a provider times out, truncates the result or supply cannot be reconciled, the check is unknown. Balances and reserve classifications have separate RPC slots in the API. Reserve classification does not prove LP tokens are burned or locked. Unmapped shared Raydium custody remains included and is disclosed; if including or excluding it changes the grade, the grade is unknown.

On-chain owners are not necessarily separate people. Other protocol reserves and custodial accounts may remain included, and one person can control several wallets. Transfer-fee withholding or concurrent supply changes can prevent reconciliation and yield unknown.

### Data and freshness

Reports combine Solana RPC data with available Pump.fun, DexScreener, Jupiter, Metaplex, and DevFridge program data. Providers can be delayed, incomplete, rate-limited, or wrong. Re-scan before relying on a result and verify critical facts directly on-chain.

### Sponsorship independence

Feature payments affect only a labeled sponsored placement and its expiry. They do not change source data, checks, warnings, thresholds, or the risk grade. Recent scans are not ordered by payment.

### Known limitations

- A revoked authority does not prove that a team or website is trustworthy.

- A lock covers only the amount and expiry shown; it may not cover the entire supply.

- LP lock or burn status is not fully verified for every DEX or liquidity design.

- Holder accounts can be related even when the relationship is not visible on-chain.

- Contract, frontend, governance, oracle, and off-chain risks may exist outside these checks.

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/methodology/page.tsx) — deployed content can differ from the committed source.
