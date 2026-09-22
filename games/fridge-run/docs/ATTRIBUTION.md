# Asset and dependency provenance

- Courier geometry, stall geometry, signage, paving texture/relief and UI: generated as original code in this project with Codex, 2026-09-22. No third-party character, artwork, voice or logo was copied. The FR monogram is original text, not an official event logo.
- System Arial/Georgia fonts: rendered by the player's operating system; no font files redistributed.
- Three.js 0.186.0, including RoomEnvironment and RoundedBoxGeometry: MIT; see `node_modules/three/LICENSE` and https://github.com/mrdoob/three.js .
- Vite 8.3.0: MIT; TypeScript 7.0.2: Apache-2.0; @types/three 0.183.1: MIT; @playwright/test 1.58.2: Apache-2.0. Exact dependency tree is in package-lock.json; inspect each installed package license before distribution.
- `src/timelock-gate.mjs` and its test are copied unchanged from the official DevFridge Game Builder v1.3.0 bundle. Their hashes are recorded in `official/skill-manifest.json`. The official skill explicitly instructs builders to use this helper. The archive contained no standalone license file; no broader relicensing claim is made.
- Official handbook/templates are retained unmodified in `docs/official/` with source links in this project's README and build log. They are reference material, not original writing by this project.
- No DevFridge on-chain program source is copied or redeployed. Its existing mainnet program is referenced only. Program-source reuse has separate license terms.

Source review date: 2026-09-22. The project owner's distribution/license choice for original game code remains to be set before a public repository release.
