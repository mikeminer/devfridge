# Performance evidence and genuine Store captures

Use `assets/release-capture/` for a repeatable **real-input** scenario, render-frame observation, a release gate and optional Store screenshots. Choose `captureStore: false` for performance alone, including browser-only games; do not impose Store assets or a font on them. Choose `captureStore: true` only when Store screenshots were requested. These helpers do not implement a game's controls, prove GPU presentation, certify hardware, grant paid access or replace human review. Integrate the observation contract into the actual game first. Missing hooks or readiness must stop the run, never produce an empty launch screenshot or an invented pass.

## Release policy

For **every APK release**, test the exact signed candidate on a physical Seeker. An emulator, desktop browser with a mobile viewport, old APK, old checklist or synthetic fixture is insufficient. Run `release-delivery/preflight.py check` after the capture gate; it invokes this gate using the candidate APK's SHA-256. Inspection alone is not release approval.

The project's conservative gate is **at least 50 observed render commits in every complete one-second measurement window**. It checks both consecutive buckets and rolling windows at every frame boundary, so two adjacent buckets cannot hide a slower interval across their boundary. Start after an explicit warmup of at least 5 seconds and measure at least 30 seconds; prefer 2–5 minutes of representative worst-case play. Do not report average FPS as this minimum. A frame gap over 250 ms, skipped frame ID, hidden tab, pause, foreground loss, buffer overflow, clock mismatch or missing tail blocks the run. Preserve failures and fix/retest; do not remove slow intervals, concatenate favourable fragments or call frames from a timer without rendering. The threshold is this skill's quality policy, not a published Solana Store FPS requirement.

Record build hash and build ID, device/OS/browser/WebView/GPU renderer, graphics quality/resolution/DPR, actual input events and scenario/profile hash. Evidence is valid for at most 24 hours and only the exact candidate bytes and target. `fixture: true` (or missing classification) can never authorize release. The JSON is auditable local evidence, not tamper-proof attestation: review the recorder's integration and supporting observations.

Choose a workload appropriate to the game: maximum representative actors, effects, UI, audio and supported graphics settings, not an empty scene. Zombies are an example for a zombie game, never a universal prerequisite. Frame callbacks belong after the real game's renderer is invoked in its presentation loop, once per rendered frame, not once per simulation substep or offscreen pass. Render-commit timing is not a hardware present-time counter; investigate visual stutter and confirm on the physical display even when the count passes.

## Game-owned observer contract

The browser adapter reads `globalThis.__releaseCapture`. Implement these methods in the candidate and enable them only through a local, explicit diagnostic opt-in. They must observe state without exposing wallet secrets, changing health, granting entitlements, spawning fake actors or bypassing ads/payments:

```js
import { createFrameRecorder } from './frame-recorder.mjs';
let recorder;
let committedFrameId = 0;
const state = () => ({
  phase: game.phase,                 // menu | gameplay | results, from actual state
  paused: game.paused,
  foreground: document.hasFocus(),
  visibility: document.visibilityState,
  financialApprovalPending: wallet.approvalPending,
  worldReady: game.worldReady,
  visibleChallenges: game.visibleChallengeCount,
  settings: measuredGraphicsSettings(),
});
globalThis.__releaseCapture = {
  identity: () => ({ buildId: BUILD_ID, settings: measuredGraphicsSettings(), renderer: measuredRendererName() }),
  readState: state,
  startRecording: () => { recorder = createFrameRecorder({ sessionId: crypto.randomUUID() }); },
  stopRecording: () => recorder.stop(),
};
// In the EXISTING real render loop, immediately after renderer.render(...):
// recorder?.frame(++committedFrameId, state());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') recorder?.interruption('visibility hidden');
});
window.addEventListener('pagehide', () => recorder?.interruption('page hidden'));
window.addEventListener('blur', () => recorder?.interruption('focus lost'));
// Also call interruption() on native lifecycle changes, game pause, context loss,
// clock reset and any event that makes the recording uncertain.
```

This is an adapter sketch: `game`, `wallet`, `BUILD_ID` and measured settings/renderer functions are supplied by the project. Do not paste guessed values. The 120,000-frame cap deliberately fails closed on overflow. A continuous thermal test may need a new observation session before the timed run; do not erase faults during the measured run.

## Scenario and screenshot profile

Copy `profile.example.json` outside the skill, replace all placeholders and review its real controls. The `captureStore` choice must be explicit. With `true`, `validateProfile` requires four to eight unique stages, at least one gameplay capture, captions and a bounded readiness timeout. With `false`, set `stages: []` and omit `captions`; no screenshot or compositor is called and no licence/font is required. A gameplay stage must require `phase: gameplay` plus meaningful game-specific visible readiness such as `worldReady` and `visibleChallenges >= 1`. The performance readiness predicates must continue to hold throughout the timed run; choose them to represent the sustained workload and do not let the scene become empty after launch. A menu/results stage also needs predicates for the actual visible content. Numeric predicates are data, never evaluated JavaScript.

Provide the complete `performance.inputs` schedule and stateful `stages[].actions` using real `click`, `key`, `tap` or `swipe` inputs. Every action must explicitly declare `financial: false`. That field is a safety declaration, not automatic verification that an arbitrary selector is safe: inspect the targets. Never schedule wallet approval, token transfers, purchases or entitlement manipulation. The runner stops if `financialApprovalPending` becomes true. Use the free route, an already authorized entitlement, or pause the workflow for the owner to perform a required financial action separately. Do not obtain paid access with test-state injection.

The runner polls readiness, captures the real framebuffer, then checks readiness again. A timeout or duplicate screenshot pixels is a failure. It retains unmodified raw PNGs, before/after state, capture hashes and input evidence. It does not add objects, manufacture a score or recreate a game with generated artwork. Distinct stage names alone do not make identical pixels meaningful.

## Browser collector: pinned static candidate

In a project/CI runtime where Playwright is permitted, install Playwright and its Chromium browser in that project. The optional CLI resolves the project's `playwright`, or accepts a local module through `--playwright-module`. Do not use it as an alternate browser-control tool where the environment requires another UI tool.

Provide a JSON candidate manifest. Its file hash is the browser artifact hash. Include the exact same-origin entrypoint and **every fetched game resource**, each with unique canonical URL, SHA-256 and MIME type:

```json
{
  "buildId": "actual-build-id",
  "entrypoint": "https://your-game.example/",
  "files": [
    { "url": "https://your-game.example/", "sha256": "actual-64-lowercase-hex-sha256", "contentType": "text/html" },
    { "url": "https://your-game.example/game.js", "sha256": "actual-other-64-lowercase-hex-sha256", "contentType": "text/javascript" }
  ]
}
```

The adapter verifies each resource then fulfills browser requests from those exact bytes. It blocks service workers, disables the HTTP cache through routing, rejects unlisted resources and non-GET requests, and blocks WebSockets, workers and frames. A fresh context prevents prior site storage/cache from changing the candidate. HTTPS is required except localhost; credentials, query strings, redirects and remote origins are refused. Thus it measures a **pinned static playback** of the candidate, not production network/wallet availability or a service-worker installation. Games requiring live APIs, workers or remote resources need a reviewed adapter with equivalent runtime binding; do not silently relax the policy. Inline code and generated data inside the reviewed HTML/JS are part of the candidate. A resource served before capture cannot later be substituted from the live site.

```sh
node assets/release-capture/capture-release.mjs --profile /project/capture.json --artifact /project/browser-build-manifest.json --out /project/evidence/new-run
```

For a browser-only performance run, use the same complete performance profile with `captureStore: false`, `stages: []`, and no `captions` object:

```sh
node assets/release-capture/capture-release.mjs --profile /project/browser-performance-only.json --artifact /project/browser-build-manifest.json --out /project/evidence/new-browser-performance
```

This still records inputs/frames, writes `performance.json` and evaluates the same gate; a failure remains nonzero. It does not create Store images, write a captions file or ask for branding materials.

The browser runs headed and records its actual desktop UA/OS, renderer and explicit viewport/DPR. A mobile viewport is **not Seeker evidence**. `tap` uses Playwright touch input; browser `swipe` is a **desktop mouse drag**, explicitly labeled in device evidence, not a genuine mobile swipe. Use the ADB adapter for Android touch behavior. The CLI leaves failed evidence on disk and returns nonzero if the performance gate is blocked, even if useful screenshots were prepared.

## Physical Seeker collector

Install the candidate separately through the authorized APK workflow and enable USB debugging on the owner's Seeker. Select its serial and verify its actual model. The adapter observes model/OS/hardware/emulator markers, resumed activity and the installed APK bytes via ADB. It rejects an installed-hash mismatch and split/system/unknown APK paths. It never installs, uninstalls, signs, approves a wallet request or transfers funds.

The actual candidate must export its own read-only diagnostic snapshot, updated within two seconds, to:

`/sdcard/Android/data/<package>/files/release-capture/latest.json`

```text
schemaVersion: 1
buildId: actual candidate build ID
observedAt: current ISO timestamp
browser: actual Android WebView/native renderer version
renderer: actual GPU/renderer description
settings: { quality, dpr, resolution }
state: the same real readiness/foreground/financialApprovalPending fields
telemetry: frame-recorder.snapshot() schema, continuous monotonic session
```

Export atomically from a locally enabled diagnostic session; exclude account addresses, tokens, passwords and private keys. The export is a project-specific bridge, not supplied magically by ADB. It must exist in the exact signed candidate being measured; a different debug APK cannot stand in for that candidate. Native engines can implement the same schema from their real render/lifecycle callbacks. If Android blocks reading the path, if the snapshot is missing, if device/host clocks are not aligned, or if the hook cannot identify an actual frame, stop and implement a reviewed equivalent adapter. Do not mark it tested. Disable/delete diagnostic exports after review and assess their performance overhead.

The adapter sends only explicit ADB taps/swipes and allowed keys, captures `screencap -p`, and slices one continuous recorded session to the actual observed timed run. Keep the game foreground and the screen unlocked. It rejects missing/changed/stale sessions and requires a completed observation of the tail. Background/lifecycle cases are separate checklist tests; they are not intervals to remove from the performance run.

```sh
node assets/release-capture/capture-release.mjs --profile /project/seeker-capture.json --artifact /private/release.apk --serial ACTUAL_SERIAL --adb /sdk/platform-tools/adb --checklist /private/checklist.json --thermal /private/thermal.json --out /project/evidence/new-seeker-run
node assets/release-capture/performance-gate.mjs --report /project/evidence/new-seeker-run/performance.json --artifact-sha256 ACTUAL_APK_SHA256 --platform seeker --max-age-hours 24
```

For Seeker performance and release checks without new Store screenshots, set the profile's `captureStore: false`, `stages: []`, omit `captions` and run:

```sh
node assets/release-capture/capture-release.mjs --profile /project/seeker-performance-only.json --artifact /private/release.apk --serial ACTUAL_SERIAL --adb /sdk/platform-tools/adb --checklist /private/checklist.json --thermal /private/thermal.json --out /project/evidence/new-seeker-performance
```

Set profile `platform: seeker`, `package` and `expectedSeekerModel`; use coordinates/key codes in place of browser selectors. The output replaces the device serial with its SHA-256. Keep raw observations private where they reveal device/user information.

## Required physical release checklist

For the **same candidate and Seeker**, retain fresh evidence for all keys below. Each checklist entry is `{status: "passed", artifactSha256, serialSha256, observedAt, evidence}`. `evidence` identifies a real local report/video/log and what was observed; do not invent paths or prefill passed entries. Re-run after a new build. The gate checks the declared references and identity; the reviewer must inspect the referenced evidence.

- `coldStart`: actual cold launch, assets/audio/locale and initial navigation.
- `upgradeWithoutDataLoss`: update from the published APK using the same signing identity; verify saves/settings/entitlements remain intact.
- `pauseResume`, `backgroundForeground`, `screenLock`, `processRestart`: correct resumed state and no duplicated charges, missing audio recovery or inaccessible controls.
- `walletConnect`, `walletCancel`, `walletReturn`: actual supported wallet connection, declined operation and returning to the game; no repeated authorization during gameplay.
- `networkLoss`: understandable offline/recovery behavior, no false payment success or lost paid run.
- `thermalWorstCase`: representative heavy gameplay after at least ten continuous minutes of thermal soak, with visual responsiveness and device condition observed.

Supply `thermal.json` with numeric integer `soakMs >= 600000`, numeric `startedAtMs` in Unix milliseconds, exact `artifactSha256`, matching `serialSha256`, and nonempty `workload`/`observation`. The soak must complete before the measured run and start within the preceding hour. Keep charging state, brightness, power mode, room/device conditions and observation alongside the evidence; do not invent a temperature if no sensor reading was obtained. A cold short benchmark cannot substitute for this check.

## Captions and Store image validation

Choose a licensed local TTF/OTF, retain its actual licence and explicitly set `captions.fontApproved: true`. `composeCapturedSet` calls existing `store-compose.py` with the captured images. It adds an external caption band and **contains the entire screenshot**, preserving HUD and controls without cropping. Final output is four to eight files with one consistent `1080x1920` or `1920x1080` size and a 3,000,000-byte cap. Keep raw and composed hashes plus the licence with the review package.

The [Solana dApp Store listing guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines), reviewed 24 October 2026, require 4–8 gallery images, the same dimensions, 9:16 or 16:9 aspect ratio and at most 3 MB per image. They recommend at least 1080 px in both dimensions; this helper makes that recommendation a stricter local quality gate. Captions must describe what the actual screenshot demonstrates. Inspect all final images at phone size for truthful state, legibility, HUD visibility and no private wallet data. `humanVisualReview: required` remains in the capture manifest; automated validation never clears it or publishes to the Store.

## Repeatable tests and limits

```sh
node --test assets/release-capture/release-capture.test.mjs
node assets/release-capture/compose-smoke.mjs --python python3 --font /local/test-font.ttf
```

The first suite uses Node built-ins, synthetic saved telemetry, fake-clock input drivers and generated fixture pixels. It verifies thresholds/failures, exact resource binding, readiness and capture evidence; **no physical-device or browser performance is certified**. The optional composition integration additionally needs Pillow and an owner-selected local font. It verifies four real compositor outputs, exact hashes, byte limits, full top/bottom HUD markers and unchanged raw fixture images, then removes its temporary directory. Its generated pixels and mock licence are test-only and must not appear in a release.

The browser and ADB adapters must still be exercised against the actual game's hooks and controls in an authorized runtime. Document unsupported adapters or unavailable hardware as blocked work. Do not mark “Seeker tested,” “50 FPS passed,” “Store screenshots ready” or “release published” based on these fixtures alone.
