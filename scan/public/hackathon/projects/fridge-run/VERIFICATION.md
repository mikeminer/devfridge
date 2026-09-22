# Verification · 2026-09-22

## Reproducibility

- Node 24.18.0, npm 11.16.0, Windows.
- Clean `npm ci` succeeded using Windows/system CA trust, with certificate checking enabled. Dependency audit reported zero known vulnerabilities at install time; this is not an audit of the application.
- TypeScript check and Vite production build passed. Main JS output is approximately 578 kB / 147 kB gzip. Vite reports its normal >500 kB chunk-size advisory; this Three.js bundle has not yet been split.
- Official helper/test SHA-256 hashes match the installed v1.3.0 manifest. Full archive and all 14 installed files were verified before extraction. No custom files overwritten.

## Automated logic tests: 12 passed

`npm test` covers the six original official evaluator tests and six application tests:

- Exact decimal/BigInt arithmetic, including amounts beyond Number precision.
- Threshold equality, single/sum aggregation and partial expiry.
- Original duration versus remaining duration, including inclusive recheck boundaries.
- Wrong wallet, wrong mint, duplicate vault, malformed/future/stale evidence.
- Full simulated courier win and restart using steering actions at the fixed timestep.
- Timeout loss, bounds, diagonal speed and heat-contact cooldown.
- The selected 100-PASTA / 24h / 60s policy.
- Labelled fixture pass/deny/stale states.
- Request coalescing, timeout, stale responses and 429 backoff.

## Browser checks

`tests/browser.mjs` runs Chrome headless with software WebGL; screenshots are emulated devices, not physical phones. See browser-test-results.json for the latest automated receipt. The full suite checks:

- Desktop WebGL scene and locked challenge without a wallet.
- Missing Phantom fallback; labelled fixtures cannot grant live access.
- Keyboard cargo collection; pause freezes the timer and resume advances it.
- Home/restart resets cargo.
- 390×844 touch cargo collection, no horizontal overflow.
- 844×390 landscape controls remain visible/in bounds.
- Synthetic qualifying API evidence enables the client challenge interface.
- Account switch rejects old/foreign evidence and clears eligibility.
- Disconnect and rejected wallet connection fail closed.
- No uncaught browser runtime errors.

Visuals inspected: desktop home and active game; portrait game and landscape game. Touch controls are outside the playfield, the canvas fits, and HUD remains readable. The idle scene does not continuously render. Active drawing is capped at 30 FPS, with DPR <=1.5 and one 1024px shadow light; these are settings, not measured physical-device frame rates.

An early browser check caught a real fetch-binding error in the request wrapper, which was repaired and retested. Fixed short sleeps in keyboard/timer assertions were replaced by waits for visible game events. Full win/loss is verified at simulation level; browser checks do not claim a human-completed full run.

## Live evidence and untested cases

Live read-only evidence: finalized Solana mint account at slot 449367314. This confirms the exact PASTA mint, owning token program, decimals and listed extensions on the review date. See mint-rpc-evidence.json. No real-wallet ownership, qualifying lock, deposit, redemption, signature or transaction is claimed from that receipt.

Not yet tested: physical iPhone/Android, real Phantom desktop/mobile, mobile deep-link return at a public HTTPS domain, device notch/safe areas, actual GPU frame time/memory, real lock expiry on chain, production API rate limits, WebGL context-loss recovery and every background/foreground interaction on hardware. Error/timeout/429 logic uses test doubles.

## Scope limits

The gate is a client UI feature. Connecting Phantom is not authentication. There is no server-backed wallet session, authoritative lock admission, ranked score validation or prize/reward feature. Those require additional server design and review before introduction.

No spending, purchases, token movement or signing occurred. No new timelock program deployed. No public deployment or official hackathon submission occurred. Dates/prizes/submission window remain unannounced.
