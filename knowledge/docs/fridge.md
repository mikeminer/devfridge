---
type: "Documentation"
title: "Lock Token-2022 supply on Solana"
description: "DevFridge investor knowledge: Lock Token-2022 supply on Solana"
resource: "https://docs.devfridge.cool/fridge"
tags: ["devfridge", "investors"]
timestamp: "2026-09-12T12:30:36Z"
generated: true
---

# Lock Token-2022 supply on Solana

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/fridge) · ok · last successful observation: 2026-09-12T12:30:36Z · last attempt: 2026-09-12T12:30:36Z.

FRIDGE

## Lock Token-2022 supply on Solana

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

A Fridge lock is a program-owned Token-2022 vault. The depositor chooses an unlock time. Nobody can withdraw before `unlock_at`, including the original wallet.

### How to lock

- Open [devfridge.cool](https://devfridge.cool) and connect Phantom.

- Paste the mint (pump.fun and DexScreener URLs work).

- Pick amount and unlock date, then confirm the lock transaction.

### What the scanner shows

[scan.devfridge.cool](https://scan.devfridge.cool) reads Fridge program accounts for that mint. If at least one vault still has `unlock_at` in the future, the report is Fridged. That is the only way to unlock Get Featured.

### Claim

After unlock, the depositor claims. A 2% redemption fee Jupiter-buys $PASTA and burns it (or burns $PASTA directly if the locked mint is $PASTA).

[Fridge a mint](https://devfridge.cool)

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/fridge/page.tsx) — deployed content can differ from the committed source.
