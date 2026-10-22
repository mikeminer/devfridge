# Phantom, first locks and redeem

Use Wallet Standard or current Solana Wallet Adapter; support Phantom desktop extension and mobile in-app browser. Direct fallback: `window.phantom?.solana`, not the EVM provider. Detect on user action, handling late registration. Ordinary mobile Safari/Chrome may lack injection: offer **Open in Phantom**:

```js
const target = new URL(gameUrl); // your trusted HTTPS game origin; no secrets
const href = `https://phantom.com/ul/browse/${encodeURIComponent(target.href)}?ref=${encodeURIComponent(target.origin)}`;
```

This is a user-clicked link, not an automatic redirect or text to paste in an address bar. Do not iframe DevFridge and assume wallet injection works. Use a top-level dialog or external DevFridge link. For a chosen Seeker Android app, follow [native wallet integration](seeker-wallet.md) and [APK delivery](seeker-android.md); a WebView does not inherit a browser wallet. Browser support does not certify a store release.

For Seeker users in the mobile web path, evaluate the current [Seeker Connect web integration](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect) alongside the existing wallet picker. It is built on Mobile Wallet Adapter and has a Wallet Standard implementation; use the version-matched web SDK rather than native Kotlin APIs. Keep Phantom available and test each selected wallet path independently. These browser choices do not change the owner's Browser/Seeker app/Both decision. Browser integration and the current Phantom browse URL were reviewed on 2026-10-22.

## Ownership proof

Connection returns a public key, not an authenticated server session. Bind a server-generated, short-lived, single-use nonce to wallet, domain/origin, URI, Solana chain, issued/expiry time and action. Verify exact signed bytes and Ed25519 signature server-side, atomically consume the nonce and issue a bounded session. Never accept a submitted wallet as identity. Clear access on account change/disconnect and ignore in-flight responses for old accounts. Rejected signatures must not trigger retry loops. Sign-in must not create locks or approve spending.

## First-lock onboarding

Before gating gameplay, show character selection, full mint/Copy CA, `https://pump.fun/coin/<mint>`, minimum quantity and `https://devfridge.cool/?mint=<mint>` (SDK `getLockUrl(days)` can suggest days). New holders must be able to buy/lock before qualifying. Include recheck and pending-confirmation states.

SDK reads do **not** create/redeem locks. External DevFridge is the simplest supported path. For requested native signing, inspect deployed program/current IDL and account schema; validate owner, Token-2022 extensions, balance, decimals, amount and unlock time; derive depositor PDAs/ATAs; simulate; then request explicit wallet approval. Never guess instruction bytes or reuse World-only mint allowlists. Persist pending signatures across retries and check chain status before resubmitting. Unsupported transfer fees/hooks must not be silently accepted.

For player-facing retention and PASTA developer-support messaging, follow [retention and economics](retention-and-economics.md). Display the redemption fee before any lock approval.

## Facts before locking

Fridge program on Solana: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. Current integration is Token-2022; check actual mint ownership, not a Pump.fun suffix. No early withdrawals, including by the depositor. Keep SOL for fees/rent. A token lock is not an LP lock.

After expiry the depositor redeems through DevFridge. Current docs specify a 2% fee buying/burning PASTA (direct burn for PASTA locks). Non-PASTA redemption depends on an executable Jupiter route; ungraduated/illiquid Pump.fun tokens can lack one. Inspect current implementation/liquidity before inviting locks. Do not promise immediate redeemability solely because time elapsed. Re-verify fee/program/upgrade authority before release. Published security docs currently claim no independent audit.

Sources: https://docs.phantom.com/solana/integrating-phantom ; https://docs.phantom.com/phantom-deeplinks/other-methods/browse ; https://docs.devfridge.cool/fridge ; https://docs.devfridge.cool/program ; https://docs.devfridge.cool/security
