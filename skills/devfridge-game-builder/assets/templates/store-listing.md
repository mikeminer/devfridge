# Store listing — <Game name>

Preparation template. Fill from the exact APK and verified behavior; delete inapplicable notes before pasting. **Do not publish with TODOs.** Specs reviewed 2026-10-24; recheck [the current listing guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines) and [release workflow](../../references/solana-dapp-store.md) on submission day.

## Release identity and blockers

- Package / versionName / versionCode: TODO
- APK filename, SHA-256 and certificate SHA-256: TODO
- Target: bundled app / trusted hosted app; public browser edition if any: TODO
- Physical Seeker install and upgrade evidence: TODO or explicitly untested
- Blocking missing links/assets/translations/tests: TODO
- Owner authorization for this exact submission: TODO; prepared is not submitted

## Public fields

**Name (≤25 characters):** TODO

**Short description (≤50 characters):** TODO

**Long description:**

TODO: describe the implemented gameplay, controls, progression and supported modes in the player's language. Explain Free Play scope accurately. For an optional Season Pass, state the required token quantity, how long it stays held on-chain and what gameplay the pass enables. Do not promise token income, fixed value, guaranteed access after expiry, unimplemented features, audits or endorsement. Include an honest violence/content warning only when relevant. Keep technical protocol details in the app's Details and reviewer notes, without concealing financial restrictions.

**What's New:** TODO: concrete changes in this exact build; no future roadmap as shipped functionality.

**Category / content rating:** TODO: select the current portal options based on the build.

**Supported UI locales:** TODO: verified locale identifiers. Countries, flags, curricula and translated store descriptions are not automatically additional UI languages.

## Public URLs and contacts

- Developer/publisher website: TODO HTTPS
- App website: TODO HTTPS
- Privacy policy: TODO public HTTPS, matching actual network/storage behavior
- Terms/EULA: TODO public HTTPS, also accessible from the app
- Support email: TODO
- Contact email: TODO
- Copyright/license links if requested: TODO

Check every link without login, with valid TLS and meaningful app/publisher content. A missing owner domain blocks a publishable candidate, not local development.

## Preview and artwork plan

- Opaque icon: 512×512.
- Banner: 1200×600, real game frame plus readable logo/tagline.
- Gallery: 4–8 screenshots/videos; all identical dimensions, either 9:16 or 16:9. Prefer 1080×1920 or 1920×1080 native captures. Image JPG/PNG/GIF/WebP ≤3 MB; MP4 ≤30 MB.
- Square featuring art: 1200×1200; upload only if requested. Check the actual portal field; selection is separate from publishing.
- Optional other promotional outputs: keep clearly separate from required Store assets.
- Record font and visual licenses in `store-assets/` and `ASSETS_LICENSES.md`.

| Order | Actual screen/moment | Truthful caption | Source capture / artifact |
| --- | --- | --- | --- |
| 1 | Title and implemented identity | TODO | TODO |
| 2 | Main playable action | TODO | TODO |
| 3 | Distinct actual mode or level | TODO | TODO |
| 4 | Results/progression or approved pass flow | TODO | TODO |

Add at most four more previews if useful. Freeze a deterministic test scene only after the intended action is present. Preserve HUD readability and use Reduced violence for Store captures when relevant. Do not show third-party wallet addresses; record any redaction. Promotional caption bands do not make a concept render a gameplay screenshot.

## Reviewer-only notes

Give steps to each advertised mode, network/wallet prerequisites, authorized test access and expected result. State actual Season Pass program/mint, per-deposit rule and financial disclosures here when needed. Never include credentials, seeds, signing keys, private RPC URLs or a hidden review bypass. Fixtures and read-only simulations are not mainnet transactions or physical-device proof.

## Submission record

Date and sources checked: TODO. Exact authorized action: TODO. App/release/submission IDs and observed state: TODO. Use **prepared / uploaded / submitted-in review / approved / live** separately. Record transaction identifiers if already authorized and completed; never infer live status from an upload or pending signature.
