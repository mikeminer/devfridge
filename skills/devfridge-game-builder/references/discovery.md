# Developer interview and build brief

First resolve the platform: **“Should I build this game for browser, as a Seeker Android app, or both?”** Reuse an explicit answer for this game; otherwise ask and wait before gameplay/platform implementation. A phone-sized web page does not resolve this choice. Record `browser`, `seeker` or `both`; there is no automatic default. Read-only discovery/setup can continue while waiting.

For `seeker` or `both`, next resolve **“Should the game and its assets be included in the APK, or should the APK load your game website?”** Record `bundled` or `hosted`, reusing an explicit answer; otherwise ask and wait before gameplay/platform implementation. Both produce a signed installable APK. Neither is preselected. For `browser`, mark APK architecture not applicable. Explain the selected offline/update limits without presenting local assets as proof that chain services work offline.

Offer **“Include this web game in OnlyFridge Club's Game Room?”** only for `browser`, `both` (either APK architecture), or `seeker` + `hosted`. Record include/exclude/pending independently of Free Play and both advertisements. Reuse explicit answers; otherwise ask and wait before gameplay implementation, continuing read-only discovery/setup. For `seeker` + `bundled`, mark not applicable and do not offer it. Browser/Both already establish applicability even if Both's APK architecture is pending. Keep the question conditional only while platform is unknown or Seeker-only architecture is unresolved; do not infer consent, choose an architecture, or add a website to make it apply. Include triggers [integration preparation and review](game-room.md), not automatic publication.

Then ask up to three questions, omitting anything already answered:
1. What should players do? Offer runner, arena survival, drift racing, physics puzzle or exploration. Ask about win/loss, session length and desired 3D style.
2. What is the exact Solana mint and intended network? Ask for the Pump.fun URL/full address and available logo, model, animation and sounds. A ticker alone is not identity.
3. What does the Season Pass unlock, and which tiers (duration + amount) do you want? Which one is best value? Ask what stays free, whole tokens versus raw units, and one or several characters. Define each tier as `{id, label, days, amountRaw}`; confirm ordered tiers rather than guessing an amount from a ticker. Propose 1 Month / 6 Months / 1 Year only as choices, not defaults. Badge/preselect the longest only when its per-day token amount is actually lower. Example (Street Meat): levels 1–3 plus a daily level remain free; this is not a universal free scope.

Follow up only where needed: minimum device/orientation; single-player versus actual multiplayer; assets/licences; one mint or multiple independently gated avatars; local best versus competitive scores; selected ecosystem modules; repository/domain/hosting. Ask **“Add an in-app Buy <TOKEN> screen?”** independently from the pass and ads; a pass does not imply permission to integrate a market. Ask for the owner's real HTTPS identity domain (missing blocks release, not development), available logo/art/rigs/SFX/music and rights, desired locale(s), and any violence/gore and age-rating decisions. Full / Reduced / Off is conditional on such content, with Reduced for Store builds. For Seeker/Both, resolve new versus existing app, final permanent case-sensitive application ID before the first release build, existing signing-key availability (never its contents/password in chat), version history, physical device access, publisher account/legal URLs and APK/draft/authorized-submission scope. For Both, keep shared game content and separate platform adapters. If unsure, compare two or three scoped concepts. Never ask for seed phrases/private keys.

Before implementing gameplay, ask the owner about both Free Play placements unless they have already explicitly chosen for this game:

1. "Include an OnlyFridge Club promotion before every new free round, including the first and retries, with a Continue button?"
2. "Include the DevFridge Scan sponsored-token card at the top during Free Play, showing YOUR AD HERE when there is no active sponsor?"

The choices are independent: both, one or neither. Do not preselect consent, treat silence as refusal/consent, infer consent from a free-mode request, or enable ads because an example game has them. An unanswered choice remains pending; wait before gameplay implementation, while continuing read-only discovery/setup. If the owner explicitly excludes Free Play, mark both not applicable. Reuse answers already given for this game instead of repeating questions. These questions are for the creator during planning, not for players before each round. For any approved placement, follow [the integration guide](free-play-sponsors.md).

Record in the brief:
- Explicit platform decision, conditional APK architecture and web/APK/Store deliverables; unanswered choices have no default.
- Conditional Game Room decision (include / exclude / pending / not applicable), owner's answer, target web URL and integration/review status; separate from Free Play and each ad.
- Name, visual direction, loop, camera, session length and win/loss.
- Desktop/touch actions, pause/restart, audio and accessibility.
- Network, full mint, verified program owner/decimals/extensions, evidence source/date.
- Ordered per-mint Season Pass tiers with exact raw integer amounts, original duration and one-hour tolerance; no summing for tier admission; best-value calculation, free scope and avatar mapping. Preserve explicitly requested legacy exact access policies rather than silently migrating an existing game's economy.
- Sign-in, in-app pass activation, prechecks, wallet identity domain, recheck policy and expired/unavailable behavior; optional market choice and bounded trade/slippage configuration.
- Selected modules, score authority, database, contract requirements and owner powers.
- Free Play scope and each placement's decision (include / exclude / pending / not applicable), with the owner's answer; no unanswered ad setting may become enabled.
- Assets, deployment target, test matrix, assumptions and unresolved blockers.
- For Android: package/versionCode/signing-certificate identity, bundled asset build or approved hosted origin/deployment, wallet integration, offline limits, upgrade plan, locale mapping, Store metadata and submission authorization/status. Never copy a reference game's package, wallet recipient, RPC or token as production configuration.

Defaults to propose, not impose: single-player; no paid entry/rewards; visibly labeled practice until mint/rules are confirmed; one small level; external DevFridge locking plus recheck; local personal best labeled local. Rewards need further design, not an automatically selected contract.

Once platform and applicable APK architecture, Game Room and Free Play placement choices are resolved, continue reversible scene work while mint/hosting answers are pending. Never invent production settings to make a build appear complete.
