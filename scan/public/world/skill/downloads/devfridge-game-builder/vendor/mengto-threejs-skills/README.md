# Three.js landscape, weather, towers and mobile game skills

Source: [MengTo/Skills](https://github.com/MengTo/Skills), commit **a45892d2fdadab75b31fb16abecc02f101b31c43**, retrieved and verified **2026-11-01**.

This package contains 5 selected skill directories: `threejs-landscape`, `threejs-towers` and `threejs-weather` (upstream `agent-skills/web-design/`), and `build-mobile-threejs-games` and `optimize-threejs-games` (upstream `agent-skills/game-development/`). The rest of the upstream repository (web design, branding and other topics) is not bundled.

License: [MIT](LICENSE), the upstream file unchanged. Every copied file was checked against its upstream Git blob hash. **Local content modifications: none.** Packaging changes: upstream directories are placed at `<name>/`; this README is local documentation.

**Left upstream on purpose:** 3 JPEG preview images and the 3 copies of `demo/assets/three.min.js` (a bundled third-party Three.js build). The `demo/index.html` pages therefore do not run from this package as they are; a game uses its own pinned `three` npm dependency, and the demos remain available at the pinned upstream commit.

The three web-design skills were written for website backdrops. In a game, apply them through [landscapes and architecture](../../references/landscapes-and-architecture.md): the DevFridge 50 FPS release gate, mobile budgets and the routing in [gamedev skills](../../references/gamedev-skills.md) take precedence.
