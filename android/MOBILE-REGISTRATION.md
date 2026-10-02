# Mobile registration, version 0.2.0

The Android app retains the original game engine. A narrow fetch observer records only successful `start` and matching `finish` responses from the first-party live-score endpoint. It never converts an unverified run into a ranked result. Drafts are written before opening another app, and no age or timelock checks are bypassed.

## Flow

1. Finish a server-verified run. Open **Saved scores / Robinhood registration** from the native menu or use the score registration button.
2. The app checks public `usedRun(runId)` on the configured Robinhood contract. An already registered run cannot start another payment flow.
3. A new `/api/world/topshelf/mobile` POST unseals the existing run ticket and calls `finishedLiveRun`. It stores a short-lived draft behind an HMAC-derived capability; retries produce the same capability and retain the ticket's original expiry.
4. Android opens the explicitly targeted `app.phantom` package using Phantom's documented browse link. The URL contains an opaque identifier in its fragment, not the score, ticket, recovery phrase or native wallet token.
5. The dedicated static page retrieves the draft using a bearer header. The user connects the same Solana wallet. Existing TopShelf UI code performs the EVM connection, fee review, signed Solana challenge, server receipt verification, exact allowance, simulation, final payment and receipt-event checks.
6. A return link opens the Android saved-score panel. No success data in the return URI is accepted. The app queries the contract again. Lost connectivity leaves the result unconfirmed and retryable.

## Build and activation

```powershell
node scripts/build-registration-page.mjs
node scripts/prepare-game.mjs
npm test
node ../cold-storage/node_modules/tsx/dist/cli.mjs --test tests/mobile-handoff.test.ts
```

The page build uses the sibling `cold-storage` development dependencies and original registration source, with a provenance hash. The generated browser bundle keeps the existing registration UI; only bootstrap and provider preference are changed. No new transaction or contract protocol is introduced.

Deploy these new files together from `devfridge/scan`:

- `app/api/world/topshelf/mobile/route.ts`
- `lib/topshelf/mobile-handoff.ts`
- `public/world/mobile-register/`

Existing TopShelf contract, KV and run-secret configuration are reused. This work has **not deployed** those files. Until activation, Android explains that registration is unavailable and retains the saved run. Do not represent mock API tests as mainnet registration tests.

## Emulator profiles

```powershell
./scripts/start-emulator.ps1 -Profile standard
./scripts/start-emulator.ps1 -Profile solana
```

Both profiles use Android 16 / API 36 with the same bundled game. The second has the official `solana-mobile/mock-mwa-wallet` installed. This exercises the MWA protocol and wallet discovery; it does not emulate the Seeker's secure element, Seed Vault protection or actual Seeker firmware. No production private key is configured.

The official mock was built at `d444aff0c72dadd0f5c442ea2bc3559b62916e01`, with only `buildToolsVersion = '36.0.0'` added to use the installed SDK. Authentication logic is unchanged. Device PIN/biometric setup and wallet authorization remain manual.

## Remaining acceptance steps

- Complete a message-signing round trip after manual mock-wallet authentication.
- Test Phantom's actual mobile browser, both account providers, app return and payment cancellation on a physical Android phone.
- Complete a real eligible run and optional, explicitly approved registration transaction after server activation.
- Test a physical Seeker for Seed Vault behavior, thermals, haptic feel and sustained game performance.

The Phantom route requires the run's Solana account to be available in Phantom. A Seed Vault-only account needs a future round trip back to native MWA for the registration signature; importing or replacing a protected wallet is not a workaround.
