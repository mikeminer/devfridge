# Android TopShelf registration handoff

The Android app preserves the game and its existing score verification. It records only matching successful live-score responses and never turns an offline or unverified run into a ranked score. Registration remains optional.

## Current flow

1. Finish a server-verified run and open Saved scores or the TopShelf registration option.
2. The game checks the configured Robinhood Chain contract for an existing registration. A run already used by the contract is not offered for another payment.
3. The Android handoff requests a short-lived server draft for the verified run. The server protects retrieval with a temporary capability; the deep link does not contain the score, ticket, wallet key, or signature.
4. The app opens the registration page in Phantom. Players may connect the same Solana account inside Phantom. On Android, a separate Use game wallet option can request authorization and the exact registration message signature from the original Solana account through Mobile Wallet Adapter, including a Seed Vault account.
5. The user reviews the selected Robinhood account, token, amount, network fee, and contract details, then separately approves any wallet prompts. The Android app does not submit a payment transaction.
6. Returning to the game does not count as payment success. The app checks the contract again and leaves uncertain results retryable.

The app never requests, imports, or exports a recovery phrase. Solana private keys remain in the wallet. Wallet signing, token allowance, and Robinhood payment are separate actions.

## Implementation and deployment

Android bridge code is in `mobile/native-bridge.js`, `mobile/native-signing.ts`, and `mobile/registration-handoff.js`. The dedicated-page bootstrap is `mobile/registration-page.ts`; it is bundled with the pre-existing registration UI in production. The server handoff and page were deployed through [devfridge PR 55](https://github.com/mikeminer/devfridge/pull/55), production commit `5e7758be59823a1f5bfa1cd32b9c78f19f73e105`.

The generated production registration bundle is not stored in this repository. Therefore, three browser integration tests are skipped by default. Set `REGISTRATION_BUNDLE` to that built JavaScript file to run them. The native handoff and wallet-signing bridge tests are included in the normal Android JavaScript test suite.

## Verification limits

Android unit tests cover SKR balance filtering and native bridge policy. JavaScript tests cover the exact wallet identity, exact message bytes, refusal and error cases, persistence, and handoff state. These tests do not prove a production wallet signature or a paid on-chain registration. The Android 15 emulator launch was verified, but it had no compatible MWA wallet and could not load the live game through this PC's HTTPS interception. A successful wallet flow, live score, and payment have not been recorded.
