---
name: devfridge-game-builder
description: Design and build Three.js browser games for Pump.fun communities with Phantom on desktop and mobile, using DevFridge timelocks for token-gated access. Use for new games or adding DevFridge access to an existing game, with optional ecosystem integrations.
metadata:
  author: DevFridge
  version: "1.1.0"
  sources-reviewed: "2026-09-22"
---
# DevFridge Game Builder

Turn a developer's meme into a playable browser game. Interview only for missing decisions, then implement and verify the game; do not stop at a concept or landing page. Respect an existing repository and the user's chosen genre. World is an example, not a template every game must copy.

## Discover the game

Read [the discovery guide](references/discovery.md). Start with up to three short questions about the core loop, exact Solana mint and desired lock rule. Offer concrete choices when the developer has no genre in mind. Reuse answers already supplied. Ask a second focused round for missing production decisions while building reversible scene/input work.

Produce a short build brief: loop and win/loss condition; camera; desktop/touch controls; assets and rights; mint-to-character mapping; raw token threshold; lock duration semantics; optional modules; score authority; hosting. Separate confirmed requirements, proposed defaults and unresolved blockers. No arbitrary World token, 500,000 minimum, ten-character limit, entry fee or reward contract is a universal requirement.

## Explain why players lock and return

Read [retention and token economics](references/retention-and-economics.md). Give the game a clear, honest pitch: a meme becomes a playable identity, a voluntary timelock unlocks access, and enjoyable progression/community gives players reasons to return. Ask what earns the next visit. A locked balance alone is not evidence of retention.

Explain that the gate reads timelocks in the existing DevFridge Solana program through the SDK/API; a new game does not need a separate timelock program. Use the developer's supported token and independent access rules. Include the 2% redemption fee and its PASTA buy-and-burn purpose in onboarding before any lock approval, alongside expiry, no early withdrawal, network costs and route constraints. Explain PASTA's developer-support role without claiming burned funds are direct infrastructure revenue or promising token appreciation.

## Choose the integration

Read [the ecosystem map](references/ecosystem.md). Use Fridge + SDK + Phantom as the core. Add only selected modules; considering the ecosystem does not authorize every integration. Verify current docs and on-chain mint ownership/decimals/extensions before enabling real locks. An existing Pump.fun token is not automatically Token-2022 compatible. If unsupported, continue a clearly labeled practice build and explain the blocker; never silently replace the user's token.

Read [SDK and access rules](references/sdk-access.md) and [Phantom and transactions](references/phantom.md) before implementing the gate. They describe differences between the SDK's whole-day subscription plans and an exact active-lock game gate. Use real published methods; do not invent an npm SDK package or a lock method on the read-only SDK.

Use the tested [exact lock evaluator](assets/timelock-gate.mjs) for precise raw-unit or sub-day rules. Its [tests](assets/timelock-gate.test.mjs) run with `node --test assets/timelock-gate.test.mjs` from this skill directory. The helper evaluates fetched evidence; it does not authenticate wallets, prove chain data, submit transactions or prevent score cheating.

## Build for desktop and phones

Read [Three.js and mobile delivery](references/game-delivery.md). Prefer TypeScript and the existing build system; Vite is a reasonable new-project default. Separate simulation, renderer, input, audio, wallet/access and persistence. Build a complete small loop with start, play, win/loss and restart before optional economy features.

Deliver equivalent keyboard/mouse and touch controls, responsive camera/canvas, bounded GPU cost, GLB loading/fallbacks, audio recovery after screen lock and dialogs that do not cover active play. Pin tested dependencies in a lockfile. Use user-owned/licensed art; public access to World's site is not a licence to copy its characters.

Practice mode must be visibly distinct from verified/ranked access. Browser-only gating cannot protect downloaded code or prove scores. Protect server features with server-side wallet and lock verification. Read [competitive modes](references/competition.md) when rankings, multiplayer, registration or rewards are requested.

## Verify and deliver

Test meaningful gate boundaries, expired/insufficient locks, stale/error evidence, wallet rejection/account changes, reconnects and no-wallet fallback. Test gameplay, touch input, orientation, safe areas, dialog focus, audio resume and WebGL loss. Include 390×844 portrait, phone landscape and desktop; distinguish emulation from actual Phantom mobile hardware tests.

Run type checks, build and relevant tests. Never sign a real lock, buy tokens, submit paid listings, deploy a contract or approve spending just to demonstrate the game. Simulations/fixtures do not establish a successful mainnet transaction. Deployment follows the user's actual authorization and hosting scope; this skill grants no additional permission.

Deliver code, configuration instructions, recorded test results/limitations and a playable preview. If publishing is requested, finish the repository/PR/deploy flow and check the real URL. Do not call a local-only change deployed. Include source links and review dates for chain-specific claims; consult [sources and update policy](references/sources.md) when APIs or docs disagree.
