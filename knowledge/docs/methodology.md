---
type: "Documentation"
title: "How the risk grade works"
description: "DevFridge investor knowledge: How the risk grade works"
resource: "https://docs.devfridge.cool/methodology"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T07:24:09Z"
generated: true
---

# How the risk grade works

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/methodology) · ok · last successful observation: 2026-09-09T07:24:09Z · last attempt: 2026-09-09T07:24:09Z.

METHODOLOGY

## How the risk grade works

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

DevFridge turns the visible checks in each report into an A–E risk grade. The grade is a compact summary of the current snapshot, not a prediction, audit, endorsement, or guarantee.

### Checks included

- Whether mint authority is revoked.

- Whether freeze authority is revoked.

- Top-10 holder concentration, excluding identified Fridge vaults when data is available.

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
