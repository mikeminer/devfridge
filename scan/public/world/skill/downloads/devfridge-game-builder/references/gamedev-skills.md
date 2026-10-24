# Route the integrated gamedev skills

Reviewed **2026-10-24**. The curated Apache-2.0 source snapshot is pinned in the [vendor README](../vendor/gamedev-skills/README.md). Load only the files needed for the current step. This is a build-time knowledge pack, not code to embed into an APK.

| Current task | Load next |
| --- | --- |
| Unfamiliar project or task selection | [router](../vendor/gamedev-skills/router/SKILL.md), then the appropriate local path below |
| Style bible, approved visual target, asset families/provenance | [create-game-assets](../vendor/gamedev-skills/create-game-assets/SKILL.md) and [3D asset pipeline](3d-assets-and-characters.md) |
| Three.js scene, lifecycle and responsive renderer | [threejs-scene-setup](../vendor/gamedev-skills/threejs-scene-setup/SKILL.md) |
| Character import, rig, clips and animation | [threejs-gltf-loading](../vendor/gamedev-skills/threejs-gltf-loading/SKILL.md) |
| PBR, environment, color spaces and lights | [threejs-materials-lighting](../vendor/gamedev-skills/threejs-materials-lighting/SKILL.md) |
| Frame budget, profiling and LOD | [performance-optimization](../vendor/gamedev-skills/performance-optimization/SKILL.md) and [release pitfalls](release-pitfalls.md) |
| Impact, hit-stop, shake, slow motion | [game-feel](../vendor/gamedev-skills/game-feel/SKILL.md) |
| Audio buses, ducking and adaptive music | [audio-design](../vendor/gamedev-skills/audio-design/SKILL.md), [SFX](sound-prompts.md), [music](music-prompts.md) |
| HUD, touch targets, safe areas and onboarding | [game-ui-ux](../vendor/gamedev-skills/game-ui-ux/SKILL.md) |
| Follow camera, deadzone or death camera | [camera-systems](../vendor/gamedev-skills/camera-systems/SKILL.md) |
| Fixed step, collision, ragdolls | [physics-tuning](../vendor/gamedev-skills/physics-tuning/SKILL.md) |
| Seeded or generated levels | [procedural-gen](../vendor/gamedev-skills/procedural-gen/SKILL.md) |
| Surface effects or shader budget | [shader-programming](../vendor/gamedev-skills/shader-programming/SKILL.md) |
| Pacing, difficulty and authored levels | [level-design](../vendor/gamedev-skills/level-design/SKILL.md) |
| Touch, keyboard, controller and accessible input | [input-systems](../vendor/gamedev-skills/input-systems/SKILL.md) |
| Save schema, migrations and recovery | [save-systems](../vendor/gamedev-skills/save-systems/SKILL.md) |
| Enemy behavior and navigation | [game-ai](../vendor/gamedev-skills/game-ai/SKILL.md) |
| Prove the core loop before expanding scope | [prototype-fast](../vendor/gamedev-skills/prototype-fast/SKILL.md) |

The unchanged upstream router includes paths for the full repository. Map selected names to `vendor/gamedev-skills/<name>/`; use the pinned upstream installation guide for absent skills. Do not follow an absent Godot/Unity/Unreal/Phaser/PixiJS/Bevy skill as if it were bundled, or switch engines without the owner's decision. Verify version-specific APIs against the game's pinned dependencies.

DevFridge guidance wins on wallet transport, Season Pass admission, payment recovery, Store release scope, truthful disclosures and claims of completed tests. Upstream generic monetization or installation suggestions do not override these boundaries. Preserve independent Free Play promotion choices and the distinction between a web game, a hosted APK and a bundled APK. [Delivery](seeker-android.md), [wallet](seeker-wallet.md), [Store](solana-dapp-store.md).
