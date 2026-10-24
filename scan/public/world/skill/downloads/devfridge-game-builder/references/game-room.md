# Optional OnlyFridge Club Game Room integration

Source review: **2026-10-23**; Season Pass wording updated **2026-10-24**. This is a discovery/catalog integration choice, separate from Free Play, the OnlyFridge pre-round advertisement and the Scan sponsor card. None authorizes another or grants Season Pass/paid admission. Describe new-game access as Season Pass in public copy while retaining the exact technical evidence and truthful required disclosures for review.

## Resolve applicability and the owner's choice

Offer inclusion for **Browser**, **Both** (either APK architecture), or **Seeker + hosted website**. Do not offer it for **Seeker + bundled game only**, and do not add a web version to make the choice applicable. Reuse an explicit include/exclude answer. Otherwise ask during planning; unanswered remains pending. Browser/Both establish applicability even while Both's APK architecture is pending. Applicability stays conditional only for unknown platform or unresolved Seeker-only architecture. Record the choice and evidence in the brief independently of ads and Free Play.

## Club importer: operator-supplied contract

The operator supplied the following behavior on **2026-10-23**. Its `server/projects.mjs` implementation was not accessible for independent inspection; the [public OnlyFridge repository](https://github.com/mikeminer/OnlyFridge) exposed its player README. Recheck changed behavior with the operator/source rather than inventing an API.

- The Club imports `scan/data/hackathon-projects/<slug>.json` directly from **`mikeminer/devfridge:master`**, refreshing about every ten minutes. A merged valid entry can appear after the next successful refresh; this interval is not a publication SLA. No Club code change per game is required under this contract.
- The runtime minimum is `schemaVersion: 1`, `slug` and an HTTPS `playUrl`. On web, `demoUrl` supplies the in-cabinet demo; without it, a wallet-required game opens its full version in a new tab. New repository submissions still require `demoUrl` under CI. Display limits are name 80 (since Club 1.6.17; 60 before) and pitch 280 characters. Fridge Run is built in, not a community submission.
- Labels follow the links (Club 1.6.17, 2026-10-23): every entry shows **free demo**; **full version ↗** appears only when `playUrl` differs from `demoUrl`. The old `access`-text heuristic (`wallet`, `lock`, `timelock`, `phantom`) now applies only to legacy entries without a demo, which the repository no longer accepts. A label is a display hint, not authentication or entitlement. Describe access truthfully; never change URLs or omit required disclosures to steer the label.
- `ARCADE_DENYLIST` is operator-only server configuration containing comma-separated slugs. Do not change it as part of a game submission. In the OnlyFridge Club **Android app (1.6.17 and later)** Game Room games open in a **Chrome Custom Tab over the club**, not inside a cabinet: the app keeps outside pages out of its own WebView. ✕ or Back returns to the club, still connected. Wallet connections there behave exactly as in Chrome, including Chrome's local network permission for Mobile Wallet Adapter ([Seeker wallets](seeker-wallet.md#chromes-local-network-permission-browser-and-custom-tab)). On the website the demo still plays in the cabinet. Verify on a device rather than assuming either path.

The [official player README](https://github.com/mikeminer/OnlyFridge/blob/main/README.md#-hackathon-hall--real-indie-games) independently describes free demos inside the club, full versions opening a new tab and a catalogue terminal. Verify the result in [OnlyFridge Club](https://onlyfridgeclub.online/).

## Submit the complete repository record

The importer minimum is **not** the repository's submission schema. Use the current [full template](https://github.com/mikeminer/devfridge/blob/master/docs/hackathon/project.example.json) and [validator](https://github.com/mikeminer/devfridge/blob/master/scan/lib/hackathon-projects.cjs): all fields are required, including community/access/limitations, six public HTTPS URLs, a nonzero lowercase 40-character source commit SHA and `practiceAvailable: true`. Unknown fields such as `previewImageUrl` are rejected. Repository limits are name 80 and pitch 240; the Club shows names up to 80 since 1.6.17, so **name ≤80 and pitch ≤240** fit both (keep names ≤60 while an older Club server may still be running). Follow the validator's remaining text, URL, slug and file-size rules.

Use a real playable free `demoUrl` for the cabinet; syntactic URL validation alone does not establish embeddability or playability. If the owner excluded Free Play, record the conflict with the repository's free-practice requirement and resolve it with the owner/operator. Do not fabricate a demo, mark a false `practiceAvailable`, bypass CI or silently enable a free mode.

When Include is chosen, prepare the real hosted game, evidence and JSON; perform the authorized metadata PR workflow in [guided submission](hackathon-submission.md), targeting `master`, with `node scripts/validate-hackathon-projects.cjs`. Reuse existing entries/PRs and preserve owner review. Do not edit Club code, other entries or the curated gallery registry as a shortcut.

## Verify the two publication paths separately

The Club's direct GitHub import differs from the hackathon gallery/feed: the latter reads owner-maintained `scan/data/projects.json`, requiring `approved: true`, `published: true` and a successful production deployment. Gallery publication is not a prerequisite in the operator's stated Club import path. Neither an open PR nor a gallery card proves a live Club cabinet.

After the reviewed entry reaches `master` and a refresh succeeds, verify catalogue visibility, cabinet demo, focus/touch, fullscreen/audio, frame policy, wallet transitions, full-game links and return navigation, including Android where claimed. Do not invent iframe permissions, messaging protocols, wallet-session sharing or admission transfer. Record prepared, submitted, merged and live separately, with actual launch evidence and any untested device cases. In the Android app, also connect the wallet from the Custom Tab on a Seeker, from a state where Chrome has not yet asked the local network question. Check the labels, denied slugs and entries absent after refresh without claiming guaranteed publication.
