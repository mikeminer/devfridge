# Seeker and Solana dApp Store release workflow

Official sources reviewed **2026-10-22**. Use this when preparing, submitting, updating or repairing a game's Android Store release. Recheck current portal fields, policies and upload limits before submission. The artifact and device checks below are this skill's release workflow; do not present every recommendation as a Store rule.

## Establish the release and authorization

Reuse the owner's package, publisher account, wallet, signing identity and publication decisions. Distinguish a new listing, an APK update, a metadata-only update and a local preparation request. An instruction to publish this specific release authorizes its submission within the agreed scope; do not ask again merely because this reference describes submission. A request to improve or publish the builder skill does not authorize submitting any example game's APK.

If the owner requires approval before submission, complete the signed candidate, checks, metadata, screenshots and cost estimate first. Present the exact APK hash/version, changes, known limitations and intended external action for that approval. Preserve any existing pending approval. Use only authorized publisher identity, signatures, transactions and spending; leave interactive wallet approval to the owner where required. Do not create a new wallet, transfer funds, export a private key or accept new legal terms simply to get past a blocked step.

## Prepare and inspect the exact APK

The Store accepts a signed **APK**, not an AAB. Build the release variant with the game's established toolchain. For a new app, arrange a securely backed-up signing key; updates retain the same Android application ID and original Store signing certificate. Keep the Android keystore separate from the Solana publisher wallet. For an app also distributed on Google Play, current Solana Mobile instructions require a separate Store signing key; do not replace an existing Store key. See [Build and Sign](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk) and [Google Play migration](https://docs.solanamobile.com/dapp-store/publishing-from-google-play).

Increment `versionCode` above the previous Store build and update `versionName` for a new APK. Keep both consistent with the proposed release and changelog. Compare against the existing Store release, not just a local filename. A metadata-only update can use the portal's existing APK option. Details changes become public after the corresponding release is approved. [Update workflow](https://docs.solanamobile.com/dapp-store/submit-an-update)

Run installed Android SDK tools against the final candidate, resolving their actual executable paths rather than assuming they are on PATH:

```text
apksigner verify --verbose --print-certs <candidate.apk>
apkanalyzer apk summary <candidate.apk>
apkanalyzer manifest debuggable <candidate.apk>
apkanalyzer manifest min-sdk <candidate.apk>
apkanalyzer manifest target-sdk <candidate.apk>
apkanalyzer manifest permissions <candidate.apk>
apkanalyzer files list <candidate.apk>
```

Record SHA-256, byte size, package, versions, certificate fingerprint, SDK levels and permissions. Compare the fingerprint with the previous released APK and confirm `debuggable=false`; reject a debug certificate. Inspect packaged game assets and URLs, native libraries/ABIs, wallet bridge and legal documents as applicable. A successful web build does not prove those files reached the APK. If signing manually, align before signing; modifications after signing invalidate it. [APK Analyzer](https://developer.android.com/tools/apkanalyzer), [apksigner](https://developer.android.com/tools/apksigner)

Keep secrets out of source, commands printed to logs, release bundles and screenshots. Record the secure key reference/alias and public certificate fingerprint, never its password or private material.

## Prepare accurate listing and review materials

Create a release folder containing the candidate or its immutable location/hash, listing text, artwork, legal URLs, release notes and a test report. Fill the current portal fields from evidence in that build:

- Name, short/long description, category, support contact, website and actual access modes. Describe wallet requirements, timelock fees/expiry and optional paid modes accurately; do not advertise unfinished multiplayer, rewards or an audit.
- Every supported **UI language** verified in the packaged game, mapped to the portal's accepted locale identifiers. Country/curriculum profiles, selected markets, flags and translated store descriptions are different data. Do not infer languages from country count or claim every bundled library locale is supported. Check menus, tutorial, errors, wallet instructions and relevant disclosures; qualify partial translations honestly.
- Working HTTPS publisher/app website, privacy policy and EULA/terms links, plus any requested license/copyright links. Check public access, valid TLS, redirects and meaningful content without login. Use the publisher's actual domain and identity; a placeholder or unrelated domain is not evidence of ownership. The agreement requires privacy policy and EULA text and links accessible within the app. Reconcile privacy text with actual network calls, wallet data, local records, analytics and approved ads. [Developer Agreement](https://legal.solanamobile.com/pl/developer-agreement)
- Screenshots captured from the submitted build and promotional artwork depicting implemented features, with recorded rights to art, music, logos and fonts. Keep concept renders distinct from actual screenshots. Remove secret/account details without fabricating game behavior; do not imply Solana Mobile endorsement.

Current [Listing Page Guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines) specify a **512×512 icon**, a **30-character maximum short description**, screenshots at least **1080 pixels in both dimensions** with consistent orientation/aspect ratio, and MP4 previews at least **720 pixels in both dimensions**. Check these against the portal at release time. Read the portal for additional counts, banner/feature dimensions and file limits; do not invent them or copy old CLI limits as current requirements.

Provide reviewer steps to reach every advertised mode, necessary test access and expected results without sharing secrets. If a mode needs an existing timelock, provide an authorized reproducible review path or ask how the reviewer should access it; do not create a hidden review bypass or claim fixtures are mainnet proof.

## Verify on Seeker and retain evidence

Install the same signed candidate on a **physical Seeker** when available; record device/OS, wallet app/version, APK hash, date and result. Also test upgrading from the released Store build without uninstalling or erasing user data. Emulator, ordinary Android and desktop tests remain useful but do not establish physical Seeker compatibility. If hardware is unavailable, report that gap and prepare the test instructions instead of marking it passed.

Verify launch, language/profile selection, touch gameplay, pause/retry, back navigation, safe areas, supported orientations, audio suspension/recovery, screen lock, process restart, offline/error handling and performance. Check bundled legal access and website links. For approved promotions, verify their Free-only boundary, immediate Continue and optional external links; no ad interaction grants timelock/paid admission.

Exercise the implemented wallet route with Seed Vault Wallet and/or the explicitly supported mobile wallets: connect, reject/cancel, sign-in where implemented, disconnect, account change, expired authorization, app switching/return and unavailable wallet. Recheck active/expired/insufficient locks and network failure. Do not assume a desktop Phantom test proves a native MWA flow. Keep authorization, signature verification, lock eligibility and paid admission separate. Real funds or lock transactions require their own existing authorization; mocks/simulations must be labeled.

The [Publisher Policy](https://docs.solanamobile.com/dapp-store/publisher-policy) covers misleading content, data handling and unsafe WebViews, among other requirements. Read the current policy linked by the portal; do not substitute these tests for it. In particular, keep native navigation/bridge destinations restricted and disclosures aligned with real behavior.

## Submit through the current publisher workflow

Use the [Publisher Portal](https://publish.solanamobile.com/) and [new-app instructions](https://docs.solanamobile.com/dapp-store/submit-new-app). Reuse the account and publisher wallet; help the owner complete KYC/KYB rather than inventing identity. Select the authorized storage provider and inspect its live cost estimate/balance. Storage uploads and chain transactions can incur costs; do not quote a fixed SOL amount as a guaranteed fee.

For a new listing, add the dApp details, then use **Home → New Version** for the verified APK. For updates, select the existing app, revise Details as needed and create its new version with accurate What's New text. Inspect each expected message/transaction in the authorized upload/mint/submission sequence. An interruption or rejected signature may leave a partial release: inspect portal state before retrying to avoid duplicate submissions or charges.

The current [publishing CLI](https://docs.solanamobile.com/dapp-store/publishing-cli) is `@solana-mobile/dapp-store-cli`, backed by the portal and requiring an existing App NFT, portal API key and publisher signer. Use it only when that automation and signing method are authorized and securely configured. Do not reuse legacy NFT-creation commands indiscriminately or request a browser wallet's private key to enable CI.

Retain release/app identifiers, APK hash, receipt/transaction identifiers and the observed portal state. Report **prepared**, **uploaded**, **submitted/in review**, **approved**, and **live** separately. The docs describe approval leading to publication; verify the actual listing/version before claiming it is live. The documented review estimate is not a delivery guarantee. Do not promise a future monitor unless one has actually been set up.

## Handle review failures and launch requests

Capture the actual review's code, exact finding, date and affected release. Do not invent a universal review-code catalogue. Map each finding to a fix and evidence:

| Finding category | Remediation evidence |
| --- | --- |
| Signing/package/version/install | Correct APK, certificate comparison, manifest output, fresh install and upgrade result |
| Crash, frozen gameplay, wallet return | Reproduction steps, redacted logs, code fix and same-device retest |
| Missing/misleading metadata or locales | Corrected field-to-build comparison and screenshots for supported languages |
| Publisher/legal URL or privacy mismatch | Public HTTPS/content check, matching publisher identity, in-app policy access and revised data inventory |
| Artwork, permissions or unsupported claims | Rights evidence, corrected assets/permissions/copy and candidate verification |

Prepare a concise response mapping every reported code to the change, new version/hash or metadata revision and verification result. Submit the correction only within the authorized release scope. If publisher-profile edits are unavailable, the official [support workflow](https://docs.solanamobile.com/dapp-store/support) directs publishers to a private `#dev-answers` ticket; prepare the evidence and contact support only when instructed. Current support guidance gives a 3–5 business-day review window and an inquiry path after five business days; recheck before using it.

For **Editor's Choice** or other featuring requests, prepare an application packet: live listing/version, accurate product pitch, actual gameplay footage, Seeker test evidence, licensed promotional assets, launch timing and genuine distinguishing features. Verify the current official application/contact route before sending; do not invent an application form. [Co-marketing guidance](https://docs.solanamobile.com/marketing/comarketing-guidelines) supports preparing copy and coordinating launches, but does not guarantee featuring, endorsement, distribution or a partnership. Publication and editorial selection are separate outcomes.

## Link to this game's Store listing

Construct `solanadappstore://details?id=<actual-application-id>` from the verified package, never from another game's example or untrusted caller input. Open only after the player's explicit action; handle a missing Store app or failed intent by opening this game's fixed, publicly reachable **HTTPS download/info page**. That fallback is an app-owned delivery choice, not an assumed official HTTPS Store URL. Do not install an APK automatically. On web, offer both the Store link and usable HTTPS fallback. [Official deep-link scheme and Android package visibility](https://docs.solanamobile.com/dapp-store/link-to-dapp-listing-page)

Before delivery, test the Store intent on Seeker, fallback without a handler, correct package destination and return to the game. Preserve the live app's version and pending submission state when only preparing future materials.
