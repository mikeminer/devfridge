# DevFridge Hackathon — Project submission draft

**Status: preparation only. Submission destination and dates to be announced. Not registered or submitted.**

## Project
- Name: Fridge Run — The Midnight Delivery.
- Pitch: Keep PASTA's night market cool in a miniature courier game, with free practice and a timelock-unlocked 50-second challenge.
- Team aliases/public contact: owner to provide before publication.
- Playable HTTPS URL: https://hackathon.devfridge.cool/projects/fridge-run/index.html (publication target for this release).
- Repository URL: https://github.com/mikeminer/devfridge/tree/master/games/fridge-run . Immutable commit: use the merged publication PR commit.
- Demo video: pending; use the sequence below.
- Community/core loop: PASTA food/meme community; collect six chilled crates, avoid heat vents, return to the loading bay, review local score and replay.

## Solana and DevFridge
- Network/mint: Solana mainnet-beta, `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump` (PASTA).
- Mint evidence: finalized public RPC slot 449367314 on 2026-09-22, owner `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, decimals 6, initialized, metadataPointer/tokenMetadata extensions. See mint-rpc-evidence.json.
- Minimum: 100 PASTA / 100000000 raw units.
- Duration: each counted vault originally >=86400 seconds and remaining >=60 seconds; inclusive. The live game uses these rules, not the distinct example fixtures.
- Aggregation: sum independently qualifying vaults of the exact same mint and connected wallet. Wrong mint/wallet, duplicates and malformed/stale evidence fail closed.
- Expiry: boundary recheck revokes the challenge; preserve local best and offer free practice. No early token withdrawal.
- Real vs fixtures: mint receipt is live read-only RPC evidence. Production API wiring is real. Automated provider/lock tests and interactive fixture buttons are simulations; no deposit/redemption tested.
- Identity/access: Phantom connection only, explicitly not authenticated. Client eligibility is UX and bypassable; no protected server features exist. Future sensitive admission requires server wallet challenge and fresh account validation.
- Score authority: local unverified personal bests, no ranked competition/rewards. No anti-cheat claim.
- Program: reuse existing `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`; no new program or timelock deployment.
- Redemption: documented 2% fee plus network costs; PASTA fee burns directly. Non-PASTA route requirement is disclosed for context, but this game accepts only PASTA. Expiry alone is not a general promise of redeemability. No token-price support or independent audit claims.

## Reproduce and review
- Setup: Node 24; `npm ci`; `npm run dev -- --port 5189`; `npm test`; `npm run build`.
- Environment names: none required. Optional local enterprise trust configuration `NODE_USE_SYSTEM_CA` contains no secret.
- Browser tests: `node tests/browser.mjs` with local Google Chrome and dev server running. Desktop and 390×844/844×390 mobile emulation; physical phone and real Phantom tests pending.
- Evidence: VERIFICATION.md, browser-test-results.json and desktop/mobile screenshots.
- Pre-existing work: official DevFridge exact-gate helper/tests, handbook/templates, Three.js addons. Game scene, UI, simulation and integration wrapper created during this session; no earlier game reused.
- AI/human review: Codex built/tested; user selected genre/mint and delegated access policy. Human gameplay/security/device review pending. See BUILD_LOG.md.
- Assets/licenses: original procedural assets, Three.js MIT and other listed dependencies. Official helper's archive had no standalone license; no expanded relicensing claim. See ATTRIBUTION.md.
- Known limitations: UI-only gate, no server identity/competition authority, no real-phone FPS measurements or wallet transaction evidence, public release pending verification; demo video not recorded. Game intentionally silent.
- Free inspection: click Start a delivery; wallet not required. Wallet & access offers explicitly labelled gate fixtures; they never unlock live access.

## Demo video outline (to record before submission)
1. Name the PASTA community and six-crate loop.
2. Complete a keyboard run, show local result and replay.
3. Show real-phone touch play and phone orientation change.
4. Show exact mint/rules/disclosures, a real qualifying/nonqualifying read-only check if available, and wallet rejection recovery. Label simulated evidence if real locks are unavailable.
5. Show tests, build log, immutable reviewed commit and the explicit client-gate limitation.

Recheck the official event rules, eligibility, dates and destination when submissions open. Preparing this document does not reserve a place or submit an entry.
