---
type: "Documentation"
title: "Gate access with Fridge timelocks"
description: "DevFridge investor knowledge: Gate access with Fridge timelocks"
resource: "https://docs.devfridge.cool/sdk"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T07:42:35Z"
generated: true
---

# Gate access with Fridge timelocks

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/sdk) · ok · last successful observation: 2026-09-09T07:42:35Z · last attempt: 2026-09-09T07:42:35Z.

SDK

## Gate access with Fridge timelocks

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

[sdk.devfridge.cool](https://sdk.devfridge.cool) contains the complete API reference, code samples, React examples, server-side examples, and AI integration prompts.

The DevFridge SDK lets a site use on-chain Fridge timelocks as a subscription gate instead of recurring payments. A user locks tokens to subscribe; longer locks mean fewer renewal transactions.

It is for any project that wants gated access without building billing infrastructure. Plans can use any token mint, not just [$PASTA](https://pump.fun/coin/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump).

### How it works

- The developer configures plans with `minLockDays`, `renewalThresholdDays`, and `minLockAmount`.

- The user locks tokens on [devfridge.cool](https://devfridge.cool).

- The SDK checks qualifying locks through `scan.devfridge.cool/api/sdk/check`.

- The response returns `active`, `needsRenewal`, and `daysRemaining` so your app can grant access, prompt a renewal, or show the gate.

### Quick start

`<script src="https://sdk.devfridge.cool/sdk/devfridge-sdk.js"></script>`

`const fridge = new DevFridgeSDK({ tokenMint: "YOUR_TOKEN_MINT_ADDRESS", plans: { pro: { minLockDays: 60, renewalThresholdDays: 29, minLockAmount: 10_000_000_000_000, }, }, }); async function checkSubscription(walletAddress) { const status = await fridge.checkSubscription(walletAddress); if (status.active && !status.needsRenewal) { showContent(); return; } if (status.active && status.needsRenewal) { showContent(); showRenewalBanner(status.daysRemaining); return; } showSubscriptionGate(); }`

### Related pages

- [Fridge lock](https://docs.devfridge.cool/fridge) — the on-chain timelock program reused by SDK subscriptions.

- [Badge](https://docs.devfridge.cool/badge) — the same live Fridge badge used across the ecosystem.

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/sdk/page.tsx) — deployed content can differ from the committed source.
