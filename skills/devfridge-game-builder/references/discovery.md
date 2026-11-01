# Developer interview and build brief

First resolve the platform: **“Should I build this game for browser, as a Seeker Android app, or both?”** Reuse an explicit answer for this game; otherwise ask and wait before gameplay/platform implementation. A phone-sized web page does not resolve this choice. Record `browser`, `seeker` or `both`; there is no automatic default. Read-only discovery/setup can continue while waiting.

For `seeker` or `both`, next resolve **“Should the game and its assets be included in the APK, or should the APK load your game website?”** Record `bundled` or `hosted`, reusing an explicit answer; otherwise ask and wait before gameplay/platform implementation. Both produce a signed installable APK. Neither is preselected. For `browser`, mark APK architecture not applicable. Explain the selected offline/update limits without presenting local assets as proof that chain services work offline.

Offer **“Include this web game in OnlyFridge Club's Game Room?”** only for `browser`, `both` (either APK architecture), or `seeker` + `hosted`. Record include/exclude/pending independently of Free Play and both advertisements. Reuse explicit answers; otherwise ask and wait before gameplay implementation, continuing read-only discovery/setup. For `seeker` + `bundled`, mark not applicable and do not offer it. Browser/Both already establish applicability even if Both's APK architecture is pending. Keep the question conditional only while platform is unknown or Seeker-only architecture is unresolved; do not infer consent, choose an architecture, or add a website to make it apply. Include triggers [integration preparation and review](game-room.md), not automatic publication.

## Blockchain setup: ask at the start

Right after the platform question, ask these four together in one message, reusing any answer already given for this game:

1. **RPC.** "Which Solana RPC should the game use? Give me your provider (for example Alchemy, Helius, QuickNode) or leave it empty to use the public Solana RPC." No answer means `https://api.mainnet-beta.solana.com`; record `rpc: public` and note that it is rate-limited and fine for launch and testing. A provider URL that contains an API key is a secret: it goes only into server-side configuration of the [RPC proxy](rpc-proxy.md) (hosting secret or `.env` on the server), never into game code, the APK, the repository, logs or screenshots. Prefer that the owner enters it directly in the hosting dashboard or with `! vercel env add RPC_UPSTREAM_URL production`; if they paste it in chat, use it only for that configuration and remind them once that it is now in the chat history. The game itself only ever knows the proxy URL, or the public RPC when no key is used.
2. **Token-2022 CA.** "What is your token's contract address (CA)?" Ask for the full mint or Pump.fun URL; a ticker is not identity. Verify on-chain before building payments: owner is the Token-2022 program, initialized, decimals, no TransferFee/TransferHook/unknown extensions, mint and freeze authority status, and that a market route exists (bonding curve or pool). A legacy SPL token cannot use the subscription; say so plainly and keep payments off until the owner provides a Token-2022 mint. Also collect logo, model, animation and sounds if available.
3. **Website domain.** "What is your game's website domain?" This is the wallet identity, the host of the privacy and terms pages and, for web or hosted APK, the game's origin and the RPC proxy origin. Missing blocks release, not development.
4. **Subscription prices.** "Which passes do you want, and how much SOL each? Daily Pass, Weekly Pass, Monthly Pass." Propose all three; the prices are the owner's choice, never copied from another game. Also ask what the subscription opens and what stays free.

Explain in one line how payment works, for the owner only: the player pays SOL, the SOL buys the owner's token and the tokens are held until the subscription ends; players only see a subscription and its countdown. Do not repeat these questions later, and do not ask for a token amount per plan: access depends on an active subscription, not on an exact amount.

## Game questions

Then ask up to two questions, omitting anything already answered:
1. What should players do? Offer runner, arena survival, drift racing, physics puzzle or exploration. Ask about win/loss, session length and desired 3D style.
2. One character or several, and what exactly does the subscription open? Example (Street Meat): levels 1–3 plus a daily level remain free; this is not a universal free scope.

Follow up only where needed: minimum device/orientation; single-player versus actual multiplayer; assets/licences; one mint or multiple independently gated avatars; local best versus competitive scores; selected ecosystem modules; repository/hosting. Ask **“Add an in-app Buy <TOKEN> screen?”** independently from the subscription and ads; the subscription's built-in purchase does not imply permission to add a separate market screen. Ask for available logo/art/rigs/SFX/music and rights, desired locale(s), and any violence/gore and age-rating decisions. Full / Reduced / Off is conditional on such content, with Reduced for Store builds. For Seeker/Both, resolve new versus existing app, final permanent case-sensitive application ID before the first release build, existing signing-key availability (never its contents/password in chat), version history, physical device access, publisher account/legal URLs and APK/draft/authorized-submission scope. For Both, keep shared game content and separate platform adapters. If unsure, compare two or three scoped concepts. Never ask for seed phrases/private keys.

Before implementing gameplay, ask the owner about both Free Play placements unless they have already explicitly chosen for this game:

1. "Include an OnlyFridge Club promotion before every new free round, including the first and retries, with a Continue button?"
2. "Include the DevFridge Scan sponsored-token card at the top during Free Play, showing YOUR AD HERE when there is no active sponsor?"

The choices are independent: both, one or neither. Do not preselect consent, treat silence as refusal/consent, infer consent from a free-mode request, or enable ads because an example game has them. An unanswered choice remains pending; wait before gameplay implementation, while continuing read-only discovery/setup. If the owner explicitly excludes Free Play, mark both not applicable. Reuse answers already given for this game instead of repeating questions. These questions are for the creator during planning, not for players before each round. For any approved placement, follow [the integration guide](free-play-sponsors.md).

Record in the brief:
- Explicit platform decision, conditional APK architecture and web/APK/Store deliverables; unanswered choices have no default.
- Conditional Game Room decision (include / exclude / pending / not applicable), owner's answer, target web URL and integration/review status; separate from Free Play and each ad.
- Name, visual direction, loop, camera, session length and win/loss.
- Desktop/touch actions, pause/restart, audio and accessibility.
- RPC choice (`public` or provider name; never the key itself), proxy URL and where the key is stored server-side.
- Network, full Token-2022 mint, verified program owner/decimals/extensions/authorities, market route, evidence source/date.
- Website domain (wallet identity, legal pages, origin).
- Subscription plans with exact SOL prices in lamports (Daily 1 day / Weekly 7 / Monthly 30), slippage, free scope and what the subscription opens. Admission: any active verified deposit of the mint for the wallet; no amount check; countdown from its end time. Preserve an existing game's legacy token-amount Season Pass unless the owner asks to migrate.
- Sign-in, in-app subscription purchase, prechecks, recheck policy and expired/unavailable behavior; optional separate market choice.
- Selected modules, score authority, database, contract requirements and owner powers.
- Free Play scope and each placement's decision (include / exclude / pending / not applicable), with the owner's answer; no unanswered ad setting may become enabled.
- Assets, deployment target, test matrix, assumptions and unresolved blockers.
- For Android: package/versionCode/signing-certificate identity, bundled asset build or approved hosted origin/deployment, wallet integration, offline limits, upgrade plan, locale mapping, Store metadata and submission authorization/status. Never copy a reference game's package, wallet recipient, RPC or token as production configuration.

Defaults to propose, not impose: single-player; no paid entry/rewards; labeled development fixtures until mint/prices are confirmed (player-facing practice only within the chosen free scope); one small complete level; Daily/Weekly/Monthly subscription bought in-app with SOL and verified from chain; public Solana RPC when no provider is given; local personal best labeled local. Preserve explicitly selected legacy flows for existing games. Rewards need further design, not an automatically selected contract.

For production, reuse existing publisher/support/domain and actual privacy/data/payment facts; ask only for missing values needed by [the public-site generator](public-site.md). Store a provider RPC key only server-side and suggest a spending limit with the provider. Record the physical Seeker and representative performance scenario for APK releases, plus the saved checkpoint location. For deliverables over 25 MB, reuse an authorized private Drive destination or resolve the account/folder before delivery; this does not authorize public sharing or uploading unrelated files. See [release updates](release-updates.md).

Once platform and applicable APK architecture, Game Room and Free Play placement choices are resolved, continue reversible scene work while mint/hosting answers are pending. Never invent production settings to make a build appear complete.
