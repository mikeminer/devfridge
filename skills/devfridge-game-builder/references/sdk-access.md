# SDK, exact amounts and access

Published SDK v1.0 reviewed 2026-09-22: https://sdk.devfridge.cool/sdk/devfridge-sdk.js . SHA-256: `cad31b18ff0a9adc32241d341d37f9920f492ab63a321fea266d01b26966dc07`. Re-fetch/review before vendoring. A changed hash is a review signal, not permission to blindly replace an integrity check.

## Actual API

Load the script once and use `globalThis.DevFridgeSDK`. No official npm package is established by these sources.

```js
const fridge = new DevFridgeSDK({
  tokenMint: verifiedMint,
  plans: { member: { minLockDays: 30, renewalThresholdDays: 7 } },
  cacheTTL: 30_000,
});
const status = await fridge.checkSubscription(verifiedWallet);
const lockUrl = fridge.getLockUrl(30);
const scanUrl = fridge.getScanUrl();
const badgeUrl = fridge.getBadgeUrl({ theme: 'dark', style: 'full' });
```

30/7 is an example policy, not a game default. Other methods: `getBadgeHtml(opts)` and `startPolling(wallet, callback, intervalMs)` returning a stop function. `minLockAmount` is a **number in raw units**, not a BigInt/string. Use only when threshold and aggregate are safely representable; otherwise evaluate exact strings with BigInt.

Current implementation details:
- `minLockDays >= 1`; `0 <= renewalThresholdDays < minLockDays`.
- Original duration is `floor((unlockAt-createdAt)/86400)`, not remaining time.
- Amounts of duration-qualifying locks are added using JavaScript Number.
- The latest qualifying expiry determines floored days remaining. `active` needs `daysRemaining > 0`; a still-locked vault with under 24h left can appear inactive.
- Partial expiry can reduce a total below threshold before the longest lock ends. Re-evaluate all locks, not just `bestLock`.
- `cacheTTL: 0` falls back to 60,000ms. Poll errors are logged, not sent as inactive callbacks. Implement explicit timeout/error states and freshness deadlines.
- Returned `wallet` echoes the argument; it is not ownership proof. Validate every lock's depositor/mint.

## Exact active-lock policy

For any-active/sub-day or large-amount access, use the documented endpoint behind the SDK with `assets/timelock-gate.mjs`. Do not modify shared SDK semantics for one game.

`GET https://scan.devfridge.cool/api/sdk/check?wallet=<base58>&mint=<base58>` supports CORS. Response: `wallet`, `mint`, `ts` (Unix seconds), `locks`, `activeLocks`, `bestLock`, `daysRemaining`. Lock fields: `address`, `depositor`, `mint`, `amount` (raw decimal string), `createdAt`, `unlockAt` (Unix seconds), `lockId`.

```js
const response = await fetch(
  `https://scan.devfridge.cool/api/sdk/check?wallet=${encodeURIComponent(wallet)}&mint=${encodeURIComponent(mint)}`,
  { signal: AbortSignal.timeout(15_000) }
);
if (!response.ok) throw Error(`Lock lookup failed (${response.status})`);
const gate = evaluateTimelocks(await response.json(), {
  wallet, mint, minimumRaw: toRawAmount(minimumTokens, verifiedDecimals),
  minOriginalSeconds: 0, minRemainingSeconds: 0, maxAgeSeconds: 90,
});
```

Use one source per check; avoid duplicate SDK/API requests for identical evidence. Set `aggregation: 'sum'` (default) to combine locks of one mint or `'single'` to require one independently qualifying lock. The helper returns `nextCheckAt`, the next integer-second policy/freshness boundary, always after the supplied current time. Recheck then, on foreground and periodically (e.g. 60s); coalesce calls and back off on 429. Errors mean unavailable, not zero holdings. Different mints are evaluated separately. First verify mint owner/decimals/extensions using trusted Solana RPC.

API evidence may be cached (currently 30s shared cache plus 60s stale revalidation); sensitive admission should read current program accounts on the server. The SDK result omits `ts`/`mint`; do not feed it into the strict API evaluator or invent fresh timestamps for cached data.

Client gating is UX. Protect authoritative runs/content server-side with a verified wallet challenge and fresh evidence. Do not trust browser `active`, submitted wallet, client clock or amount. This helper is not server authentication or on-chain account validation.
