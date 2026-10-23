# Optional OnlyFridge Club Game Room integration

Source review: **2026-10-23**. This is a discovery/catalog integration choice, separate from Free Play, the OnlyFridge pre-round advertisement and the Scan sponsor card. None authorizes another or grants timelock/paid admission.

## Resolve applicability and the owner's choice

Offer inclusion for **Browser**, **Both** (either APK architecture), or **Seeker + hosted website**. Do not offer it for **Seeker + bundled game only**, and do not add a web version to make the choice applicable. Reuse an explicit include/exclude answer. Otherwise ask during planning; unanswered remains pending. Browser/Both establish applicability even while Both's APK architecture is pending. Applicability stays conditional only for unknown platform or unresolved Seeker-only architecture. Record the choice and evidence in the brief independently of ads and Free Play.

## Club importer: operator-supplied contract

The operator supplied the following behavior on **2026-10-23**. Its `server/projects.mjs` implementation was not accessible for independent inspection; the [public OnlyFridge repository](https://github.com/mikeminer/OnlyFridge) exposed its player README. Recheck changed behavior with the operator/source rather than inventing an API.

- The Club imports `scan/data/hackathon-projects/<slug>.json` directly from **`mikeminer/devfridge:master`**, refreshing about every ten minutes. A merged valid entry can appear after the next successful refresh; this interval is not a publication SLA. No Club code change per game is required under this contract.
- The runtime minimum is `schemaVersion: 1`, `slug` and an HTTPS `playUrl`. On web, `demoUrl` supplies the in-cabinet demo; without it, a wallet-required game opens its full version in a new tab. New repository submissions still require `demoUrl` under CI. Display limits are name 60 and pitch 280 characters. Fridge Run is built in, not a community submission.
- An `access` description containing `wallet`, `lock`, `timelock` or `phantom` triggers the wallet-required/full-game classification. This is a text heuristic, not authentication or entitlement. Even **“Gioco gratuito, nessun wallet richiesto”** matches `wallet`. Describe access truthfully, test the resulting classification and playable demo, and report false positives to the operator; do not hide a gate or omit required disclosures to manipulate the label.
- `ARCADE_DENYLIST` is operator-only server configuration containing comma-separated slugs. Do not change it as part of a game submission. The operator reports that **all Game Room games on Android open the phone's system browser instead of playing inside a cabinet**. Verify that actual device behavior; it is not a Store-policy requirement.

The [official player README](https://github.com/mikeminer/OnlyFridge/blob/main/README.md#-hackathon-hall--real-indie-games) independently describes free demos inside the club, full versions opening a new tab and a catalogue terminal. Verify the result in [OnlyFridge Club](https://onlyfridgeclub.online/).

## Submit the complete repository record

The importer minimum is **not** the repository's submission schema. Use the current [full template](https://github.com/mikeminer/devfridge/blob/master/docs/hackathon/project.example.json) and [validator](https://github.com/mikeminer/devfridge/blob/master/scan/lib/hackathon-projects.cjs): all fields are required, including community/access/limitations, six public HTTPS URLs, a nonzero lowercase 40-character source commit SHA and `practiceAvailable: true`. Unknown fields such as `previewImageUrl` are rejected. Repository limits are name 80 and pitch 240; use **name ≤60 and pitch ≤240** to fit both consumers. Follow the validator's remaining text, URL, slug and file-size rules.

Use a real playable free `demoUrl` for the cabinet; syntactic URL validation alone does not establish embeddability or playability. If the owner excluded Free Play, record the conflict with the repository's free-practice requirement and resolve it with the owner/operator. Do not fabricate a demo, mark a false `practiceAvailable`, bypass CI or silently enable a free mode.

When Include is chosen, prepare the real hosted game, evidence and JSON; perform the authorized metadata PR workflow in [guided submission](hackathon-submission.md), targeting `master`, with `node scripts/validate-hackathon-projects.cjs`. Reuse existing entries/PRs and preserve owner review. Do not edit Club code, other entries or the curated gallery registry as a shortcut.

## Verify the two publication paths separately

The Club's direct GitHub import differs from the hackathon gallery/feed: the latter reads owner-maintained `scan/data/projects.json`, requiring `approved: true`, `published: true` and a successful production deployment. Gallery publication is not a prerequisite in the operator's stated Club import path. Neither an open PR nor a gallery card proves a live Club cabinet.

After the reviewed entry reaches `master` and a refresh succeeds, verify catalogue visibility, cabinet demo, focus/touch, fullscreen/audio, frame policy, wallet transitions, full-game links and return navigation, including Android where claimed. Do not invent iframe permissions, messaging protocols, wallet-session sharing or admission transfer. Record prepared, submitted, merged and live separately, with actual launch evidence and any untested device cases. Check false-positive access labels, denied slugs and entries absent after refresh without claiming guaranteed publication.
