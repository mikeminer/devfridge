# Fridge Run

A small Three.js cold-chain courier game for the PASTA food/meme community. Collect six cold crates, avoid warm vents and return to the loading bay before the ice runs out. Free practice takes 75 seconds; the Night Shift challenge takes 50 seconds. Keyboard and touch share the same fixed-step simulation.

## Run locally

Use Node 24 (tested 24.18.0) and npm.

```sh
npm ci
npm run dev -- --port 5189
npm test
npm run build
npm run preview
```

Open the localhost URL printed by Vite. No credentials or environment variables are required. If an enterprise certificate is trusted by Windows but not Node, `NODE_USE_SYSTEM_CA=1` enables the system trust store; do not disable certificate verification.

Browser verification uses locally installed Google Chrome:

```sh
# Start the dev server on port 5189 in another terminal first.
node tests/browser.mjs
```

The browser test uses labelled synthetic wallet/lock fixtures. It never connects a real wallet or signs anything. Screenshots and the result receipt are written to `docs/`.

## Play

- WASD or arrows: drive. Space: brake. P / Escape: pause.
- On touch devices, use the directional pad and Brake button.
- Collect all six glowing crates and return to the striped loading bay.
- Orange heat vents cost five seconds per contact, with a two-second cooldown.
- Pause, backgrounding and dialogs stop simulation. Local personal bests survive expiry and disconnection. Scores are unverified, browser-local and carry no prizes.
- The game is deliberately silent; there is no AudioContext to resume.

## PASTA policy

Exact mainnet mint: `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`.

The user supplied the mint and delegated amount/duration selection. This prototype uses **100 PASTA = 100,000,000 raw units**, summing qualifying same-mint locks for one wallet. Each counted vault needs an original duration of at least **86,400 seconds** and at least **60 seconds remaining**. Threshold and time comparisons are inclusive. The first second a counted lock stops meeting the rule triggers re-evaluation. The 50-second challenge leaves a short margin; unavailable or stale evidence pauses challenge access and offers free practice.

This is a modest game-access pilot, not a validated retention strategy or price-support mechanism. No token purchase is required to inspect the game. A lock does not control other holdings or guarantee token prices. Assess completion, repeat play and community feedback before changing the policy; no analytics collection is installed.

Finalized public RPC evidence, fetched 2026-09-22 at slot 449367314, identifies the mint as initialized Token-2022, 6 decimals, with metadataPointer and tokenMetadata extensions. Mint and freeze authorities are null in that receipt. See `docs/mint-rpc-evidence.json`. This is a dated read, not a simulated or executed deposit/redemption.

## Integration and trust boundaries

1. **Connection / identity:** `src/wallet.ts` discovers Phantom on a user action. Connection is explicitly not server authentication. This local prototype has no server session and requests no signed messages. A valuable server feature must first add a short-lived single-use nonce bound to origin, wallet, chain and action, verify Ed25519 signatures server-side, atomically consume the nonce, and issue a bounded session.
2. **Eligibility:** `src/access.mjs` reads the published DevFridge check endpoint. The official BigInt evaluator validates each vault, exact amount, mint, depositor, durations, duplicates and evidence freshness. Requests coalesce and back off on failures/429. Account changes/disconnect invalidate old responses. This client check controls UI only; downloaded game code is not protected. Sensitive admission needs fresh program-account checks on the authenticated server, not a trusted browser flag or cached API alone.
3. **Score authority:** `src/simulation.mjs` computes unverified local results. No ranked leaderboard, reward claim, score-verification server or anti-cheat guarantee exists. Do not repurpose the score or deterministic tests as proof of human play.

Existing DevFridge program only: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. No contract is deployed. The external DevFridge link appears after fee and expiry disclosures; this app has no transaction construction, signing or submission code.

There is no early withdrawal. Current documentation specifies a **2% redemption fee**, with separate network costs. PASTA locks burn that portion directly. Non-PASTA locks require an executable Jupiter route to buy/burn PASTA; an illiquid token can lack one, even after expiry. This game accepts only the exact PASTA mint above. Re-review the current program, upgrade authority, mint and redemption behavior before inviting real deposits. No independent audit is claimed.

## Structure and assets

- `src/scene.ts`: original procedural courier and night-market diorama, PBR surfaces, environment reflections, contact shadows, bounded DPR.
- `src/simulation.mjs`: fixed 60 Hz deterministic movement and play/result loop.
- `src/main.ts`: UI, lifecycle, input, local persistence.
- `src/wallet.ts`, `src/access.mjs`: wallet and read-only eligibility interface.
- `src/timelock-gate.mjs`: unchanged official helper, with its original tests.
- `docs/BUILD_LOG.md`, `docs/SUBMISSION.md`: preparation materials and review limitations.

Original procedural assets require no downloaded models, texture hotlinks or community logos. See `docs/ATTRIBUTION.md` for dependencies and third-party provenance. Dependencies are exact in package.json and pinned transitively in package-lock.json.

## Release limitations

This is a local preparation build, not a registered hackathon entry or public deployment. Real Phantom desktop/mobile flows, physical-phone performance and real qualifying vaults need human/device review. The mobile screenshots are emulation. Server wallet authentication and authoritative lock/score verification are intentionally absent from this free, local-score prototype; they are required before adding protected server resources, rankings or rewards.

The official skill is installed at the parent project's `.agents/skills/devfridge-game-builder/`; all 14 official files were verified and preserved. It is already read for this session and available for skill discovery on the next turn. The standalone game carries the two helper files it needs to build independently.

Event dates, prizes, registration and submission destination remain to be announced. Read the [handbook](https://hackathon.devfridge.cool/kit/handbook.md) before a later submission.

## Publishing under the hackathon host

Run `npm run build -- --base=./` in this directory, then copy dist contents into `scan/public/hackathon/projects/fridge-run/`. Keep hashed assets with their generated index. Showcase: https://hackathon.devfridge.cool/projects . Game: https://hackathon.devfridge.cool/projects/fridge-run/index.html . The publication follow-up in the build log supersedes the initial local-only status once deployment is verified.
