---
type: "Documentation"
title: "Feature a Solana memecoin"
description: "DevFridge investor knowledge: Feature a Solana memecoin"
resource: "https://docs.devfridge.cool/feature"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T07:28:58Z"
generated: true
---

# Feature a Solana memecoin

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/feature) · ok · last successful observation: 2026-09-09T07:28:58Z · last attempt: 2026-09-09T07:28:58Z.

GET FEATURED

## Feature a Solana memecoin

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

Use this when you launched on pump.fun (or any Token-2022 mint) and want a verifiable featured slot instead of a DexScreener ad or a volume bot.

### Requirements

- A live Fridge lock on [devfridge.cool](https://devfridge.cool) — unlock time still in the future.

- Phantom or Solflare with the package SOL plus a small fee cushion (~0.02 SOL).

- The mint page on [scan.devfridge.cool](https://scan.devfridge.cool).

### Packages

| Slot | SOL | Duration |
| --- | --- | --- |
| 24h Boost | 0.1 | 24 hours |
| 48h Boost | 0.18 | 48 hours |
| 7d Boost | 0.5 | 7 days |

Package prices are plus network fees. Review the full transaction cost in your wallet.

### What happens in the wallet

One signature. You pay the package SOL into the Fridge program vault and the on-chain Boost account starts the timer. You never receive the bought $PASTA, so you cannot sell it.

After the listing is live, the program wraps that SOL, Jupiter-swaps it to $PASTA on the PumpSwap pool, and burns it. Details: [buy & burn](https://docs.devfridge.cool/boost).

### Not the same as DexScreener Boost

DexScreener [Boost packs](https://docs.dexscreener.com/boosting) raise a trending score on their site. They do not lock your supply and they do not burn $PASTA. DevFridge Feature is only for mints with a live Fridge vault and only lists on scan.devfridge.cool.

[Open Get Featured](https://scan.devfridge.cool/#feature)

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/feature/page.tsx) — deployed content can differ from the committed source.
