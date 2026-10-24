# Release pitfalls: symptom, rule and acceptance

Apply the relevant checks to the selected game/platform. These are lessons generalized from a specific build, not permission to turn every game into horror or change an existing economy. Evidence date: **2026-10-24**. Generated-game tests are separate from this package's helper tests; a green skill suite does not certify an APK or a mainnet flow.

## 1. Small icon on a white plate

**Rule:** adaptive foreground/background/monochrome, 108dp layers with key art within 66dp; full-bleed art or a dark background, full-bleed legacy density variants and opaque 512 Store icon. Use [icon builder](../assets/make-adaptive-icons.py), [icon tests](../assets/launcher-icon.test.mjs) and [Android icon guide](seeker-android.md#launcher-icon-required-check).

**Check:** inspect XML, actual dimensions and manifest icon/roundIcon; generate circle/squircle/rounded previews on light and dark; inspect the installed signed release on the physical Seeker. Dimensions alone do not prove art is readable.

## 2. Wrong permanent package or lost signing identity

**Rule:** ask final case-sensitive application ID before first release. Namespace may differ. New app: PKCS12, RSA 4096, dedicated alias outside the repo, protected properties path, two owner-controlled offline backups. Existing app: same key, increasing versionCode for every upload. Never show a password or include key material in a ZIP; private download only on explicit request.

**Check:** inspect actual APK package/version/`debuggable` flag, `apksigner verify --print-certs`, fingerprint and same-key upgrade. Ignore keystore/properties files. Record checksum/fingerprint only. A missing key blocks release signing, not debug implementation; never uninstall to bypass mismatch.

## 3. Paid RPC credential extracted from APK

**Rule:** use a method/parameter-allowlisted server proxy; fixed program/mint filters, per-IP quotas, response/deadline caps and no open relay. Typical needs: getAccountInfo, getMultipleAccounts, getProgramAccounts, getLatestBlockhash, getTokenAccountsByOwner, getSignatureStatuses, simulateTransaction, and sendTransaction only for the selected signing fallback; add balance/rent/fee/blockheight/history methods only when required. Never inline a private frontend env value. A restricted, dedicated, rotatable client key requires explicit owner risk acceptance and a distribution blocker until resolved.

**Check:** run [secret scanner](../assets/check-no-secrets.py) on source release folder, dist, extracted APK and ZIP, including exact sensitive values via process environment without printing them. Unit-test `redactRpcUrl` and `scrubSecrets` with synthetic keys; console, native errors and reports must not expose values. Review scanner limits; zero hits is not proof that every possible secret is absent.

## 4. Silent menu or stacked music

**Rule:** Android `mediaPlaybackRequiresUserGesture=false` on approved game content, AudioContext initialized and loops decoding at startup. Browser attempts autoplay then one first-gesture fallback. Persist mute separately from suspension. Background suspends; foreground resumes allowed music, never gameplay.

**Check:** cold launch, muted relaunch, denied browser autoplay, repeated navigation, pause/foreground and wallet return yield one music player, correct saved volume and no spontaneous run. See [music prompts](music-prompts.md).

## 5. Plain title after approved logo exists

**Rule:** menu h1 contains a dimensioned WebP/PNG picture with game-name alt, sourced/provenanced through [logo workflow](logo-and-store-art.md).

**Check:** inspect loading/fallback, actual mobile readability and no layout shift; picture is not an empty decorative h1 and alt remains meaningful.

## 6. Development labels in public release

**Rule:** gate debug overlays/fixture selectors on DEV or a non-release fixture flag. Scan visible UI strings in built dist for Prototype, DEV-FIXTURE, TODO and placeholder artifacts. Pass/market copy uses [the checker](../assets/check-player-copy.mjs); no brand exemption there.

**Check:** release build exercises real menus, errors and screenshot states with fixtures disabled. Scan both source copy and dist; snapshot visible text. Do not blanket-allow a minified file because one sponsor string is legitimate. Technical identifiers in libraries are distinguished from visible copy, with reviewed scoped exceptions where necessary.

## 7. Primitive people shipped as finished characters

**Rule:** for the selected realistic style, use a realistic hero first and approve desktop/phone frames before variants. Never ship capsule/primitive/instanced stand-in people as finished realistic art. Reduce cast size or use a decimated LOD of the same model. Respect the owner's explicitly different art style.

**Check:** inspect close and distant silhouettes, animation and material detail after LOD changes; no sliding static characters. Use [3D asset pipeline](3d-assets-and-characters.md) and record rights, draw calls, triangles and texture memory.

## 8. Quality oscillates or substitutes crude models

**Rule:** use [quality-governor.mjs](../assets/quality-governor.mjs): 3s windows, down below 50fps, up above 58fps after two good windows; ignore >250ms gaps; skip a settling window after change; block up for 30s after a failed step-up. Configure tiers to cut full-detail character cap first, then total crowd, shadows, DPR. Illustrative caps 7→5→4, crowd 32→22→16→14→10, shadow 1024→512, DPR 1.5→1.25→1 must be measured for the actual game.

**Check:** deterministic slow/fast/gap/failure sequences, sustained physical-device measurement and scrubbed `[<Game>]` tier logs forwarded to logcat. Report device/model/build/fps or untested; a screenshot and thresholds are not measured frame rate.

## 9. Uncontrolled violent content

**Rule:** only when the chosen game has blood/dismemberment, expose persisted Full / Reduced / Off in Title and Pause. Store default Reduced; Reduced softens wounds around half severity and removes dismemberment, Off removes blood, dismemberment and gore SFX. Use adult models/voices for victims. Do not impose this theme on other games.

**Check:** exercise all modes across restart/pause and event→SFX mapping. Capture Store assets in Reduced, include a truthful warning and declare the appropriate horror/violence content classification in the portal (e.g. Mature where applicable); never treat an example rating as automatic approval.

## 10. Empty or misleading store screenshots

**Rule:** deterministic test hook starts/advances/freezes actual simulation at a representative moment after enemies/objects arrive. Native 1080×1920 or chosen common 16:9 resolution; HUD-safe composition. Use only owner's wallet or explicitly disclose redaction of another address. Captions describe implemented features.

**Check:** actual frame/scene state, no debug overlays, consistent dimensions, 4–8 previews and image/video limits from [Store guide](solana-dapp-store.md). Run [compositor](../assets/store-compose.py) and validate resulting files, not merely inputs. A test hook must not be exposed in production as a score-authority bypass.

## 11. Tongue/teeth artifacts and facial wounds

**Rule:** inspect per-mesh jawOpen influence; prefer the face morph to extra jaw-bone rotation. Overdrive the tongue drop or hide it at jawOpen >0.12 for a scream only after model-specific inspection. Clamp mouthRoll/mouthFunnel combinations. Exclude eyes, lashes, brows, teeth and tongue from blood/wound shaders.

**Check:** 2× close-ups of each expression and transition on the actual model; no protrusion, exposed seam or shader spill. Numerical thresholds are model-tuning starting points, not universal anatomy constants.

## 12. Mixed language or identity placeholder

**Rule:** UI, HUD, plain errors, terms, lore, ads, wallet identity and Store text follow the owner's locales. Android resourceConfigurations matches actual shipped translations. Identity is game name + favicon.ico under the owner's real HTTPS domain; missing domain blocks release.

**Check:** dictionary completeness, real visible-text snapshots and errors in each supported locale, copy scan and installed language selection. Country flags do not demonstrate translation. No fabricated HTTPS domain or old stub claim enters Store notes.

## 13. Ads leak into the pass or block play

**Rule:** preserve the two independent owner questions. During active Free Play the only ad is the selected top Scan/YOUR AD HERE card; a separately selected Club promotion is before each new free round. No ads on pass gate/review/gated play; no extra ad network. Click pauses without auto-resume. Bundled APK uses a fixed-upstream native feed adapter, bounded/sanitized/cached, since it has no same-origin server.

**Check:** both/either/neither/no-free choices; first round/retry exactly once; Continue offline; fixed destination, feed failure/expiry, 12-item cap, 60s cache, timeout/size/redirect rejection; no sponsor request in gated mode. See [sponsors](free-play-sponsors.md).

## 14. Build succeeds despite broken access or copy

**Rule:** generated-game `npm run build` chains typecheck, build, dist checks and secret scan. `npm test` covers gate/Season Pass boundaries, copy, icon, market quote/transaction fixtures where selected, governor, audio, persistence and chosen-language checks. Android adds native transaction validators, bridge schema/origin/link allowlists and durable pending storage. Run unsigned read-only simulate:lock and, when selected, simulate:buy with a suitable public holder; never sign to prove a test.

**Check:** record commands, versions, exit status and limitations in BUILD_BRIEF; no release APK with a red required test. Missing network/hardware makes those results unavailable/untested, never passed. The skill helper suite alone does not supply a game's Kotlin validator, payment server, artwork or audio.

## 15. Wallet races, stale attempts and delivery confusion

**Rule:** single-flight calls, RESUMED activity, stable pass view during wallet flow, Buffer polyfill first in each lazy chain module. Use the current verified SDK version; explain why native Seeker Connect was or was not chosen. Inspect transitive Android test-library leakage before targeted exclusions. Pin exact JS dependencies and check package Node engines (the major version alone is insufficient). Forward scrubbed game-prefixed diagnostics to dedicated logcat tags.

**Check:** cold pass check before signing-chunk load; duplicated taps; wallet rejection, cancelled sheet, timeout after send, process death and false saved-payment first launch. Persist before handoff; ten-minute stale awaiting-wallet UI reconciliation does not erase a potentially submitted transaction. Recover through PDA/reference and final historical evidence; no automatic resign. Check the MWA −32601 capability fallback separately from timeout. Preserve all [v1.7.3 recovery safeguards](seeker-wallet.md#durable-payments-only-when-requested).

Keep dated BUILD_BRIEF, ASSETS_LICENSES and per-versionCode CHANGELOG. Mark superseded decisions rather than copying stale statements into Store docs. Route each selected deliverable over 25,000,000 bytes automatically to the configured private Drive destination using the checked delivery workflow; do not split APKs to satisfy a chat attachment limit. Keep the local APK intact for Store upload, and report contents, checksums and verified private links. Missing Drive authorization leaves delivery pending. Never include signing credentials or source-media files without the rights/scope to distribute them. Prepared, uploaded, submitted/in review, approved and live are separate verified statuses.

## 16. Repeatable release and recovery

Use the [private RPC proxy](rpc-proxy.md), [actual-facts public-site generator](public-site.md), [candidate-bound 50 FPS gate and ready-state screenshots](performance-and-capture.md), [stage checkpoints](incremental-build.md) and [same-key updates/Drive delivery](release-updates.md). A missing or failed required gate blocks release, not continuing development. Test the helper integrations against the actual game; synthetic toolkit tests cannot certify a game or device.
