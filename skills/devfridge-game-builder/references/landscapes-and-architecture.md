# Landscapes, architecture and nature in Three.js

Reviewed **2026-11-01**. Use this page when a game needs terrain, a world backdrop, buildings or a city, vegetation, sky, weather or water. It routes to two vendored packs, [Three.js graphics skills](../vendor/threejs-graphics-skills/README.md) and [MengTo Three.js skills](../vendor/mengto-threejs-skills/README.md), and adds the DevFridge rules that make their results ship on a Seeker. Load one skill at a time, only for the current task.

## Pick the skill

| Task | Load |
| --- | --- |
| Several graphics systems at once; decide what to build first | [threejs-skill-router](../vendor/threejs-graphics-skills/threejs-skill-router/SKILL.md) (it names some skills that are not bundled; see the vendor README) |
| Light terrain behind the action: heightfield, slope/moisture colour, instanced grass, stones, sky dome | [threejs-landscape](../vendor/mengto-threejs-skills/threejs-landscape/SKILL.md) |
| Terrain, biome, wear and mask fields shared by geometry and materials | [threejs-procedural-fields](../vendor/threejs-graphics-skills/threejs-procedural-fields/SKILL.md) |
| Whole planets or spherical worlds | [threejs-procedural-planets](../vendor/threejs-graphics-skills/threejs-procedural-planets/SKILL.md) |
| Buildings, façades, roofs, arches, modular kits, procedural cities | [threejs-procedural-architecture](../vendor/threejs-graphics-skills/threejs-procedural-architecture/SKILL.md) |
| Towers, pagodas, castles, domes from parameters, with a build-up animation | [threejs-towers](../vendor/mengto-threejs-skills/threejs-towers/SKILL.md) |
| Props and hard-surface meshes: lofts, sweeps, bevels, panels | [threejs-procedural-geometry](../vendor/threejs-graphics-skills/threejs-procedural-geometry/SKILL.md) |
| Trees, grass, ivy, flowers | [threejs-procedural-vegetation](../vendor/threejs-graphics-skills/threejs-procedural-vegetation/SKILL.md) |
| Procedural surface materials (soil, stone, wear) | [threejs-procedural-materials](../vendor/threejs-graphics-skills/threejs-procedural-materials/SKILL.md) together with [threejs-materials-lighting](../vendor/gamedev-skills/threejs-materials-lighting/SKILL.md) |
| Sky, haze, sun and distance fog | [threejs-atmosphere-aerial-perspective](../vendor/threejs-graphics-skills/threejs-atmosphere-aerial-perspective/SKILL.md) |
| Rain, storm, lightning, snow, wet ground | [threejs-weather](../vendor/mengto-threejs-skills/threejs-weather/SKILL.md) |
| Rivers, shallow water, caustics | [threejs-water-optics](../vendor/threejs-graphics-skills/threejs-water-optics/SKILL.md) |
| Sun shadows over large terrain or a city | [threejs-shadow-systems](../vendor/threejs-graphics-skills/threejs-shadow-systems/SKILL.md) |
| Prove a scene is stable and in budget | [threejs-visual-validation](../vendor/threejs-graphics-skills/threejs-visual-validation/SKILL.md) |
| Mobile controls, HUD and battery budget | [build-mobile-threejs-games](../vendor/mengto-threejs-skills/build-mobile-threejs-games/SKILL.md) |
| Frame drops, draw calls, adaptive quality | [optimize-threejs-games](../vendor/mengto-threejs-skills/optimize-threejs-games/SKILL.md) and [performance-optimization](../vendor/gamedev-skills/performance-optimization/SKILL.md) |

## DevFridge rules for these scenes

**Renderer.** Use `WebGLRenderer`. Some vendored skills and examples are written for `WebGPURenderer`, TSL or WGSL: port the idea to WebGL (GLSL, `onBeforeCompile`, render targets) or leave it out. Switch to WebGPU only when the owner explicitly asks and the exact target browser and physical Seeker pass a device check; record that decision in the build brief.

**Budget first.** Before building, write the scene's budget in the brief: triangles in view, draw calls, texture memory, shadow-casting lights and post passes, for the lowest target device. The [50 FPS release gate](performance-and-capture.md) applies to the finished scene on a physical Seeker, not to a desktop preview.

**Cheap by construction.**
- Repeated things (grass, trees, rocks, windows, bricks) use `InstancedMesh` or merged geometry, never one mesh each.
- Distance tiers: full detail near the camera, simplified meshes or impostor cards further away, nothing past the fog. Fog and aerial perspective also hide the far clip.
- Terrain resolution follows the camera (polar or clipmap grid), not a uniform high-resolution plane.
- Procedural buildings and plants are generated once at load or in a build step and then reused; do not regenerate geometry every frame.
- One directional shadow with a tight frustum or cascades sized to the play area; static scenery uses baked light (below) instead of real-time shadows.
- Weather particles stay inside the camera frustum and scale with the quality governor.
- Wind, waves and grass motion run in the vertex shader, not on the CPU.

**Bake the light of static scenery.** For buildings and terrain that do not move, bake lighting and ambient occlusion into lightmaps during development with [`lightmap-baker`](https://github.com/Ibrahim-3d/three-lightmap-baker) (MIT, npm `lightmap-baker` 1.0.0, peer `three >=0.185.1 <0.186.0`, WebGL 2 with `EXT_color_buffer_float`, a desktop GPU recommended for bakes; checked 2026-11-01). It is a build-time tool: ship the baked textures with the game, not the baker, and keep the game's `three` version compatible with the baked UV layout. Re-bake when geometry changes. Record the tool version and settings in the asset provenance.

**Deterministic and licensed.** Seed every generator and store the seed with the level so a scene can be rebuilt and screenshotted the same way. Generated geometry and materials are original work; sample images, environment maps and models from upstream examples are not bundled and need their own licence before use in a game.

**Look at it.** Check the scene on the target phone and in [visual realism](visual-realism.md) terms before calling it done; use `threejs-visual-validation` for fixed views and seed sweeps. A pretty desktop frame that misses the Seeker budget is not finished.

## Not bundled, for reference only

- [threejs-architecture-effects](https://github.com/lhlGitHub/threejs-architecture-effects) (MIT): brick-by-brick build animations of pavilions and clock towers. Useful inspiration for an intro or menu scene; heavy for gameplay.
- [threejs-complete-set-of-skill](https://github.com/linegel/threejs-complete-set-of-skill) (ISC) and [procedural-landscapes-threejs](https://github.com/CK42BB/procedural-landscapes-threejs) (MIT): high quality, but built around `WebGPURenderer` and TSL. Consider them only if the owner chooses WebGPU.
- React-based libraries ([react-three-fiber](https://github.com/pmndrs/react-three-fiber), [drei](https://github.com/pmndrs/drei)) are not used: DevFridge games use Three.js without React.
