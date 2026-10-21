# Optional Free Play promotions and sponsors

Reviewed against implementation sources on **2026-10-21**. Use this reference when resolving or implementing the two optional Free Play placements. The owner chooses each independently; neither is a requirement for a DevFridge game.

## Resolve the owner's choices before building gameplay

Ask whether to include (1) an OnlyFridge Club promotion before every new free round and (2) a sponsored-token / YOUR AD HERE card above Free Play. Accept both, either, or neither; record each answer separately in the build brief. Reuse explicit answers already supplied for this game. An unanswered choice remains pending: ask and wait before implementing gameplay, while read-only discovery and setup may continue. If there is no Free Play, record both as not applicable and do not introduce a free mode for advertising.

These are build-time owner decisions, not questions shown to players before each round. Implement only approved placements; a declined placement adds no UI or network requests. These promotions do not establish Arcade payment, timelock eligibility, prizes or rewards. An ad click, installation or token boost must never grant admission to a paid or token-gated round.

## OnlyFridge Club before a new free round

After explicit owner approval, show a clearly labelled promotion before **every new Free Play round, including the first and retries**. Use one transition per new-round intent: idle/menu or results -> promotion -> Continue -> start. Re-rendering, double clicks, pausing/resuming, background/foreground and returning from an external link must not repeat the promotion or start duplicate rounds. Keep tutorial instruction separate from advertisements.

Provide a prominent, immediately usable **Continue playing** action and an optional **Discover OnlyFridge Club** action. Continue starts the pending free round without requiring a click-through, installation, wallet, payment or network response. Keep the promotion content bundled so it works offline. Make the dialog keyboard/touch accessible, manage focus, and allow returning to the menu. Opening the external destination never silently starts gameplay; the player can return and continue.

Verified destinations:

| Purpose | Destination |
| --- | --- |
| Shareable download page and web fallback | `https://club.devfridge.cool/download/onlyfridge-club` |
| Solana dApp Store listing | `solanadappstore://details?id=online.onlyfridgeclub.app` |
| Browser club | `https://onlyfridgeclub.online/` |

On a supported Android build, the explicit Discover action may open the fixed Store listing and fall back to the download page if unavailable. On the web, open the download page in a new tab with `noopener,noreferrer`. Do not automatically navigate, install an APK, probe wallets or accept caller-controlled intent URLs.

**Specification versus precedent:** existing MezzoPollo queues this promotion after a free run starts, so its first run has no interstitial. The before-first-run requirement above is this skill's requested behavior; copying MezzoPollo's initial `freeSponsorDue=false` gate unchanged would not satisfy it.

## Top card during Free Play

Reserve a responsive row above the game viewport, respecting device safe areas, orientation and available height. Do not cover the canvas, score, navigation or touch controls. The card may remain on Free menu/pause/results screens; hide it during tutorials, language selection, the promotion dialog, paid checkout and all paid/token-gated play.

Fetch lazily on the first eligible Free view. Select at most one eligible placement per page/app visit and keep that choice stable. Never rotate or refresh sponsors during a round. When the selected placement expires, use the empty card without selecting a replacement. An empty, invalid or unavailable feed also yields **YOUR AD HERE**, linked to `https://scan.devfridge.cool/#feature`, without blocking gameplay.

A populated card displays bounded plain-text name and symbol, a validated logo or neutral fallback, a localized paid-placement label and a brief localized investment disclaimer. Localize supporting copy and accessible labels; preserve the requested YOUR AD HERE title. Use text rendering, not injected HTML. Handle failed logos without repeated requests. On explicit click, pause active gameplay and open the canonical Scan destination in the external browser on native builds or a new tab on the web (`rel="sponsored noopener noreferrer"`, no referrer). Do not auto-resume when the player returns.

Request no wallet address, score, local records or advertising identifier; add no impression/click reports. Explain in privacy text that feed/logo services receive ordinary network information. Paid/token-gated views must not initiate sponsor-feed or logo requests.

## Feed and local adapter

The authoritative upstream is `GET https://scan.devfridge.cool/api/feed/boosted`. Its response is `{ "tokens": [...] }`; a token record contains `mint`, `name`, `symbol`, `image`, `tier`, `signature`, `payer`, `expiresAt`, `createdAt`, `fridged`, and optional `burned`. Both timestamps are Unix **milliseconds**. Only identity, logo and expiry are needed for a card; do not expose payer/signature or infer access rights from these records.

Implement the game's own same-origin `/api/sponsors` adapter:

```text
{ sponsors: [{ mint, name, symbol, logo, url, expiresAt }], fetchedAt }
```

Here `fetchedAt` is the server snapshot time in milliseconds. `logo` may be null. `url` is constructed locally from the validated mint. The existing `https://mezzopollo.it/api/sponsors` is a reference implementation with a MezzoPollo-specific origin allowlist, not a shared endpoint for every generated game.

Keep the upstream URL fixed. Use a bounded timeout (the reference uses four seconds), reject redirects and non-JSON/non-success responses, omit credentials, and cap declared and streamed response bytes (reference: 128 KiB upstream, 64 KiB client/native). Validate the envelope before processing records. Native wrappers should allow only their fixed adapter endpoint; never accept an arbitrary feed URL through a bridge.

Cache successful and failed attempts for 60 seconds per warm server instance; share an in-flight refresh among concurrent callers. A failed refresh returns an empty list, not an old placement. Filter expired records on every cached response. Separate instances do not share this memory cache: do not claim a global one-request-per-minute limit.

Set CDN freshness to the snapshot's **remaining** lifetime, for example `public, max-age=0, s-maxage=<remaining whole seconds>, must-revalidate`; never restart a full minute at each layer. Invalid/future/exhausted snapshot times have zero freshness. Unexpected adapter errors return an empty snapshot with `no-store`, without infrastructure details. Use `application/json` and `nosniff`; restrict CORS to the game's intended origins when needed. Client/native caching must respect the upstream snapshot time and back off failures without polling. Recheck each placement's expiry on render, foreground, timer expiry and click.

## Validation and destination boundaries

- Inspect at most 256 candidates and retain at most 12 unique mints. A mint must be a valid base58 string decoding to exactly 32 bytes. Require a safe-integer `expiresAt > Date.now()`; reject malformed, duplicate or expired entries.
- Strip markup, control characters and invisible/bidirectional formatting from names/symbols; normalize whitespace and bound names to 64 Unicode characters and symbols to 16. Supply harmless identity fallbacks and normalize leading `$` characters before display.
- Ignore all feed-provided destination URLs. Construct `https://scan.devfridge.cool/t/<validated-mint>` locally. The only empty-card destination is `https://scan.devfridge.cool/#feature`. Native navigation must enforce these exact paths, HTTPS host and mint validation, rejecting credentials, unexpected query/fragment, ports and encoded path tricks.
- Accept logos only through the exact HTTPS Scan origin and `/api/logo` path, resolved from a relative proxy path if necessary. Bound URLs to 2048 characters; reject credentials, fragments, whitespace/control characters and backslashes. Allow only nonduplicate `cid`, `path`, `mint`, `url`, `v` query keys. Require a valid CID (46-90 alphanumeric characters) or validated nested HTTPS image URL. Reject nested credentials/fragments, IP literals and local/internal hosts. Bound `path` to 512 characters, require a single leading slash and reject query/fragment/control/backslash tricks. Set `mint` from the validated record and `v=3` locally.
- Server/native logo fetching must reject redirects, enforce an image MIME allowlist and cap actual bytes (native reference: 2 MiB, three-second connection/read timeouts). Do not broaden a WebView's request/navigation allowlist for arbitrary logos. If a browser integration needs these response guarantees, fetch through a narrowly scoped image adapter rather than assuming an `<img>` prevents redirects. Invalid or failed logos use a neutral mark; the card can remain usable.

The placeholder markets existing Scan boost functionality. Do not hard-code current prices, buy a boost, burn tokens or introduce a checkout as part of this integration.

## Focused verification

Use local fixtures/mocks; tests need no real boost purchase, token transfer or installed sponsor app.

- Exercise both/either/neither owner selections, a reused explicit answer, an unanswered choice and a game without Free Play. Confirm omitted placements make no requests.
- Verify first free run and retry each show one interstitial; double Continue, re-render, pause/resume and app return cannot duplicate it or consume multiple rounds. Continue works offline without Discover. Store failure has the fixed HTTPS fallback.
- Check active, empty, expired, duplicate and malformed feed fixtures; injected markup, invalid mint, malicious link/logo and image failure. Only canonical destinations can open. Expiry before a click yields the placeholder; it never selects another sponsor mid-round.
- With a fake clock and concurrent callers, verify one refresh per warm instance, 60-second success/failure backoff, bounded timeout/body handling, rejection of redirects and a remaining CDN TTL. Drop an expired cached record without another fetch.
- Verify Free-only rendering and requests across mode switches, tutorial and checkout; one stable selection per visit; no wallet calls or tracking. Check keyboard/focus and touch in 390x844 portrait, phone landscape and desktop, including safe areas and external-link return.

## Implementation evidence

Sources inspected on 2026-10-21; these establish contracts and precedents, not a claim that a newly built game has been tested or deployed:

- Public DevFridge repository: [`scan/app/api/feed/boosted/route.ts`](https://github.com/mikeminer/devfridge/blob/master/scan/app/api/feed/boosted/route.ts) and [`scan/lib/store.ts`](https://github.com/mikeminer/devfridge/blob/master/scan/lib/store.ts), mirrored in the local `devfridge` checkout.
- Local `club.devfridge.cool/public/download/onlyfridge-club.html`: Store package, HTTPS download page and browser destination.
- Local `output/mezzo-pollo-submission-20260925/game`: `server/sponsors.mjs`, `api/sponsors.mjs`, `sponsors-policy.mjs`, and `tests/sponsors.test.mjs`. `mezzopollo-android/scripts/bundle-game.cjs` identifies this as its game source.
- Local `mezzopollo-android/app/src/main/assets/game`: `index.html`, `game-token-sponsor.mjs`, `sponsors-policy.mjs`, and `token-sponsor.css`; native `BridgePolicy.kt`, `TokenSponsorClient.kt`, `MainActivity.kt`; `app/src/main/assets/privacy.txt` documents requests and mode boundaries.
