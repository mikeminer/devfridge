# Three.js and device delivery

Build the selected game, not a connect button around a scene. Separate simulation from frame rate: fixed timestep with bounded catch-up, seeded randomness where reproducibility matters, and input actions shared by keyboard/pointer/touch. Physics/replays do not prove human play.

Use a supported renderer with feature detection and visible WebGL fallback. Resize using the container/ResizeObserver, update camera projection and drawing buffer; cap device pixel ratio (a tested 1–1.5 mobile baseline can help). Do not assume WebGPU everywhere. Reuse materials/geometries, instancing, bounded shadows/lights and compressed assets as appropriate. Dispose resources on teardown. Measure asset/triangle/draw-call budgets on the selected phone rather than promise 60 FPS.

Use `100dvh`, safe-area insets and reserved HUD/touch space. Pointer capture and `touch-action` belong on gameplay surfaces, not the whole document. Menus scroll without moving characters. Avoid keyboard-only actions, tiny targets, banners covering play and hover-only guidance. Pause during dialogs; support focus return/Escape and readable errors.

Start audio on a gesture. Keep mute separate from suspended AudioContext. On visibility/page-show, pause/resync and offer gesture-based resume; preserve mute and avoid stacked sounds. Recheck wallet/locks, clamp time after screen lock and do not silently fast-forward competitive play. Pause/recover on WebGL loss instead of leaving a blank canvas.

Load art with progress/retry/fallback; procedural art is suitable for labeled prototypes. Check asset provenance/licences before copying another game's models, voices or branding.

Verify: complete win/loss/restart; mouse/keyboard; 390×844 portrait; phone landscape; constrained GPU; resize; no wallet; Phantom desktop/mobile; account change mid-check; rejected sign-in; expired/insufficient locks; unavailable/429 evidence; pending transaction if implemented; background audio; context loss; share cancellation. Report untested physical-device cases honestly.

Sources: https://threejs.org/manual/pages/responsive.html ; https://threejs.org/manual/pages/cleanup.html ; https://threejs.org/docs/pages/WebGLRenderer.html
