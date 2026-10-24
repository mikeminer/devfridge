# Seeker and Solana dApp Store release workflow

Official sources reviewed **2026-10-24**. Use this when preparing, submitting, updating or repairing a game's Android Store release. Recheck current portal fields, policies and upload limits before submission. The artifact and device checks below are this skill's release workflow; do not present every recommendation as a Store rule. The 1.7.3 short-description limit is superseded by the verified 50-character limit below.

## Establish the release and authorization

Reuse the owner's package, publisher account, wallet, signing identity and publication decisions. Distinguish a new listing, an APK update, a metadata-only update and a local preparation request. An instruction to publish this specific release authorizes its submission within the agreed scope; do not ask again merely because this reference describes submission. A request to improve or publish the builder skill does not authorize submitting any example game's APK.

If the owner requires approval before submission, complete the signed candidate, checks, metadata, screenshots and cost estimate first. Present the exact APK hash/version, changes, known limitations and intended external action for that approval. Preserve any existing pending approval. Use only authorized publisher identity, signatures, transactions and spending; leave interactive wallet approval to the owner where required. Do not create a new wallet, transfer funds, export a private key or accept new legal terms simply to get past a blocked step.

## Prepare and inspect the exact APK

The Store accepts a signed **APK**, not an AAB. The [current new-app checklist](https://docs.solanamobile.com/dapp-store/submit-new-app) requires a release build supporting `arm64-v8a`, at most 2 GB; debug builds are rejected. Build the release variant with the game's established toolchain. For a new app, arrange a securely backed-up signing key; updates retain the same Android application ID and original Store signing certificate. Keep the Android keystore separate from the Solana publisher wallet. For an app also distributed on Google Play, current Solana Mobile instructions require a separate Store signing key; do not replace an existing Store key. See [Build and Sign](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk) and [Google Play migration](https://docs.solanamobile.com/dapp-store/publishing-from-google-play).

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

- Name, short/long description, category, support contact, website and actual access modes. Describe Season Pass token holding period, expiry, fee disclosures and optional paid modes accurately; do not advertise unfinished multiplayer, financial returns or an audit. In developer/reviewer notes, describe the actual timelock mechanism without hiding its restrictions.
- Every supported **UI language** verified in the packaged game, mapped to the portal's accepted locale identifiers. Country/curriculum profiles, selected markets, flags and translated store descriptions are different data. Do not infer languages from country count or claim every bundled library locale is supported. Check menus, tutorial, errors, wallet instructions and relevant disclosures; qualify partial translations honestly.
- Working HTTPS publisher/app website, privacy policy and EULA/terms links, plus any requested license/copyright links. Check public access, valid TLS, redirects and meaningful content without login. Use the publisher's actual domain and identity; a placeholder or unrelated domain is not evidence of ownership. The agreement requires privacy policy and EULA text and links accessible within the app. Reconcile privacy text with actual network calls, wallet data, local records, analytics and approved ads. [Developer Agreement](https://legal.solanamobile.com/pl/developer-agreement)
- Screenshots captured from the submitted build and promotional artwork depicting implemented features, with recorded rights to art, music, logos and fonts. Keep concept renders distinct from actual screenshots. Remove secret/account details without fabricating game behavior; do not imply Solana Mobile endorsement.

The [Listing Page Guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines), checked 2026-10-24, specify:

| Field | Current requirement |
| --- | --- |
| App name / short description | At most **25 / 50 characters**, respectively |
| Icon | **512×512**, opaque background |
| Banner | **1200×600** |
| Preview gallery | **4–8** screenshots or videos; choose **9:16 portrait** or **16:9 landscape** and keep every preview at the first preview's dimensions |
| Screenshot files | JPG, PNG, GIF or WebP, at most **3 MB each**; at least **1080px in both dimensions recommended** |
| Video files | MP4, at most **30 MB each**; **1920×1080 recommended** |
| Public links | Working developer website, terms and privacy pages |

The [publishing specification at commit 3b7f4be](https://github.com/solana-mobile/dapp-publishing/blob/3b7f4be1288ccbb53852b9e433207a86dab25f94/publishing-spec/SPEC.md) contains a **1200×1200 `featureGraphic`** example. Prepare this square graphic for Editor's Choice/featuring **only upload if requested**. The supplied case study calls the portal field `editorsChoiceGraphicUrl`; that exact field name was **not found in the inspected public spec**, so verify the active portal rather than treating the name as a supported API. This square graphic is not a universal public listing-page requirement or a promise of selection. Optional 1920×1080 promotional art and a 1024×500 cross-store graphic are separate outputs, not replacements for the required banner.

Use [store-listing.md](../assets/templates/store-listing.md) for copy and [logo/store art](logo-and-store-art.md) for assets. Capture real submitted-build moments with a deterministic hook that advances the simulation until the key action is visible. Native-size 1080×1920 or 1920×1080 captures, followed by [store-compose.py](../assets/store-compose.py) caption bands, must retain HUD safe areas. Label composited promotional graphics honestly. Run a failing validator for file type, gallery count, common dimensions, aspect ratio, image size and video size. Remove third-party wallet details or explicitly record a redaction.

Provide reviewer steps to reach every advertised mode, necessary test access and expected results without sharing secrets. If a mode needs an existing timelock, provide an authorized reproducible review path or ask how the reviewer should access it; do not create a hidden review bypass or claim fixtures are mainnet proof.

## Verify on Seeker and retain evidence

Install the same signed candidate on a **physical Seeker** when available; record device/OS, wallet app/version, APK hash, date and result. Also test upgrading from the released Store build without uninstalling or erasing user data. Emulator, ordinary Android and desktop tests remain useful but do not establish physical Seeker compatibility. If hardware is unavailable, report that gap and prepare the test instructions instead of marking it passed.

Verify launch, language/profile selection, touch gameplay, pause/retry, back navigation, safe areas, supported orientations, audio suspension/recovery, screen lock, process restart, offline/error handling and performance. Check bundled legal access and website links. For approved promotions, verify their Free-only boundary, immediate Continue and optional external links; no ad interaction grants timelock/paid admission.

Exercise the implemented wallet route with Seed Vault Wallet and/or the explicitly supported mobile wallets: connect, reject/cancel, sign-in where implemented, disconnect, account change, expired authorization, app switching/return and unavailable wallet. Recheck active/expired/insufficient locks and network failure. Do not assume a desktop Phantom test proves a native MWA flow. Keep authorization, signature verification, lock eligibility and paid admission separate. Real funds or lock transactions require their own existing authorization; mocks/simulations must be labeled.

The [Publisher Policy](https://legal.solanamobile.com/pl/publisher-policy), reviewed 2026-10-24, prohibits untrusted WebView content/URLs and forced disruptive ad interaction. It does **not** say all hosted apps are forbidden. Preserve the owner's bundled-versus-hosted choice: bundled content is the default for an entirely on-device game; a hosted APK needs a fixed owner-controlled HTTPS origin, strict navigation and native-bridge allowlists, CSP, and review of every remote-content entry point. Never pass arbitrary URLs into a privileged WebView. See [Android architecture](seeker-android.md).

If the owner chooses a game with blood or dismemberment, use persisted Full/Reduced/Off controls in Title and Pause; store builds and screenshots default to Reduced. Off must remove blood, dismemberment and gore SFX. Describe horror/graphic violence honestly and select the rating actually offered by the portal. Do not invent a universal 17+/Mature field. The policy restricts gratuitous or real-world violence: a Reduced setting, warning or rating does not guarantee acceptance. Keep victims unambiguously adult. Align privacy text with actual RPC/proxy requests, sponsor requests, storage and analytics; claim no analytics only after inspecting the build.

## Submit through the current publisher workflow

Use the [Publisher Portal](https://publish.solanamobile.com/) and [new-app instructions](https://docs.solanamobile.com/dapp-store/submit-new-app). Prerequisites are the signed candidate, truthful listing assets, owner domain with public app/terms/privacy pages, support/contact email and an authorized publisher wallet with SOL. Reuse its identity for updates. Keep a dedicated publisher wallet distinct from the Android key. Complete individual KYC or organization KYB through the owner; approval is required before adding a dApp. Never invent identity or export a browser wallet's private key. Inspect live cost estimates for App NFT, Release NFT and storage. The prompt's community estimate of about **0.2 SOL** was not verified as a current official amount; do not budget or request funds from that number. Costs vary and need a margin.

Portal flow: sign up → publisher profile → KYC/KYB → connect publisher wallet → Add a dApp. The case-sensitive package name must match the APK and is permanent. Save and approve the App NFT transaction only within the authorized scope. Current default storage is **Cloudflare R2**; other providers are selected in Settings → Preferences. Then use **Releases → New Version**, select the APK/URL and What's New, and approve each expected transaction to reach **In Review**. Inspect interrupted or rejected sequences before retrying to avoid duplicates. For updates, use the existing app. Keep listing edits as a draft to ship with the new APK; publishing metadata alone creates a release with the existing APK and still requires a Release NFT and review. [Update workflow](https://docs.solanamobile.com/dapp-store/submit-an-update).

The current [publishing CLI](https://docs.solanamobile.com/dapp-store/publishing-cli) is `@solana-mobile/dapp-store-cli`; npm metadata verified **1.0.1**, Node **>=18**, on 2026-10-24. Pin the version actually tested. It requires an existing App NFT, release-ready APK, portal API key and an authorized Solana signer file. The supported alternatives are `--apk-file <candidate.apk>` or `--apk-url <immutable-https-apk-url>`, with `--keypair <private-signer-path>` and `--whats-new <release-notes>`. Supply `DAPP_STORE_API_KEY` through a secure environment/stdin, never a literal key in docs or command logs. These flags **submit a release**; do not run them while only preparing a package. Keep the keypair out of every repository, archive and artifact. Do not reuse legacy NFT creation commands or obtain a browser wallet's private key to enable CI.

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

Prepare a concise response mapping every reported code to the change, new version/hash or metadata revision and verification result. Submit the correction only within the authorized release scope. The official [support workflow](https://docs.solanamobile.com/dapp-store/support) uses a Developer role from `#developer` and a private `#dev-answers` ticket for publisher profile changes, KYC/KYB problems and review inquiries. Prepare evidence and contact support only when instructed. The current estimates are **3–4 business days for a new app**, **1–2 for an update**, with an inquiry after **5 business days** without a response. These are estimates, not guarantees.

For **Editor's Choice** or other featuring requests, prepare an application packet: live listing/version, accurate product pitch, actual gameplay footage, Seeker test evidence, licensed promotional assets, launch timing and genuine distinguishing features. Verify the current official application/contact route before sending; do not invent an application form. [Co-marketing guidance](https://docs.solanamobile.com/marketing/comarketing-guidelines) supports preparing copy and coordinating launches, but does not guarantee featuring, endorsement, distribution or a partnership. Publication and editorial selection are separate outcomes.

## Deliver a reviewable release package

Use `apk/` for the signed APK, `SHA256SUMS` and `CERT-FINGERPRINT.txt`; root `store-listing.md` for ready-to-paste metadata with missing values visibly marked TODO; `store-assets/` for licensed icon/banner/optional requested feature art/screenshots, captions and font license; `docs/` for dated BUILD_BRIEF, ASSETS_LICENSES and CHANGELOG; and `source/` for source, `BUILD.md` and an `.env.example` containing placeholders only. Add an owner's-language publishing guide with blockers first, sources/date, exact next step and what has actually been tested. Do not ship real RPC secrets, signing material or account data. Scan the complete folder and delivery ZIP with [check-no-secrets.py](../assets/check-no-secrets.py). Run all release tests, native validator tests, build/typecheck/dist checks and read-only simulations before building a candidate. Mark unrun checks explicitly. Keep APK identity and hashes consistent across every document.

## Link to this game's Store listing

Construct `solanadappstore://details?id=<actual-application-id>` from the verified package, never from another game's example or untrusted caller input. Open only after the player's explicit action; handle a missing Store app or failed intent by opening this game's fixed, publicly reachable **HTTPS download/info page**. That fallback is an app-owned delivery choice, not an assumed official HTTPS Store URL. Do not install an APK automatically. On web, offer both the Store link and usable HTTPS fallback. [Official deep-link scheme and Android package visibility](https://docs.solanamobile.com/dapp-store/link-to-dapp-listing-page)

Before delivery, test the Store intent on Seeker, fallback without a handler, correct package destination and return to the game. Preserve the live app's version and pending submission state when only preparing future materials.

## v1.7.5 update toolkit

Use [generated landing/privacy/terms pages](public-site.md), [automated gameplay capture and the 50 FPS release gate](performance-and-capture.md), and [same-key update preflight, publishing CLI and private Drive delivery](release-updates.md). Preflight binds version/certificate and physical Seeker evidence to the exact candidate, while the broader Store checklist still applies. The automatic Drive route is for selected delivery files over 25,000,000 bytes; it is not a Store size restriction or a substitute for submission.
