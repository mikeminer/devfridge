# Seeker Android delivery

Official sources reviewed **2026-10-22**; delivery choices reviewed **2026-10-23**. Read for an explicitly selected **Seeker APK** or **Both browser and Seeker** target. Resolve platform, then **bundled game/assets or an APK loading the hosted game website**, before implementation; reuse explicit answers and leave missing choices pending. Browser-only work needs no APK. For Both, share game/assets and access rules while keeping platform wallet and navigation adapters separate.

## Package a complete game

Both architectures deliver a **signed installable APK**, with different content delivery:

- **Bundled:** include the built game, Three.js, fonts, translations, audio and licensed assets in the Android host. Game updates travel with APK updates. Selected free/practice gameplay should work offline; test that claim with networking disabled.
- **Hosted:** the Android host loads the owner's approved HTTPS game website. Record the production origin, deployment/version and update process. Initial loading and remote services need connectivity unless an explicit cache/offline implementation is tested. Handle outages, redirects and stale or incompatible web versions visibly; the APK signature does not authenticate later website deployments.

Online access checks, payments and server features need explicit unavailable states in either architecture. Neither local assets nor native wallet transport make chain operations offline. Do not introduce Free Play or advertisements without the owner's choices. Apply [mobile game delivery](game-delivery.md) and [approved sponsor behavior](free-play-sponsors.md). Offer [Game Room integration](game-room.md) for hosted delivery or Both, not for Seeker-only bundled delivery.

Inspect existing Android infrastructure first. For a new host, use a compatible Android Studio/Gradle setup or the current Kotlin template, then integrate the game. Resolve current SDK/toolchain compatibility from the [Kotlin installation guide](https://docs.solanamobile.com/get-started/kotlin/installation) and [Seeker Connect quickstart](https://docs.solanamobile.com/solana-mobile-stack/seeker-connect-quickstart); pin the versions actually verified in the generated project's Gradle catalog/wrapper and JavaScript lockfile. Do not copy SDK versions, package IDs, mints, recipients, RPC endpoints or prices from an example game.

For hosted delivery, the official [webshell tool](https://docs.solanamobile.com/cli/webshell) generates a URL-based Android WebView project with wallet-intent handling and a signed-APK build path. It is a starting point, not proof that the selected wallet/game works. Inspect its current navigation and wallet integration before adding an adapter. The [Seeker Connect announcement](https://solanamobile.com/blog/seeker-connect-one-tap-solana-wallet-connection) covers web and native integrations; choose the SDK for the actual runtime, independently of where assets live. Do not assume a PWA/TWA, browser and native host use the same wallet transport.

## Keep native capabilities behind a narrow boundary

For bundled delivery use [WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) with a fixed HTTPS asset origin, such as its reserved `appassets.androidplatform.net`, and an explicit local game path. This asset origin is separate from the real, owned HTTPS website used for wallet identity. Missing local files return an error; they must not fall through to remote executable content.

For hosted delivery allow only the approved HTTPS game origin and document paths inside the privileged WebView. Check main-frame navigations and redirects; do not grant bridge access to another origin, error page or untrusted frame. Treat production website changes as privileged application-code updates: use controlled deployments, compatible bridge versions and rollback. A lost network connection must not redirect into an unrestricted browser inside the host.

Use a minimal native message adapter for the requested wallet/access/share actions. With [WebViewCompat.addWebMessageListener](https://developer.android.com/reference/androidx/webkit/WebViewCompat#addWebMessageListener(android.webkit.WebView,java.lang.String,java.util.Set,androidx.webkit.WebViewCompat.WebMessageListener)), feature-check support and specify only the exact approved asset or hosted origin, never `*`. On every request verify `sourceOrigin`, `isMainFrame`, current approved document path and foreground lifecycle. Validate a bounded JSON schema, method allowlist and request ID; reject unknown fields/actions and concurrent wallet requests. Associate replies with the current document generation so stale results cannot reach a replacement page. Use the callback reply mechanism rather than interpolating untrusted JavaScript. These additional checks are this skill's implementation requirements; origin matching alone does not establish a user's payment intent.

Do not expose arbitrary URLs, filesystem paths, raw Android intents or unrestricted signing through the bridge. Native code must validate the action's wallet, network and transaction details; follow [the wallet guide](seeker-wallet.md). Handle external links through explicit user actions and parsed destination allowlists, outside the privileged WebView. Use fixed Store destinations only where selected; reject `javascript:`, `file:`, arbitrary `intent:` and encoded-host tricks.

Disable file/content access and mixed content; allow only the needed HTTPS API/image destinations, with bounded responses. Keep remote executable content out of bundled gameplay; for hosted gameplay serve controlled scripts from approved origins. Exclude untrusted scripts/frames from privileged documents and apply a restrictive CSP. Enable JavaScript only where the game needs it. Avoid a broadly exposed `addJavascriptInterface`; Android documents its cross-frame risks in [native bridge security](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges). Enable WebView inspection only in debug builds. Do not log auth tokens, signing payloads containing private application data, or signing credentials.

## Lifecycle and device behavior

Reserve Android system-bar/cutout space once, then size the canvas and touch HUD inside it. Handle Back, keyboard, orientation, interrupted audio, WebGL loss and low-memory recreation. Pause simulation before wallet or external navigation; clamp elapsed time on return and require a deliberate resume. Never let `onResume`, rotation or re-render automatically reconnect, sign, pay, refresh lives or replay an interstitial. Restore durable purchase state before offering a new paid action. Keep the offline menu usable without fabricating an access result.

## Build, sign and identify the artifact

Ask for the final permanent case-sensitive application ID before the first release build; the internal Kotlin namespace can differ. For a **new** app only, create a PKCS12 keystore with RSA 4096 and a dedicated alias outside the repository, with two offline backups the owner controls. Updates must reuse the existing signing identity. Gradle reads `<keystore.properties path>` through protected configuration or an environment variable holding that path. Ignore `*.jks`, `*.keystore` and signing properties; never print passwords, copy keys into delivery/source ZIPs or export a browser wallet key. Offer a private keystore download only if explicitly requested. Record only the certificate SHA-256 and APK checksum, not secrets.

Keep the release application ID stable, use an increasing `versionCode` and set the displayed `versionName`; see [Android versioning](https://developer.android.com/studio/publish/versioning). Keep debug installs separate where appropriate. Reuse the existing release signing key for updates; never generate a replacement to bypass missing credentials or an install mismatch. Store keystore/passwords outside source control and pass secrets through the project's protected configuration. See [Android signing](https://developer.android.com/studio/publish/app-signing).

Use the project's Gradle wrapper; adapt module/flavor names to the repository. Typical PowerShell tasks are:

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
.\gradlew.bat :app:connectedDebugAndroidTest
.\gradlew.bat :app:assembleRelease
apksigner verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
Get-FileHash -Algorithm SHA256 app/build/outputs/apk/release/app-release.apk
```

Run connected tests only against the intended authorized device. A release task needs its real signing configuration; a debug/unsigned artifact is not a Store release. The [Store APK guide](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk) requires a signed APK. Verify the actual output's package, versions, certificate fingerprint, permissions and debuggable flag, not just the source configuration.

Record source commit (or explicitly identified working snapshot), architecture, tool/dependency versions, bundled game-file hashes or tested website URL/deployment identity, APK SHA-256, certificate SHA-256 and completed tests in a release manifest. Hashes establish artifact identity, not an audit or byte-for-byte reproducibility claim. Continue authorized build/preparation work; missing signing credentials block release signing, not implementation or debug validation. Proceed to [Store submission](solana-dapp-store.md) within the user's publication scope.

## Launcher icon (required check)

Create a genuine adaptive icon, not a small square on a white plate. Use [make-adaptive-icons.py](../assets/make-adaptive-icons.py): 108dp layers (432px xxxhdpi), key art inside the central 66dp, background + foreground + monochrome, `ic_launcher.xml` and `ic_launcher_round.xml` under `mipmap-anydpi-v26`. Supply full-bleed 48dp legacy PNGs for each density and an opaque RGB 512×512 Store icon. Use an owner-approved crop/badge, full-bleed art or dark background. Wire the manifest's icon and roundIcon, test circle/squircle/rounded masks on light/dark backgrounds, and inspect the installed release on a Seeker. See [logo/store art](logo-and-store-art.md); passing dimensions is not a visual approval.

## RPC, audio and production diagnostics

Use a server proxy for private paid RPC credentials, even with bundled gameplay. Restrict methods and parameter shapes to this game's reads/simulation/send needs; enforce quotas, timeouts, response caps and abuse limits. Fixed program/mint filters apply to `getProgramAccounts`. Include `getBalance`, fee/rent estimation, block-height/history methods only where the implementation actually needs them; no arbitrary endpoint or open relay. Sponsor feed requests use the separate [native fixed-upstream adapter](free-play-sponsors.md#bundled-apk-native-feed-adapter). Do not inline a secret via a frontend build variable.

Only with explicit owner acceptance may a dedicated restricted rotatable client credential be considered; restrictions do not make it secret. Record risk and distribution blocker until resolved. Apply `redactRpcUrl`/`scrubSecrets` before all logs, native errors and crash reporting; replace full RPC URLs with `<YOUR_RPC_URL>`, never print credentials to prove redaction. Run [check-no-secrets.py](../assets/check-no-secrets.py) on built assets, extracted APK, release folder and ZIP. Scanning is a detection layer, not permission to ship a key.

For the Android host's own game content set `WebSettings.mediaPlaybackRequiresUserGesture = false`; initialize AudioContext and decode menu loops at startup. Honor saved mute. Browsers try autoplay and fall back to the first gesture with one player, not stacked handlers. Background suspends audio and gameplay; foreground may resume allowed music, but gameplay always awaits deliberate resume. See [music](music-prompts.md).

Gate debug fixtures/labels on DEV or an explicitly non-release fixture build. Release visible-string checks reject Prototype, DEV-FIXTURE, TODO and placeholder labels; legitimate technical strings are reviewed by scope rather than blanket deletion. Match Android `resourceConfigurations` to shipped UI locales; country flags alone are not translations. Forward scrubbed game-prefixed console lines to dedicated logcat tags, e.g. `adb logcat -s <Game>Wallet <Game>Web chromium`.

Dependency evidence reviewed 2026-10-24: Kotlin MWA clientlib **2.0.3** in the official docs version constants; Seeker Connect **0.2.0** quickstart requires compileSdk **36+**, AGP **8.9.1+**, Kotlin **2+**. Pin tested exact versions and record why the selected transport was used. Inspect the Gradle dependency graph for `androidx.test` leaked by clientlib-ktx; exclude only the offending transitive test artifacts if present, then rebuild/test. Do not exclude all AndroidX. Check Node engines from actual npm package metadata rather than assuming a major version is enough. Keep dated BUILD_BRIEF and ASSETS_LICENSES, and a CHANGELOG for every uploaded versionCode; mark superseded decisions so old stub notes cannot become release claims.

## Verify on a physical Seeker

Have the owner enable Developer options/USB debugging and accept the computer's RSA prompt; follow [Android device setup](https://developer.android.com/studio/run/device). Never bypass that prompt. Use `adb devices -l` and select the actual Seeker serial when multiple devices are connected. The [ADB guide](https://developer.android.com/tools/adb) documents installation and log collection; `adb -s <serial> install -r <apk>` preserves existing app data for a compatible update. Do not uninstall an existing release to work around a signing mismatch: it can erase purchases and recovery state.

Test clean launch and same-key upgrade, selected offline boundaries, real touch/safe areas, sustained GPU/audio behavior, lock/unlock, background/return, rotation and process recreation. For bundled delivery test missing assets and offline free/practice if selected; for hosted delivery test first-load outage, reload, redirects, deployment changes and any cache behavior. In both, reject bridge calls from other origins/frames and stale documents. Exercise wallet cancellation, lost callbacks and recovered payments from [seeker-wallet.md](seeker-wallet.md). Capture scoped logs/screenshots with sensitive data redacted. Emulator/mock-wallet results help isolate failures, but report them separately from physical Seeker and release-APK results. If hardware is unavailable, deliver the artifact and exact untested cases without calling it device-verified.
