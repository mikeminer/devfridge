---
type: "Documentation"
title: "Tokenomics (on-chain, live)"
description: "DevFridge investor knowledge: Tokenomics (on-chain, live)"
resource: "https://docs.devfridge.cool/tokenomics"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T21:12:21Z"
generated: true
---

# Tokenomics (on-chain, live)

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/tokenomics) · ok · last successful observation: 2026-09-09T21:12:21Z · last attempt: 2026-09-09T21:12:21Z.

$PASTA

## Tokenomics (on-chain, live)

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

$PASTA (`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`) is the Fridge burn token. You do not need $PASTA to lock. Usage of the Fridge is what buys and burns it.

### What is on the Fridge program today

| Source | Trigger | Effect |
| --- | --- | --- |
| Claim fee | Take tokens out after unlock | 2% of the vault: burn $PASTA, or Jupiter-buy $PASTA then burn |
| Get Featured | 0.1 / 0.18 / 0.5 SOL, live lock required | SOL to program vault → Jupiter-buy $PASTA → burn |

### Access rules

- Any wallet can lock a Token-2022 mint (including $PASTA) into its own vault PDA.

- Locks are not mixed in one pot. Each depositor + mint + lock id has a separate vault.

- A live timelock is required for the TRUST badge and to buy a featured slot.

- Not every mint can Get Featured — only mints with an active Fridge lock.

### What is not Fridge-program tokenomics

Trust Me Capital (Hyperliquid vault) and any extra buybacks from trading P&L are separate from the Fridge program. They are not the 2% claim fee and not Feature SOL.

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/tokenomics/page.tsx) — deployed content can differ from the committed source.
