# Phantom and the in-app Season Pass

Use Wallet Standard or current Solana Wallet Adapter; support Phantom desktop extension and mobile in-app browser. Direct fallback: `window.phantom?.solana`, not the EVM provider. Detect on user action, handling late registration. Ordinary mobile Safari/Chrome may lack injection: offer **Open in Phantom**:

```js
const target = new URL(gameUrl); // your trusted HTTPS game origin; no secrets
const href = `https://phantom.com/ul/browse/${encodeURIComponent(target.href)}?ref=${encodeURIComponent(target.origin)}`;
```

This is a user-clicked link, not an automatic redirect or text to paste in an address bar. Build the pass in the game; do not iframe another site and assume wallet injection works. For a chosen Seeker Android app, follow [Android wallet integration](seeker-wallet.md) and [APK delivery](seeker-android.md), whether the APK bundles assets or loads the website; a WebView does not inherit a browser wallet. Test the website's browser adapter separately from the host's verified native/webshell path. Browser support does not certify a store release.

For Seeker users in the mobile web path, evaluate the current [Seeker Connect web integration](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect) alongside the existing wallet picker. It is built on Mobile Wallet Adapter and has a Wallet Standard implementation; use the version-matched web SDK rather than native Kotlin APIs. Keep Phantom available and test each selected wallet path independently. These browser choices do not change the owner's Browser/Seeker app/Both decision. Browser integration and the current Phantom browse URL were reviewed on 2026-10-22.

## Ownership proof

Connection returns a public key, not an authenticated server session. Bind a server-generated, short-lived, single-use nonce to wallet, domain/origin, URI, Solana chain, issued/expiry time and action. Verify exact signed bytes and Ed25519 signature server-side, atomically consume the nonce and issue a bounded session. Never accept a submitted wallet as identity. Clear access on account change/disconnect and ignore in-flight responses for old accounts. Rejected signatures must not trigger retry loops. Sign-in must not create locks or approve spending.

## In-app activation and optional market

Use the same [Season Pass](season-pass.md) tier, amount, duration, end-date and Details screens on the website and in the APK. Activation builds `create_lock` directly from the pinned IDL. With injected Phantom, capability-check `signAndSendTransaction` for the chosen transaction version; never invent native SDK methods on the provider. Preserve fresh user activation, connected account binding, single-flight behavior and explicit approve/cancel handling. If the owner selected [Buy <TOKEN>](in-game-market.md), present its on-chain quote inside the game and return to the pass screen with a refreshed balance after confirmed success. Do not make ownership of the pass a prerequisite for opening its activation or quote screen.

SDK reads do not create deposits. The default is in-app signing after current mint/ATA/extension, balance and rent prechecks, IDL-based construction and simulation. Recompute the end time at the actual signing step, refresh/review if materially changed, and use the same exact intended amount. Persist the recovery record before wallet handoff, then persist any signature immediately. Verify signature status and the deterministic deposit PDA; on timeout/lost callback show Check again and never re-sign automatically. A known failure before handoff is not an unfinished payment. Keep the [durable recovery rules](seeker-wallet.md#durable-payments-only-when-requested) across reloads, account changes and crashes. Native validation applies to Android; the browser still checks intent and the server revalidates authoritative admission.

Apply the [copy rules and Details disclosure](retention-and-economics.md#copyable-player-onboarding) before approval. Translate raw errors to the selected locale without leaking provider URLs or raw program names. Import the Buffer polyfill first in every lazy chain module so checking a pass before opening the signing screen works.

## Developer facts behind the player terms

Fridge program on Solana: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. Current integration is Token-2022; check actual mint ownership, not a Pump.fun suffix. No early withdrawals, including by the depositor. Keep SOL for fees/rent. A token lock is not an LP lock.

After expiry the depositor redeems through DevFridge. Current docs specify a 2% fee buying/burning PASTA (direct burn for PASTA locks). Non-PASTA redemption depends on an executable Jupiter route; ungraduated/illiquid Pump.fun tokens can lack one. Inspect current implementation/liquidity before inviting locks. Do not promise immediate redeemability solely because time elapsed. Re-verify fee/program/upgrade authority before release. Published security docs currently claim no independent audit.

Sources: https://docs.phantom.com/solana/integrating-phantom ; https://docs.phantom.com/phantom-deeplinks/other-methods/browse ; https://docs.devfridge.cool/fridge ; https://docs.devfridge.cool/program ; https://docs.devfridge.cool/security
