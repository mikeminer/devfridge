# Reproducible 3D assets and characters

Reviewed **2026-10-24**. Use with [visual realism](visual-realism.md) and [create-game-assets](../vendor/gamedev-skills/create-game-assets/SKILL.md). The pipeline is generic; the explicitly labeled horror example is optional. Keep an owner's chosen cartoon or other deliberate style. Capsules and crude stand-ins are development blockouts, not finished realistic people.

## Approve a visual target

Write a style bible: silhouette, materials, lighting, scale, camera distance, palette, asset families and target device. Finish one hero and one small environment patch, then obtain an approved desktop and phone screenshot before mass-producing variants. Confirm logo, character, music and texture rights. Keep authored source/parameters and an asset manifest; record source URL, author, exact license, date, transformations and output hashes in `ASSETS_LICENSES.md`.

## Legally source and generate people

[MakeHuman core assets](https://static.makehumancommunity.org/about/license.html) are CC0; this covers the core mesh, proxies and distributed graphical assets. Check the exact downloaded archive and any community additions separately. MakeHuman application code is AGPL and MPFB code is GPL; do not confuse their software licenses with asset licenses.

[Ara 3D Gen](https://github.com/olatunde85/3d-gen) is an offline/self-hostable character pipeline with [MIT-licensed code](https://github.com/olatunde85/3d-gen/blob/main/LICENSE) and MakeHuman-derived asset data. Pin the source commit and downloaded asset hashes when establishing a production pipeline. Store per-character JSON parameters, a reproducible build script and generated GLBs. Verify third-party additions individually. CC0 or CC-BY alternatives are acceptable with provenance and required attribution. Never copy World or another game's characters without rights. Ship the optimized assets, not the development generator, in the APK.

## Optimize without losing the character

Use a pinned [glTF Transform](https://gltf-transform.dev/cli) toolchain. Keep one scene per character, inspect units/pivot/orientation/UVs/normals, and validate GLB before and after processing. Retain animation and skin data. Drop only morph targets whose measured displacement is negligible at the game's scale; a **0.6 mm** maximum is an example threshold to test in close-up, not a rule to remove expressions blindly. Split primitives where it reduces morph texture coverage; compare vertex/draw-call cost. Deduplicate, prune unused data, weld, quantize and apply [Meshopt](https://gltf-transform.dev/modules/functions/functions/meshopt). Decode the result using the production loader. Start with 1K WebP textures; review alpha edges, skin tone and normal maps after compression.

Example tool versions from the supplied Street Meat case study: `@gltf-transform/*` 4.2.1, `meshoptimizer` 0.22.0 and `sharp` 0.34.4. These are historical pins, not a recommendation to install outdated versions blindly; preserve an existing tested toolchain or verify a compatible replacement and lock exact versions.

## Variants, expressions and animation

For a crowd game, plan at least five visibly distinct variants using body proportions, clothing, skin and surface details. Use a scripted recolor/variant pass. A handful of deliberate variants is more readable than random noise. Where the rig supports it, about 20 ARKit-style morphs can cover brows, eyes, jaw and mouth smile/frown/pucker/press/stretch. Names are conventions, not proof the rig implements them. Build animation-driven expression presets with subtle variation.

Use real skinned clips or a documented procedural bone rig for walk/run/idle and game-specific actions; do not slide a static model. Inspect skinning, foot contact and clip transitions. At twice normal viewing size, check every extreme expression: make the tongue's jaw response independent, reduce or hide it if it intersects teeth, clamp mouth-roll/funnel combinations, and avoid adding jaw-bone motion on top of a full jaw morph. A `jawOpen > 0.12` hide threshold is a tunable example. Exclude eyes, lashes, eyebrows, teeth and tongue from skin damage shaders.

Create a second GLB of the **same** characters for distance/crowd LOD, initially around 25% of the original triangles with nonessential parts removed. Preserve identity, silhouette, skinning and visible animation. Test transitions at the actual camera distance. Performance fixes reduce full-detail count, use this LOD or reduce total crowd; they never substitute unrelated primitive figures. Use the [quality governor](../assets/quality-governor.mjs) with measured thresholds described in [release pitfalls](release-pitfalls.md).

## Optional horror example — Street Meat

This paragraph is a case-study design example, not the default for all games. An adult horror cast can vary shambler/brute/office/hoodie/punk characters, with idle/snarl/roar/feed expressions and hero panic/flight. If the owner explicitly chooses blood and dismemberment: apply wounds to skin materials, cap severed parts, animate an 8–12 second interaction, and bound deterministic seeded ragdolls using a fixed-step solver (120 Hz is an example budget). Full/Reduced/Off must control visuals **and** SFX; Off removes blood/dismemberment/gore sounds, Reduced omits dismemberment. Store builds and captures default to Reduced. Use adult voices and models. A content warning or age rating is not a guarantee that graphic content passes the current Store policy; review before release.

## Environment and lighting

Build material atlases from licensed source scans; [ambientCG](https://docs.ambientcg.com/license/) downloadable assets are CC0. Bricks085, Asphalt031 and Concrete034 are case-study examples, not required downloads. Bake color/normal/ORM with consistent color-space handling and world scale, then add authored windows, sills, lintels, grime and optional puddles. Rasterize signs from an appropriately licensed font, retain its license and provenance even when only raster artwork ships, and avoid repeating text on every building. Add believable props appropriate to the setting, such as fire escapes, rooftop equipment or vehicles.

Use a PMREM environment, one shadowed key light (1024 is a starting size), a small number of unshadowed practical lights and restrained fog. Tune exposure on a dim phone, preserving HUD contrast and shadow detail. Example Street Meat exposure changed from 1.05 to 1.45; do not copy a number into a different scene.

## Acceptance evidence

Measure draw calls, triangles, texture memory, load time, median and tail frame times at 390×844 and on a physical target phone. Record before/after for the realistic cast; the case study's reported 70–80 calls and roughly 53k triangles **preceded** that cast and is not a current device benchmark. Test low battery/thermal conditions when available. Capture daytime/night or bright/dark regions, all expressions, motion transitions, LOD changes and texture failures. A screenshot establishes appearance, not frame rate. Mark any device or pipeline step not exercised as untested.
