---
type: "Documentation"
title: "Scanner, Feature, and Fridge questions"
description: "DevFridge investor knowledge: Scanner, Feature, and Fridge questions"
resource: "https://docs.devfridge.cool/faq"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T22:03:38Z"
generated: true
---

# Scanner, Feature, and Fridge questions

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/faq) · ok · last successful observation: 2026-09-09T22:03:38Z · last attempt: 2026-09-09T22:03:38Z.

FAQ

## Scanner, Feature, and Fridge questions

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

### Does a paid Feature placement improve a token's risk grade?

No. Sponsorship changes only labeled placement and duration. It never changes checks, source data, warnings, or the risk grade.

### Does a high grade mean a token is safe?

No. The grade summarizes only the checks displayed in the report at scan time. It is not an audit, endorsement, or guarantee against loss.

### Can I feature a token that is not fridged?

No. Get Featured requires a live Fridge lock that has not reached unlock_at.

### Does Feature pay DexScreener or pump.fun?

No. SOL goes to the Fridge program vault, then buys and burns $PASTA. The listing is on scan.devfridge.cool.

### Why did the UI say the boost account was missing after I paid?

The on-chain payment can confirm before the scanner RPC sees the Boost account. If Solscan shows the tx succeeded, the listing is live. Refresh the homepage Boosted tab.

### Do I ever hold the bought $PASTA?

No. Jupiter buys into the burn PDA and the program burns it in the crank.

### Where are official links?

Only connect.devfridge.cool. Do not trust DMs that are not listed there.

More detail: [feature a memecoin](https://docs.devfridge.cool/feature), [buy & burn](https://docs.devfridge.cool/boost).

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/faq/page.tsx) — deployed content can differ from the committed source.
