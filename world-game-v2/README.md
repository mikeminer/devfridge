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
