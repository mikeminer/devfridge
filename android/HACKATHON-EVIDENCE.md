# Solana Mobile evaluation evidence

This folder contains the Android app source, build instructions, local tests, and generated game asset provenance. The development build preserves the existing Three.js/Rapier game and adds Android-specific controls, Mobile Wallet Adapter, optional read-only SKR balance checking, haptics, score sharing, and on-device adaptive advice.

## Evaluation criteria

| Criterion | Evidence in this repository | Current verification |
| --- | --- | --- |
| Demo completion | Android build and demo checklist in `README.md` | Emulator installation and menu were verified. A complete gameplay and wallet demo video is still missing. |
| Technical depth | Kotlin app and SKR parser, JavaScript native bridge and coach, unit tests, Gradle build instructions, generated asset hashes | Build, lint, Android unit tests, and JavaScript tests are run locally. Review the commit containing this directory. |
| Mobile experience | Touch controls, haptics, Android sharing, safe-area handling, lifecycle pause, coach UI | Menu and SKR consent screen were viewed on Android 15 emulator. Live gameplay is blocked on this PC by HTTPS interception; screen evidence does not prove all controls. |
| Solana interaction | MWA authorization and message signing; consent-based read-only SKR balance check | Source and tests are available. No successful wallet authorization, message signature, or SKR RPC result was captured in the emulator. |
| Presentation and vision | User problem, design explanation, feature boundaries, privacy and demo limitations in `README.md` | The submitted deck remains a separate existing item. Clock In's coach could not read its deck URL or extract a transcript from its demo URL. |

## Honest demo checklist

A complete recording still needs to show a clean install and first launch, live gameplay and multitouch, coach advice and optional rating, MWA authorization and message signing, optional SKR disclosure and a real balance result, score sharing, and persistence after restart. Use a device or emulator with a compatible wallet. Do not imply wallet or live-game flows were tested until the recording captures them.

The Android 15 emulator used so far had no MWA-compatible wallet. The app launched and displayed its age gate, native menu, and SKR disclosure. The live game could not load because the emulator did not trust this PC's HTTPS interception certificate. No age data was entered. These limits are documented in `README.md`.
