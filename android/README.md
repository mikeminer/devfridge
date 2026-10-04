# DevFridge World for Android

Android source for the existing DevFridge World game. The app keeps the Three.js and Rapier game, bundles its web assets in the APK, and adds Android wallet, input, feedback, sharing, lifecycle, and local coaching features. The public game URL remains https://world.devfridge.cool.

## Build from this repository

Requirements: JDK 17, Android SDK platform 36 and build tools 36.0.0, Node.js, and an Android 9 or newer device or emulator for installation.

From the repository root:

```powershell
Set-Location android
npm install --no-audit --no-fund
npm run prepare:game
npm test
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

The asset-preparation script packages `../scan/public/world/game-v2` and writes `game-provenance.json`, including the source file hashes and Android-specific changes. The bundled game assets under `app/src/main/assets/game` are generated and ignored by Git. The original game JavaScript is not modified by the preparation step.

Set `ANDROID_HOME` to the Android SDK location, or create an untracked `local.properties` containing `sdk.dir=...`. Neither local SDK paths nor emulator certificates belong in a commit. Build output is a debug APK at `app/build/outputs/apk/debug/app-debug.apk`; it is for testing, not a store release.

The Node test suite covers the adaptive coach and app integration. The three registration-page tests run when a built registration bundle is supplied through `REGISTRATION_BUNDLE`; they are skipped otherwise because that generated bundle is not part of this repository. For example:

```powershell
$env:REGISTRATION_BUNDLE = 'C:\path\to\registration.js'
npm test
```

## Mobile and Solana behavior

Mobile Wallet Adapter authorizes the selected Solana account and signs the game's exact authorization message. The wallet retains the private key. The native bridge does not expose general transaction signing. The game and its existing backend continue to verify eligibility and completed runs.

The optional SKR flow displays a disclosure, authorizes the wallet through MWA, and requests a read-only balance for the official SKR mint from Solana mainnet RPC. A positive balance enables the Aurora cosmetic for the current session. It does not send a transaction or alter access, scores, rankings, or prizes. The RPC provider can observe the public wallet address and IP address.

Touch controls retain the original game mechanics and support simultaneous input. Native Android code provides optional haptics, the share chooser, safe-area handling, lifecycle pause, and menu controls. The on-device adaptive coach selects localized advice from collection progress and recent scores, then adapts its selection using the player's optional ratings. Recent scores and ratings stay in app storage and are not sent to an AI service. This is a local adaptive algorithm, not generative AI.

## Testing status and limits

The current local development build has passed the Android unit tests, lint, debug assembly, and the JavaScript test suite. On an Android 15 emulator it was installed and launched; the age gate, native menu, and SKR disclosure were viewed. The live game did not load because this PC's HTTPS interception certificate could not be validated in the emulator. No age data was entered. This emulator had no MWA-compatible wallet, so it did not demonstrate a wallet signature, successful SKR balance check, eligible live run, or payment. These flows still require a compatible wallet device and a captured demo.

The APK is debug-signed and no release signing key is included. Physical Seed Vault signing, a complete wallet flow, a successful live score, and paid TopShelf registration remain unverified. Do not present the emulator launch as proof of those flows.

## Design references

Solana Mobile Kotlin setup: https://docs.solanamobile.com/get-started/kotlin/setup

Solana Mobile Kotlin quickstart: https://docs.solanamobile.com/get-started/kotlin/quickstart

Android WebView bridge guidance: https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge
