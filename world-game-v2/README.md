# Cold Storage v2

Faster build of the DevFridge merge game. **Does not replace v1.**

- v1: `/world/game/index.html`
- v2: `/world/game-v2/index.html`

## What changed

1. Load one favourite GLB; the rest wait for idle time
2. Draco GLBs (~2.5 MB for 10, was 41 MB)
3. Asset downloads capped at 8 in flight
4. Portraits are 256px webp; audio is mono mp3
5. `pixelRatio` ≤ 1.25 (1.0 on phones), no MSAA on mobile, fridge pieces are sprites
6. Boot / wallet / three / rapier are separate chunks

```
npm install
npm run prepare-assets
npm run build
```

Build output: `scan/public/world/game-v2/`

## Deployed kitchen shelf

The deployed `cold-storage.js` is the existing v2 engine with optimized model loading and server-verified moves. Its Three.js renderer is revision 185; the shelf dependency is pinned to the same revision for compatible matrices and materials.

`npm run build:kitchen-shelf` builds the shelf module and idempotently patches only the kitchen furniture and update hooks in that engine. It does not run the older prototype build above or overwrite the gate, models, or score logic. The script fails when an expected hook changes. Keep `gate-2.js` and the HTML cache versions in sync when publishing an updated engine.

The shelf loads on the first kitchen visit, uses the shared CC0 oak textures at `/world/textures/oak/`, and displays four jars ordered by estimated USD pool TVL from the existing TopShelf and Pons price APIs. It polls once per minute only while the kitchen is visible, cancels pending requests on exit, and shows unavailable data honestly. Logos use the existing same-origin TopShelf logo endpoint.

Run `npm run test:kitchen-shelf` for ordering, invalid data, polling and cancellation checks.
