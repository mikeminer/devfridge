# Optional OnlyFridge Club Game Room integration

Source review: **2026-10-23**. This is a discovery/catalog integration choice, separate from Free Play, the OnlyFridge pre-round advertisement and the Scan sponsor card. None authorizes another or grants timelock/paid admission.

## Resolve applicability and the owner's choice

Offer inclusion for **Browser**, **Both** (either APK architecture), or **Seeker + hosted website**. Do not offer it for **Seeker + bundled game only**, and do not add a web version to make the choice applicable. Reuse an explicit include/exclude answer. Otherwise ask during planning; unanswered remains pending. Browser/Both establish applicability even while Both's APK architecture is pending. Applicability stays conditional only for unknown platform or unresolved Seeker-only architecture. Record the choice and evidence in the brief independently of ads and Free Play.

## Verified pattern and its limits

The [official OnlyFridge README](https://github.com/mikeminer/OnlyFridge/blob/main/README.md#-hackathon-hall--real-indie-games) describes a Hackathon Hall with game cabinets and a catalogue terminal: free demos play inside the club, while full versions open in a new tab. The club's browser destination is [OnlyFridge Club](https://onlyfridgeclub.online/), also identified by the local marketing repository's `README.md:7` and `public/index.html:248`.

The inspected public OnlyFridge repository exposed its player README, not the runtime catalogue implementation. Scoped local source inspection did not establish a registration API, entry schema, iframe contract or automatic publication process. The README connects the hall to DevFridge hackathon games; it does **not** establish that a hackathon metadata PR automatically publishes a Game Room entry. Keep [hackathon submission](hackathon-submission.md) status separate.

## When the owner chooses Include

Discover the current operator-supported catalogue process before integration: authoritative source/API if available, required entry fields, accepted game URL and launch/embedding requirements. Use those verified requirements to prepare the real entry or review artifact; never invent an endpoint, iframe permissions, `postMessage` protocol or submission command. Continue game/hosting preparation while any operator-only detail is unavailable, and identify that exact remaining dependency.

Prepare the approved deployed HTTPS game URL, truthful title/description, licensed artwork and launch evidence in the actual requested format. If embedded play is required, verify the permitted parent origin, CSP/frame policy, focus/touch, fullscreen/audio, wallet transitions and return navigation. Test the actual launch path; an ordinary browser preview does not prove in-club compatibility. Preserve the owner's chosen access model: no automatic free demo, entitlement transfer or wallet-session sharing. If the operator requires a demo the owner has excluded, resolve that specific mismatch.

Finish the authorized integration/review handoff and report its real status with evidence. Prepared, submitted, accepted and live are distinct. Verify the production catalogue and launch before claiming inclusion; this skill cannot make operator acceptance or publication automatic.

Check applicability with Browser/no APK, Seeker/bundled/no offer, Seeker/hosted/optional offer and Both/bundled/web offer. Also check prior include/exclude answers, pending architecture, no Free Play, all ad combinations and a submitted entry absent from the live catalogue.
