# Seeker wallets, access and payment recovery

Official sources reviewed **2026-10-22**. Use with an approved Seeker/Both target and [the Android host guide](seeker-android.md). Native wallet support does not by itself authorize an entry fee, reward scheme or mainnet test payment. Reuse the owner's approved network, identity and access model; obtain only missing decisions or required wallet approval, while continuing independent implementation.

## Choose and verify the transport

[Seeker Connect](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect), documented on 21 October 2026, is a dapp-facing layer over Mobile Wallet Adapter (MWA) for connecting directly to the certified device's own wallet. Its available targets include Kotlin, React Native and web. It does not replace the underlying protocol or make a browser build an Android release.

For Kotlin, follow the current [Seeker Connect quickstart](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect-quickstart): add `com.solanamobile:seeker-connect` and, for Compose UI, `seeker-connect-compose`. Keep the client in a ViewModel with HTTPS identity; restore cached authorization without opening the wallet. Bind wallet calls to the active activity lifecycle, handle SDK exceptions and propagate coroutine cancellation. Pin compatible dependencies after checking current toolchain requirements.

The quickstart's optional web package is `@solana-mobile/seeker-connect-wallet-standard`. Its Nostr relay requires reviewed configuration/terms; native direct communication needs no relay. Keep Phantom alongside it on the browser website, including an independently usable hosted game. This web option does not establish native or Store testing.

Delivery routing reviewed **2026-10-23**: bundled versus hosted assets is separate from wallet transport. For either APK architecture inspect the host's supported integration; use the compatible native adapter or verified webshell wallet-intent path, with explicit lifecycle/error handling. A hosted WebView does not automatically inherit Phantom injection or require the browser relay adapter. Test each selected runtime independently. Native communication without a relay does not make RPC, entitlement or payments work offline.

Generic [MWA](https://docs.solanamobile.com/solana-mobile-stack/mobile-wallet-adapter) remains the route for other compatible installed wallets when the product needs that choice. The [Kotlin setup](https://docs.solanamobile.com/get-started/kotlin/setup) describes identity and activity-mediated sessions; use APIs from the installed SDK, not copied method names from a different version. Handle unavailable wallet/unsupported device explicitly without a redirect or retry loop.

Read current [MWA capabilities and identity requirements](https://solana-mobile.github.io/mobile-wallet-adapter/spec/spec.html) before choosing signing methods. Check supported transaction versions, payload limits and optional/account-specific features. Do not assume `signTransactions` or SIWS exists merely because an SDK exposes a method. Use the installed library's matching chain/network representation. For native identity verification, configure the owned domain's Digital Asset Links with the actual package and release signing-certificate fingerprint; a local asset origin is not a substitute. This identity association is separate from whether a wrapper requires TWA setup.

## Chrome's local network permission (browser and Custom Tab)

Reviewed on a Seeker with Chrome 155 on **2026-10-23**; official 0.7.0 SDK source checked on the same date. This section applies only when the selected browser adapter uses **local-WebSocket MWA** to reach the wallet on the phone. From a public website in Android Chrome or a Chrome Custom Tab, that connection can require permission to reach "other apps and services on this device" (Local Network Access: `loopback-network`, `local-network-access` on older builds).

If that question first appears while the wallet is already opening, it stays behind the wallet and ends as a denial. The wallet's sheet then waits forever and the page logs `net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`. A denial is remembered for the site, and Chrome does not ask again.

- The official `@solana-mobile/wallet-standard-mobile` [0.7.0 permission handling](https://github.com/solana-mobile/mobile-wallet-adapter/blob/12b1784ca7b0ab0f54c8333c2b4694b2f3fb4f13/js/packages/wallet-standard-mobile/src/getIsSupported.ts#L116) handles this for local association where permission is required. Before opening the wallet, it shows its own **“Allow connections to your wallet”** modal, raises Chrome's question while the page is visible, then opens the wallet from a fresh tap. On a denied state it shows a blocked modal and throws `ERROR_LOOPBACK_ACCESS_BLOCKED`. Map that error to a localized explanation; the modals themselves are English.
- A game that drives local-WebSocket `@solana-mobile/mobile-wallet-adapter-protocol` `transact()` directly must handle the same applicable cases:
  1. first bypass this permission preflight when the **game page itself** is served from a loopback origin: `localhost`/`*.localhost`, `127.0.0.1` (or another `127.0.0.0/8` address), or `[::1]`, including development through `adb reverse`. The [SDK's exemption](https://github.com/solana-mobile/mobile-wallet-adapter/blob/12b1784ca7b0ab0f54c8333c2b4694b2f3fb4f13/js/packages/wallet-standard-mobile/src/getIsSupported.ts#L85) explains that these same-space requests need no prompt; waiting for `prompt` to change can deadlock. Start the local wallet flow on the user's click;
  2. otherwise read the supported permission state and keep it current (`navigator.permissions.query`, `onchange`), so a click can check it synchronously;
  3. on `prompt`, trigger the question while the page is visible, using the [SDK's request target and error handling](https://github.com/solana-mobile/mobile-wallet-adapter/blob/12b1784ca7b0ab0f54c8333c2b4694b2f3fb4f13/js/packages/wallet-standard-mobile/src/embedded-modal/loopbackPermissionModal.ts#L12): `void fetch('http://localhost').catch(() => {});`. Do not open the wallet in that click. Use the permission state, not fetch success/failure, to decide the next step. Do not use port `1`: [Fetch blocks that port](https://fetch.spec.whatwg.org/#port-blocking) before a request can trigger permission;
  4. on `granted`, or where the browser does not support this permission API, start `transact()` synchronously from a fresh click;
  5. on `denied`, explain in the player's language that Chrome's site settings must allow other apps and services on this device.

  [MezzoPollo's `web-wallet.mjs`](https://github.com/mikeminer/mezzo-pollo-academy/blob/main/web-wallet.mjs) illustrates the fresh-click flow; use the pinned SDK sources above for permission requests and exemptions rather than copying an older game implementation.
- Do not apply this browser-local preflight to [Seeker Connect web's Nostr relay](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect-quickstart#relay-url), native wallet calls or injected providers such as Phantom's in-app browser. The SDK explicitly exempts Solana Mobile Web Shell; use the verified host adapter for other APK WebViews instead of assuming Chrome-tab permission behavior.

Test the selected local-WebSocket path on a Seeker in Chrome and, for Game Room entries, from the Club app's Custom Tab: undecided, granted and blocked permission, plus a loopback-hosted development page that must not wait for permission. Verify relay/native/injected paths separately without adding this preflight.

## Seed Vault and authorization boundaries

[Seed Vault](https://docs.solanamobile.com/solana-mobile-stack/seed-vault) provides secure custody to wallet apps. A game requests authorization/signing through Seeker Connect/MWA and the wallet; it must never request seed phrases, export private keys, implement its own biometric bypass or integrate the wallet-developer Seed Vault SDK as an access shortcut.

An authorization cache is permission to reconnect to a wallet, not proof of timelock eligibility, a server login, paid credit or an open transport. Keep tokens in app-private storage with an explicit backup policy; never send them into WebView localStorage, logs or analytics. Disconnect/revocation/account changes clear derived access, cancel stale checks and bind new results to the current wallet generation. A cold start may restore connection metadata, but must reconstruct access from the intended evidence and recovery policy.

For authenticated server actions, use a server-issued nonce bound to wallet, origin/domain, network, action and expiry; verify exact signed bytes and consume it once. See [ownership proof](phantom.md#ownership-proof) and the [Kotlin signing/SIWS examples](https://docs.solanamobile.com/get-started/kotlin/quickstart). Read-only timelock checks do not require a transaction. Keep cached entitlement distinct from authorization; do not silently reuse old wallet evidence after an account switch or turn an offline error into admission.

## Durable payments, only when requested

Use one action coordinator and persist recovery state before handing a transaction to the wallet. Separate a harmless draft from a submitted/uncertain payment: selecting a tier, opening checkout, restoring authorization or dismissing a dialog must not leave an invented unfinished payment that blocks play. Only a known rejection before broadcast or a failure before handoff cancels the draft; it never grants credit. After handoff, uncertain outcomes enter recovery rather than being cleared. The player-facing pending state begins only after the explicit purchase action reaches the wallet flow.

An implementation can use these states:

```text
draft -> awaiting_wallet -> submitted(signature) / outcome_unknown
submitted / outcome_unknown -> verified_credit -> consumed_once
known rejection before submission -> cancelled
reconciled failure or unsubmitted expiry -> retry_available
```

Persist a unique purchase ID/reference, paying account and required signer(s), cluster, recipient, exact integer amount/unit, game/tier, expected memo, transaction message/hash, blockhash and last valid height, plus any resulting signature. Record the fee-payer policy separately: a sponsored transaction can have a different fee payer. Keep recovery secrets private. Before approval, show identity, network, amount, recipient and fees separately. Validate these fields natively/server-side against the chosen product configuration; do not trust amounts, arbitrary transaction bytes or destinations supplied by a renderer. Simulate where supported and verify the actual chain result rather than treating wallet success as payment finality.

Implement recovery lookup before enabling payments: include a chain-discoverable reference account/program receipt, or maintain another verified indexed lookup that can locate this exact purchase without a returned signature. A locally saved UUID or memo without a working chain lookup is insufficient.

Keep private/paid RPC API keys on the server, never in the APK, bundled JavaScript or repository. If a relay is needed, expose only the specific read/simulation methods and parameter shapes required by this game, with timeouts, response-size bounds, quotas and abuse controls; do not create an open RPC proxy. Chain reads through that service do not replace authoritative, account-bound receipt validation and admission consumption.

The Seeker Connect quickstart warns that `session-closed`/`SESSION_CLOSED` after sign-and-send can mean submission without a returned signature. Never auto-retry. Persist `outcome_unknown` and reconcile the on-chain effect across app death; timeout/cancellation after handoff does not prove failure.

When a signature exists, query [getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses), including historical lookup where needed. A missing recent-cache result alone is inconclusive. Fetch [getTransaction](https://solana.com/docs/rpc/http/gettransaction) at the game's required commitment and check success, authorized required signer(s), paying account, recipient, amount, instructions, reference/memo, expected fee-payer policy and transaction version. Do not require the connected wallet to be the fee payer when the approved flow sponsors fees. Reject unrelated transfers or receipts on another cluster; a memo alone is not authentication. If no signature is available, reconcile through the unique reference/program state and trusted chain evidence, not local UI state.

Retain blockhash validity metadata and reconcile until expiry; [Solana's confirmation guide](https://solana.com/developers/cookbook/transactions/confirmation) describes `lastValidBlockHeight`. Expiry prevents future landing; it does not prove payment never landed earlier. Perform final historical/reference reconciliation before marking retry available. Durable-nonce transactions require nonce-advance handling instead of a wall-clock timeout. Offline/RPC failures leave an honest checking/unavailable state. Do not offer a replacement charge while the original outcome remains ambiguous; first reconcile, then require the player's explicit new action. If the configured lookup cannot establish the outcome, preserve recovery data and provide a support/recheck path rather than clearing the purchase or charging again.

Grant admission only after verified evidence and atomically consume the receipt once at the game's defined start boundary. A durable local database can enforce reuse limits for one installation; it cannot prevent replay after reinstall or on another device. Global one-use admission requires a server/on-chain authority with a unique purchase constraint and atomic consume operation. Plan recovery for verified but unconsumed credit, and crash recovery for consumed admission, without silently granting a second run. Keep this separate from ad clicks and timelock access.

## Focused verification

Use [the official mock-wallet setup](https://docs.solanamobile.com/get-started/development-setup) and fixtures for errors before physical Seeker testing. No mainnet spend is needed to test state transitions. Test:

- No wallet, unsupported capability/version, cancelled connect/sign, revoked cache and account change during an access request; no forced prompt on cold start/resume.
- Selecting/cancelling checkout before wallet handoff leaves no blocked pending purchase; double taps yield one request. Wallet rejection grants no credit.
- Lost response after actual submission, null signature, delayed confirmation, blockhash expiry, server/RPC outage and no internet; recovery never creates an automatic replacement charge.
- Rotation, activity destruction, process kill, screen lock and return from the wallet at each persisted state; stale callbacks cannot change another account's UI or grant duplicate admission.
- Modified amount/recipient/network/memo, failed transaction and repeated receipt; local one-use behavior and the separately claimed server-wide guarantee.

Run the actual release APK with the actual Seeker wallet before reporting that combination verified. Record device, wallet/SDK versions, cluster and tested outcomes. Missing credentials, required user signatures or unapproved real spending block only those dependent actions; continue mocks, implementation, packaging and documentation within the existing authorization.
