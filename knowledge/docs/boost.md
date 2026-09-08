---
type: "Documentation"
title: "How Feature SOL becomes a $PASTA burn"
description: "DevFridge investor knowledge: How Feature SOL becomes a $PASTA burn"
resource: "https://docs.devfridge.cool/boost"
tags: ["devfridge", "investors"]
timestamp: "2026-09-08T18:29:43Z"
generated: true
---

# How Feature SOL becomes a $PASTA burn

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/boost) · ok · last successful observation: 2026-09-08T18:29:43Z · last attempt: 2026-09-08T18:29:43Z.

BUY & BURN

## How Feature SOL becomes a $PASTA burn

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

Feature is two on-chain steps so Phantom only signs a small payment. The swap never lands in the buyer’s wallet.

### 1. Boost instruction

`boost(tier)` transfers 0.1 / 0.18 / 0.5 SOL into the program vault PDA `boost_vault` and writes a Boost account seeded `["boost", mint]`. The listing timer starts in that transaction.

### 2. Crank buyback

`crank_buyback` is permissionless. It wraps vault SOL to WSOL owned by the burn PDA, Jupiter-swaps to $PASTA on PumpSwap, and Token-2022-burns the output.

- $PASTA mint: `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`

- Pool (DexScreener): [5o5JB…EqL5](https://dexscreener.com/solana/5o5jbdwzd3zke3jc8tb81d3bph7bwxftvwllroz1eql5)

- Burn PDA seed: `["burn"]`

If the listing is live and the vault still holds SOL, the burn may lag the Feature signature by a short crank. The featured timer does not wait on the swap.

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/boost/page.tsx) — deployed content can differ from the committed source.
