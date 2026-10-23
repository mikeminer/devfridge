---
name: devfridge-game-builder
description: Build Three.js games for browser, Seeker Android or both with DevFridge access. Use for wallet integration, bundled or hosted signed APKs, device tests, Store releases and optional Game Room discovery or Free Play promotions.
metadata:
  author: DevFridge
  version: "1.7.1"
  sources-reviewed: "2026-10-23"
---
# DevFridge Game Builder

Turn a developer's meme into a playable game on their chosen platform. Interview only for missing decisions, then implement and verify the game; do not stop at a concept or landing page. Respect an existing repository and the user's chosen genre. World is an example, not a template every game must copy.

## Choose the platform first

Before building a game, always resolve: **Browser, Seeker app, or both?** Reuse an explicit platform choice already supplied for this game; otherwise ask and wait before gameplay or platform implementation. Read-only discovery and setup may continue. Do not infer an APK from “mobile-friendly”, or infer browser-only from a Three.js game. Record the choice in the brief and copied prompts; unanswered has no default.

- **Browser:** deliver the web game with desktop/touch controls and browser wallets; no APK is required. Read [browser wallet integration](references/phantom.md).
- **Seeker app:** next resolve **game and assets included in the APK, or an APK that loads the game website?** Reuse an explicit answer; otherwise ask and wait before platform/gameplay implementation. Both choices deliver a signed installable APK; there is no architecture default. Read [Android APK delivery](references/seeker-android.md), [Seeker wallets and payment recovery](references/seeker-wallet.md) and, for listing preparation/releases, [Solana dApp Store publishing](references/solana-dapp-store.md). Test the chosen release on a physical Seeker.
- **Both:** share game rules, assets and translations; separate browser/native wallet, storage, lifecycle and external-link adapters. Deliver and verify both artifacts. A passing browser test does not certify the APK, or vice versa.

Apply the same APK architecture question to **Both**. A bundled game can still use online services; a hosted game can have explicitly implemented caching. Neither choice alone promises offline access or decides the wallet transport.

## Discover the game

Read [the discovery guide](references/discovery.md). After platform and any applicable APK architecture choice, ask up to three short questions about the core loop, exact Solana mint and desired lock rule, omitting known answers. Offer concrete choices when the developer has no genre in mind. Resolve applicable Game Room and Free Play placement choices below before scene/input implementation; then ask focused follow-ups for other missing production decisions while building reversible work.

For **Browser**, **Both**, or **Seeker with a hosted website**, offer **include this web game in OnlyFridge Club's Game Room?** Reuse an explicit include/exclude answer; otherwise ask and record pending until answered. For **Seeker with a bundled game only**, mark not applicable and do not offer it or create a website just to qualify. This discovery choice is independent of Free Play and each advertisement. Include means prepare the actual integration and review evidence using [the Game Room guide](references/game-room.md); it does not make the catalog entry live automatically.

Before implementing gameplay, always resolve two independent owner choices: **include an OnlyFridge Club promotion before every new Free Play round?** and **include a DevFridge Scan sponsored-token / YOUR AD HERE card at the top during Free Play?** Offer both, either one, or neither. Reuse explicit answers for this game; otherwise ask and wait for those choices before building gameplay. Read-only discovery and setup may continue. Unanswered is unresolved, never consent or an automatic default; record each choice in the brief. These are build-time questions for the owner, not prompts to players on every run. If the owner chooses no Free Play, record both as not applicable and do not add a free mode just for ads.

Produce a short build brief: platform, applicable APK architecture and deliverables; Game Room and each ad decision separately; loop and win/loss condition; camera; desktop/touch controls; assets and rights; mint-to-character mapping; raw token threshold; lock duration semantics; optional modules; score authority; hosting and any Android package/release identity. Keep conditional unanswered choices pending, never consent; do not ask inapplicable questions. Separate confirmed requirements, proposed defaults and unresolved blockers. No example game's token, minimum, entry price, recipient, package ID or RPC endpoint is a universal requirement.

## Explain why players lock and return

Read [retention and token economics](references/retention-and-economics.md). Pitch this as a tokenized game: map the community's existing fungible mint to a playable character/feature and use a qualifying DevFridge timelock as its access gate. Explain why this stack uses Token-2022 and how MetadataPointer, TokenMetadata, URI JSON and any Metaplex metadata help wallets/tools identify the character; never imply Fridge reads metadata or that metadata contains the game. The same token remains traded on its existing market. Explain how shared gameplay may give the Pump.fun community utility and reasons to return, while making demand/appreciation a possibility, never a promise. Do not imply token holders own the game, audience size is encoded into the mint, or later players pay earlier ones. Tokens stay unavailable until expiry; after redemption the holder faces the open market. Ask what earns the next visit. A locked balance alone is not evidence of retention.

Explain that the gate reads timelocks in the existing DevFridge Solana program through the SDK/API; a new game does not need a separate timelock program. Use the developer's supported token and independent access rules. Include the 2% redemption fee and its PASTA buy-and-burn purpose in onboarding before any lock approval, alongside expiry, no early withdrawal, network costs and route constraints. Explain PASTA's developer-support role without claiming burned funds are direct infrastructure revenue or promising token appreciation.

Read [program reuse and verification](references/program-and-verification.md) when presenting Fridge: describe its reusable vault infrastructure and graphical explorer, separate security metadata from source/build verification and independent audits, and link dated evidence. Use the reusable-rocket analogy without implying endorsement. Publish development/audit costs only when substantiated; an explorer badge or rent balance does not establish an audit or expenditure total.

## Choose the integration

Read [the ecosystem map](references/ecosystem.md). Use Fridge + SDK with a verified adapter for the actual runtime: Phantom/browser wallets and optional Seeker Connect web on the website; compatible Seeker Connect/Mobile Wallet Adapter in the Android host. Hosting assets remotely does not give a WebView an injected browser wallet. Add only selected modules; considering the ecosystem does not authorize every integration. Verify current docs and on-chain mint ownership/decimals/extensions before enabling real locks. An existing Pump.fun token is not automatically Token-2022 compatible. If unsupported, use labeled development fixtures and explain the blocker; player-facing practice must fit the owner's chosen free-mode scope. Never silently replace the user's token.

Read [SDK and access rules](references/sdk-access.md) and the chosen platform's wallet guide before implementing the gate. Distinguish the SDK's whole-day subscription plans from an exact active-lock game gate. Use real published methods; do not invent an npm SDK package or a lock method on the read-only SDK. Keep wallet connection, authenticated identity, timelock entitlement, paid-round receipt and score authority separate.

Use the tested [exact lock evaluator](assets/timelock-gate.mjs) for precise raw-unit or sub-day rules. Its [tests](assets/timelock-gate.test.mjs) run with `node --test assets/timelock-gate.test.mjs` from this skill directory. The helper evaluates fetched evidence; it does not authenticate wallets, prove chain data, submit transactions or prevent score cheating.

For either approved Free Play placement, read [free-play promotions and sponsors](references/free-play-sponsors.md). Implement only the chosen placements. OnlyFridge Club appears before each new free round, including the first and retries, with a clear Continue action. The top card uses validated active Scan boosts or YOUR AD HERE; paid/token-gated modes show neither placement. Keep external links optional, localize the labels and disclosures, and let unavailable sponsor services fall back without blocking free gameplay. Ad clicks, installs and boosts never grant paid-round or timelock admission.

## Build for the selected devices

Read [Three.js and mobile delivery](references/game-delivery.md). Prefer TypeScript and the existing build system; Vite is a reasonable new-project default. Separate simulation, renderer, input, audio, wallet/access and persistence. Build a complete small loop with start, play, win/loss and restart before optional economy features.

Read [visual realism](references/visual-realism.md) and make a finished visual pass: detailed models with convincing silhouettes, realistic PBR textures, environment reflections, soft contact shadows and consistent scale. Prefer material realism by default, including for playful meme characters; respect a developer’s explicit alternate style. Placeholder cubes are for blockout, not finished art. Budget and test the result on mobile.

Deliver appropriate touch controls and, for browser desktop, equivalent keyboard/mouse controls; responsive camera/canvas, bounded GPU cost, GLB loading/fallbacks, audio recovery after screen lock and dialogs that do not cover active play. Pin tested dependencies. For Seeker, follow the selected bundled/hosted architecture, keep RPC secrets on the server and native bridge operations narrowly scoped. Use user-owned/licensed art; public access to World's site is not a licence to copy its characters.

Practice mode must be visibly distinct from verified/ranked access. Browser-only gating cannot protect downloaded code or prove scores. Protect server features with server-side wallet and lock verification. Read [competitive modes](references/competition.md) when rankings, multiplayer, registration or rewards are requested.

## Verify and deliver

Test meaningful gate boundaries, expired/insufficient locks, stale/error evidence, wallet rejection/account changes, reconnects and no-wallet fallback. Test gameplay, touch input, orientation, safe areas, dialog focus, audio resume and WebGL loss. For web include 390×844 portrait, phone landscape and desktop; distinguish emulation from hardware tests. For Seeker verify cold start, wallet return/cancellation, process recreation, payment recovery, offline boundaries and upgrade install of the signed release APK. Record untested physical-device cases instead of claiming certification.

Run type checks, build and relevant tests. Never sign a real lock, buy tokens, submit paid listings, deploy a contract or approve spending just to demonstrate the game. Simulations/fixtures do not establish a successful mainnet transaction. Deployment follows the user's actual authorization and hosting scope; this skill grants no additional permission.

Deliver code, configuration instructions and recorded test results/limitations, plus the chosen web preview and/or signed APK with checksum, package, version and signing-certificate fingerprint. If publishing is requested, finish the applicable repository/deploy or Store submission workflow within the user's authorization; honor any explicit request to wait for final approval. Verify the real URL or portal status. Uploaded, submitted for review and live in the Store are distinct outcomes. Include source links and review dates for chain-specific claims; consult [sources and update policy](references/sources.md) when APIs or docs disagree.

## Guide a hackathon submission

When a user wants to participate in the DevFridge hackathon or publish a gallery entry, read [the guided submission workflow](references/hackathon-submission.md). Support non-developers: reuse build details, gather only missing choices, prepare truthful evidence, validate the project metadata, and use the user's GitHub session to create the fork, branch and pull request yourself. Do not hand the user a Git checklist as the finished result. Guide sign-in only when needed; a request to submit is already authorization to open the PR.

Keep source/game hosting separate from the metadata-only PR to `mikeminer/devfridge:master`. Owner review and merge followed by a successful production deployment publish the entry to the hackathon gallery. Never self-approve, bypass review or call a pending PR published. Report the real PR link and status; dates, prizes and final competition eligibility remain to be announced.

The gallery and public `https://hackathon.devfridge.cool/projects.json` feed share the owner-maintained `scan/data/projects.json` release registry. Publication requires updating that file after owner review; incoming submission JSON files alone never publish a game. Follow the maintainer steps in the guided workflow and verify both the live gallery and feed.
