# DevFridge Game Builder — Changelog

## 1.7.4 — 2026-10-24

Prepared from the exact public v1.7.3 package, applying the supplied Street Meat lessons and companion changelog. Game names, quantities, package IDs and horror styling in worked examples are not defaults. This package updates the skill and reusable tools; it does not publish a game, deploy the site or execute financial transactions.

### Season Pass and optional in-game market

- Season Pass is the default player-facing access model. Owners choose ordered duration/amount tiers and what remains free. A proposed 1 Month / 6 Months / 1 Year layout gets a Best value badge/preselection only when the amount per day is actually lower.
- Added a pure BigInt per-deposit evaluator, a trusted-evidence adapter and tests for boundaries, identity, freshness, split amounts, highest tier and expiry. Highest-tier benefits expire when evidence for that tier ends; a longer lower-tier deposit cannot extend them. No aggregate balance grants a tier.
- Documented direct in-app activation on the existing Fridge program: pinned IDL, compatibility/balance/rent prechecks, simulation, exact native intent validation, signing-time end date, durable pre-handoff persistence and signature/PDA reconciliation. On-chain reads are the default; SDK/Scan remain optional read paths. `getLockUrl()` is optional / legacy only.
- Player copy shows amount, duration, end date and honest Details, including the 2% fee, network costs and route/market risks. Added a lexical copy checker with scoped exact exceptions and strict pass/market brand checks, plus rendered/locale review requirements. Technical reviewer documentation remains accurate.
- Added an opt-in in-game Buy <TOKEN> module specification with runtime curve/pool/multi-hop discovery, BigInt quote/minimum output, fee/reserve disclosure, final simulation, native transaction validation, unknown-outcome recovery and test requirements. No real trade or Kotlin trading implementation is included in this skill package.

### Release quality and media tooling

- Added a symptom/rule/acceptance checklist for adaptive icons, permanent package/signing identity, secret-free RPC delivery, menu autoplay/lifecycle, logo headings, development text, finished realistic art, adaptive quality, conditional gore settings, capture timing, face morph artifacts, languages, Free Play boundaries and durable wallet state.
- Added a pure 3-second quality governor with down/up thresholds, settling windows, ignored long gaps and failed-upgrade cooldown, plus deterministic tests. Thresholds are not a measured device-FPS claim.
- Added configurable Python icon, Store compositor, secret scanner and SFX processing tools. They include help/usage and synthetic validation; game-specific assets, listening approval and physical-device checks remain required.
- Added logo/Store artwork guidance, asset-licence template, SFX prompt/manifest kit and soundtrack brief. Horror, gore, voice budgets and particular art styles are worked examples only; explicit owner choices still govern content.
- Added a legal realistic-character/LOD pipeline, PBR environment guidance and measured phone budgets. Vendored 18 selected gamedev skills at commit `184b72be02884f782a0058f2eeae2ce4277453e4`, byte-identical with upstream LICENSE/NOTICE and a local provenance README; the full pack remains optional.

### Seeker, Store and compatibility

- Retained Browser / Seeker / Both and bundled / hosted APK choices, Seeker Connect alongside generic MWA and browser Phantom, native origin/lifecycle boundaries, Chrome local-network permission handling including loopback exemption and fresh gesture, global one-use receipt requirements, and honest hardware-test reporting.
- Retained conditional Game Room inclusion for web delivery, the separate Club importer and curated hackathon gallery workflows, and both independent Free Play opt-ins. The top card is the only ad **during active Free Play**; the separately selected Club promotion remains **before** a new round. This resolves the supplied prompt's conflicting “only card” language without deleting a feature.
- Bundled APK sponsor reads use a bounded fixed-upstream native adapter; pass/gated screens have no placements or feed requests.
- Corrected the Store short-description limit from 30 to **50** characters, with dated listing requirements, actual locale verification, publisher prerequisites, release flow, CLI and truthful release status. Preserved hosted APK support under current trusted-WebView policy.
- Verified the public publishing spec's 1200×1200 `featureGraphic`; the proposed portal field name `editorsChoiceGraphicUrl` remains unverified. Upload featuring assets only when requested; selection is not guaranteed.
- Preserved all 20 baseline files. `assets/timelock-gate.mjs` and its tests are unchanged byte-for-byte. New helpers sit alongside them.

### Verification boundaries

Primary sources and exact pins are in [sources.md](references/sources.md) and [program verification](references/program-and-verification.md). Source/IDL checks and the remote verifier response do not constitute a fresh deployed-binary rebuild or independent audit. No unsigned game-specific mainnet simulation, device test, Store upload, wallet signature, purchase or site deployment was performed to create this package. The website update is supplied separately as `site-copy-v1.7.4.md`, a proposal requiring its own publication authorization.

## 1.7.3 — baseline preserved

Public package reviewed 2026-10-23, SHA-256 `c05bb9054697f3b2be523516830b87a38c4a5441e7e0af6877b33f2f39d0c893`, 63,367 bytes, 20 files. Includes direct local-WebSocket MWA permission handling, loopback-page exemption and transport-specific routing; no historical changelog beyond the verified baseline is invented here.
