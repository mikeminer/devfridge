// One copy source for the skill landing page and hackathon onboarding.
export type GamePlatformChoice = 'ask' | 'browser' | 'seeker' | 'both';
export type ApkDeliveryChoice = 'ask' | 'bundled' | 'hosted';
export type GameRoomChoice = 'ask' | 'include' | 'exclude';

export function hasWebDelivery(platform: GamePlatformChoice, apkDelivery: ApkDeliveryChoice) {
  return platform === 'browser' || platform === 'both' || (platform === 'seeker' && apkDelivery === 'hosted');
}

export function gamePlatformPrompt(platform: GamePlatformChoice = 'ask', apkDelivery: ApkDeliveryChoice = 'ask', gameRoom: GameRoomChoice = 'ask') {
  const choices: Record<GamePlatformChoice, string> = {
    ask: 'Ask me: no new choice supplied in this prompt. Reuse my explicit prior choice; otherwise ask Browser, Seeker app, or Both and wait for my answer.',
    browser: 'Browser. This is my explicit owner choice.',
    seeker: 'Seeker app. This is my explicit owner choice.',
    both: 'Both. This is my explicit owner choice.',
  };
  const browser = 'For Browser, build a Three.js game for desktop and mobile browsers with Phantom extension/mobile-browser access, touch and keyboard controls, and wallet interruption recovery.';
  const apkChoices: Record<ApkDeliveryChoice, string> = {
    ask: 'Ask me; no new choice supplied in this prompt. Reuse my explicit prior choice; otherwise ask whether the game content should be included in the APK or loaded from a hosted website, and wait before choosing the architecture.',
    bundled: 'Included in the APK. This is my explicit owner choice; package the game assets locally.',
    hosted: 'Loaded from a hosted website. This is my explicit owner choice; the signed APK loads my HTTPS game site.',
  };
  const apkRule = 'For Seeker app or Both, resolve APK content before architecture implementation. There is no automatic default: reuse my explicit prior answer, otherwise ask and wait. Both content choices produce an installable signed APK; Browser alone does not require an APK. Bundled assets do not make wallet, RPC or server features work offline.';
  const apk = platform === 'seeker' || platform === 'both' ? `${apkRule}\nAPK content: ${apkChoices[apkDelivery]}` : platform === 'ask' ? `After resolving the platform, ${apkRule.charAt(0).toLowerCase()}${apkRule.slice(1)}` : '';
  const seeker = 'For Seeker app, deliver a signed release APK using the chosen content architecture. Read references/seeker-android.md, references/seeker-wallet.md and references/solana-dapp-store.md. Verify current Seeker Connect / Mobile Wallet Adapter support for that architecture: use a narrowly scoped native bridge for a native WebView wrapper, or the supported web-wallet path for browser/TWA delivery. Do not assume a WebView has an injected browser wallet or force a native bridge onto a browser/TWA flow. Test the complete game, Season Pass access, wallet approval/rejection, network loss and app resume on a physical Seeker. Prepare the Solana dApp Store listing, privacy/support information, screenshots, release evidence and owner-controlled signing. Check current Store policy for the chosen architecture before release. Report missing device or publisher prerequisites honestly; a built APK is not Store approval or publication.';
  const delivery = platform === 'browser' ? browser : platform === 'seeker' ? seeker : platform === 'both' ? `${browser}\n${seeker}\nFor Both, share gameplay source and assets, keep platform-specific wallet adapters separate, and verify both deliverables independently.` : 'Explain the three delivery options if needed, then use only the chosen platform workflow. Browser uses Phantom on desktop/mobile. Seeker app delivers an APK with the chosen content and wallet architecture, physical-device testing and Solana dApp Store preparation. Both shares gameplay source with separate platform adapters.';
  const roomChoices: Record<GameRoomChoice, string> = {
    ask: 'Ask me; no new choice supplied in this prompt. Reuse my explicit prior choice; otherwise ask whether I want this web game integrated into OnlyFridge Club Game Room and wait before gameplay or integration work.',
    include: 'Include; this is my explicit owner choice. Prepare the integration/submission using references/game-room.md. Report the real submission status; do not claim publication before review and verified deployment.',
    exclude: 'Do not include; this is my explicit owner choice. Do not prepare a Game Room integration/submission.',
  };
  const room = hasWebDelivery(platform, apkDelivery)
    ? `Game Room integration: ${roomChoices[gameRoom]}\nGame Room is independent of both free-play ad choices and whether Free Play exists; reuse prior explicit answers and never infer opt-in from either ad setting.`
    : platform === 'seeker' && apkDelivery === 'bundled'
      ? 'Game Room is not applicable to this bundled-only Seeker delivery. Do not ask its opt-in question or carry over a stale Game Room choice.'
      : 'After resolving the delivery choices, ask about Game Room only if web delivery is selected: Browser, Both, or a Seeker APK that loads a hosted website. Reuse an explicit prior answer for that web path; otherwise ask and wait before gameplay or integration work. For bundled-only Seeker, skip Game Room and ignore stale choices. Game Room is independent of both ad choices and Free Play. If included for a web path, prepare integration/submission using references/game-room.md without claiming publication.';
  return `First resolve the delivery platform with me as the game owner, before other build decisions. Do not implement gameplay until I explicitly choose Browser, Seeker app, or Both. Reuse an explicit prior platform choice without asking again. Ask me supplies no new decision and must never default to Browser; only a choice missing from both this prompt and our prior conversation remains pending.
Delivery platform: ${choices[platform]}
${apk ? `${apk}\n` : ''}${delivery}
${room}`;
}

export const PLATFORM_PROMPT = gamePlatformPrompt();

export type FreePlaySponsorChoice = 'ask' | 'include' | 'exclude';

export function freePlaySponsorPrompt(onlyFridgeClub: FreePlaySponsorChoice = 'ask', sponsoredTokenCard: FreePlaySponsorChoice = 'ask') {
  const choices: Record<FreePlaySponsorChoice, string> = {
    ask: 'Ask me; no new choice supplied in this prompt. Reuse my explicit prior choice; otherwise ask and keep disabled while pending.',
    include: 'Include; this is my explicit owner choice.',
    exclude: 'Do not include; this is my explicit owner choice.',
  };
  return `Before implementing gameplay, ask me as the game owner whether to include each of these two independent free-play ad integrations, unless I have already explicitly answered. Accept both, either one, or neither. Reuse each explicit choice without asking again. Keep each integration disabled unless I explicitly chose Include. Ask me supplies no new decision: reuse a prior explicit answer, otherwise leave it pending and ask before gameplay implementation. A missing answer is never consent. If I explicitly choose no Free Play, mark both not applicable without asking ad questions or adding a free mode. Read references/free-play-sponsors.md for integration details.
OnlyFridge Club ad before every free run, including the first run and every retry/restart, but never on pause/resume: ${choices[onlyFridgeClub]}
YOUR AD HERE / sponsored-token top card during free mode only: ${choices[sponsoredTokenCard]}
The top card is the only ad during a free run; the independently selected Club promotion appears before each new free round. Neither integration may appear in Season Pass or paid sessions. These ad choices are separate from the other optional ecosystem modules.`;
}

export const FREE_PLAY_SPONSOR_PROMPT = freePlaySponsorPrompt();

export type InGameMarketChoice = 'ask' | 'include' | 'exclude';

export function seasonPassPrompt(tiers = '', freeScope = '', market: InGameMarketChoice = 'ask') {
  const marketChoices: Record<InGameMarketChoice, string> = {
    ask: 'Ask me; no new choice supplied in this prompt. Reuse my explicit prior choice; otherwise ask and keep disabled while pending.',
    include: 'Include; this is my explicit owner choice. Implement the in-app token market using references/in-game-market.md.',
    exclude: 'Do not include; this is my explicit owner choice. Do not implement an in-app token market.',
  };
  return `Resolve my Season Pass tiers and free scope before implementing access. Read references/season-pass.md. Missing values supply no new decision: reuse my explicit prior choices; otherwise ask and wait. Do not invent token amounts, durations or a free mode.
Season Pass tiers (label, duration and exact token amount): ${tiers.trim() || 'Ask me; reuse my explicit prior tiers, otherwise ask for each tier label, duration and exact token amount.'}
What stays free: ${freeScope.trim() || 'Ask me; reuse my explicit prior free scope, otherwise ask what, if anything, stays free.'}
Optional in-app Buy <TOKEN> screen: ${marketChoices[market]}
The market choice is independent of platform, Game Room and both free-play ad choices; never infer consent from them. Validate the configured tiers and calculate Best value only from their actual token amount per day. Create Season Passes directly on the existing Fridge program and verify each deposit using exact integer amounts, original deposit duration with the documented one-hour tolerance, connected-wallet ownership, the correct mint and fresh on-chain expiry. Do not combine insufficient deposits or let an unknown RPC result grant access. Show pass amount, duration, end date and Details with the program, 2% fee, network costs and route constraints before wallet approval. Do not deploy a new contract or promise automatic renewal.`;
}

export const GAME_BUILD_CAPABILITIES = `Ask for my real wallet-identity domain, permanent Android package if applicable, supported UI languages and logo/art/audio rights; reuse answers already provided. Follow references/gamedev-skills.md to route the selected game genre and platform, references/3d-assets-and-characters.md and references/visual-realism.md for realistic assets, references/logo-and-store-art.md for original brand and Store art, and references/sound-prompts.md and references/music-prompts.md for SFX and soundtrack pipelines. Record actual licenses and distinguish generated or proposed assets from completed, inspected files.
If I explicitly select the in-game market, resolve the token's route on-chain, show a fresh quote and all costs, simulate and validate the exact transaction, and recover unknown outcomes without an automatic second request. Follow references/in-game-market.md; do not execute a real purchase as a test.
Build one complete working loop first, then small improvements with a verified source snapshot, actual check results and exact next action at every stage; follow references/incremental-build.md. Preserve newer work on resume and continue through the full requested scope.
Use references/rpc-proxy.md for the deployable private-provider proxy: fixed server-only upstream, scoped methods and limits; never embed the paid RPC key in the APK. Before proposing a Seeker Store submission, follow references/wallet-trust.md and block submission when the identity domain, wallet simulation, RPC key scan or review content gate fails. Generate real landing/privacy/terms pages from actual app facts with references/public-site.md. A bundled-only support website does not make Game Room inclusion applicable.
Before every game release, follow references/performance-and-capture.md: capture real input-driven gameplay and block release if any complete measured one-second window falls below 50 FPS after warmup. Require fresh exact-candidate evidence; for APKs require the physical Seeker checklist. When Store materials are requested, capture actual ready scenes, retain original screenshots, add truthful captions and validate dimensions/count/size; browser-only performance tests do not require Store artwork. Missing hardware evidence blocks release, not ongoing development.
Follow references/release-updates.md for version advancement, original package/signing identity and verified publishing CLI submission within existing authorization. Automatically route explicitly selected deliverables over 25,000,000 bytes to the configured authorized private Drive folder with secret scanning, resumable uploads and checksum verification. Missing Drive setup means delivery pending; never upload keys, credentials or private checkpoints. These thresholds are workflow policies, not Store limits.
Apply references/release-pitfalls.md, the adaptive icon builder, player-copy and secret checks, and the quality governor. Keep player-facing Season Pass wording clear while preserving technical and fee disclosures in Details. Verify the selected UI languages and platform controls. Keep simulations, physical Seeker tests, signed APK creation and Store publication status distinct; report unavailable checks honestly. Do not buy tokens, move funds or sign transactions during setup.`;

export const INSTALL_PROMPT = `Help me build a Solana community game with DevFridge and prepare it for the DevFridge hackathon showcase. I do not need to know Git: guide me through decisions and handle the technical work.

Read https://hackathon.devfridge.cool/llms.txt and its linked handbook first.
Install the official DevFridge Game Builder skill from:
https://world.devfridge.cool/world/skill/downloads/devfridge-game-builder.zip
Verify its SHA-256 using https://world.devfridge.cool/world/skill/downloads/manifest.json, inspect SKILL.md and the archive, and extract only inside the destination directory.
Use .agents/skills/devfridge-game-builder/ for Codex, .claude/skills/devfridge-game-builder/ for Claude Code, or your agent's documented skill directory. Preserve existing customized files and ask before replacing them. Keep all references, assets, agents and vendor files, including licenses and notices. If installation is unavailable, explain manual steps instead of claiming success.

Load the skill.
${PLATFORM_PROMPT}
After resolving the platform, ask about the game and community I want to build for; my exact Solana token mint (or whether it is not launched yet); my Season Pass tiers (length and amount) and what stays free. Reuse decisions I have already provided.
${seasonPassPrompt()}
${FREE_PLAY_SPONSOR_PROMPT}
Create a playable Three.js game for my chosen platform and content architecture with the corresponding wallet integration, direct on-chain Season Pass activation and per-deposit eligibility. Follow the platform delivery references, including the Seeker Android, architecture-specific wallet and Solana dApp Store guides when Seeker app or Both is selected. If there is no verified mint, use clearly labelled development fixtures; include player-facing practice only if it fits my chosen free-mode scope. Use realistic materials, an original art direction and controls appropriate to my platform. Keep wallet authentication, token eligibility and score verification separate.
Connect my game's Season Pass to the existing Fridge program on Solana; do not deploy a new contract. Show the Season Pass terms (amount, length and end date) and the Details disclosure (program, 2% fee and route constraints) before any wallet approval.
${GAME_BUILD_CAPABILITIES}
Keep an AI build log. When I ask to submit, follow references/hackathon-submission.md: prepare my evidence and project metadata, validate it, and handle the GitHub fork, branch and PR to mikeminer/devfridge for me. Guide sign-in only if needed; do not give me Git homework. Owner review, merge and successful deployment publish the gallery entry. Dates, prizes and final competition eligibility remain to be announced.`;

export const SUBMISSION_PROMPT = 'Use $devfridge-game-builder and read references/hackathon-submission.md. Prepare and submit my game to the DevFridge hackathon gallery. I am not a developer: handle evidence, validation, the GitHub fork, branch and pull request for me. Reuse our build details and ask only for missing decisions. Guide GitHub sign-in only if needed. Submit only my project metadata to mikeminer/devfridge:master, keep source in my own repository, and return the real PR link and review status. Help fix checks and address feedback; do not self-approve or claim publication before owner review, merge and successful deployment.';
export const SHOWCASE_STATUS = 'Gallery submissions are open for review. Competition dates, prizes and final eligibility remain to be announced.';
export const SUBMISSION_INTRO = 'Submit through your own coding agent with the DevFridge Game Builder skill. No Git experience needed. Your agent prepares the project details and evidence, handles the GitHub fork and pull request, checks errors and helps with review feedback. You provide missing decisions and sign in when needed.';
export const SUBMISSION_STEPS = [
  ['01', 'Your agent submits', 'It checks the playable game and evidence, validates the project details and opens a review request. You receive the real PR link.'],
  ['02', 'DevFridge reviews', 'The owner reviews the game and project details. Your agent helps fix checks and address feedback in the same PR.'],
  ['03', 'Your game goes live', 'After owner review, merge and a successful deployment, the project appears in the gallery automatically. Approval alone does not publish it.'],
] as const;
