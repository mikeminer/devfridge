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
  const seeker = 'For Seeker app, deliver a signed release APK using the chosen content architecture. Read references/seeker-android.md, references/seeker-wallet.md and references/solana-dapp-store.md. Verify current Seeker Connect / Mobile Wallet Adapter support for that architecture: use a narrowly scoped native bridge for a native WebView wrapper, or the supported web-wallet path for browser/TWA delivery. Do not assume a WebView has an injected browser wallet or force a native bridge onto a browser/TWA flow. Test the complete game, DevFridge access, wallet approval/rejection, network loss and app resume on a physical Seeker. Prepare the Solana dApp Store listing, privacy/support information, screenshots, release evidence and owner-controlled signing. Report missing device or publisher prerequisites honestly; a built APK is not Store approval or publication.';
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
Neither integration may appear in timelock-unlocked or paid sessions. These ad choices are separate from the other optional ecosystem modules.`;
}

export const FREE_PLAY_SPONSOR_PROMPT = freePlaySponsorPrompt();

export const INSTALL_PROMPT = `Help me build a Solana community game with DevFridge and prepare it for the DevFridge hackathon showcase. I do not need to know Git: guide me through decisions and handle the technical work.

Read https://hackathon.devfridge.cool/llms.txt and its linked handbook first.
Install the official DevFridge Game Builder skill from:
https://world.devfridge.cool/world/skill/downloads/devfridge-game-builder.zip
Verify its SHA-256 using https://world.devfridge.cool/world/skill/downloads/manifest.json, inspect SKILL.md and the archive, and extract only inside the destination directory.
Use .agents/skills/devfridge-game-builder/ for Codex, .claude/skills/devfridge-game-builder/ for Claude Code, or your agent's documented skill directory. Preserve existing customized files and ask before replacing them. Keep all references, assets and agents files. If installation is unavailable, explain manual steps instead of claiming success.

Load the skill.
${PLATFORM_PROMPT}
After resolving the platform, ask about the game and community I want to build for; my exact Solana token mint (or whether it is not launched yet); and my intended timelock access rules. Reuse decisions I have already provided.
${FREE_PLAY_SPONSOR_PROMPT}
Create a playable Three.js game for my chosen platform and content architecture with the corresponding wallet integration and DevFridge timelock gating. Follow the platform delivery references, including the Seeker Android, architecture-specific wallet and Solana dApp Store guides when Seeker app or Both is selected. If there is no verified mint, use clearly labelled development fixtures; include player-facing practice only if it fits my chosen free-mode scope. Use realistic materials, an original art direction and controls appropriate to my platform. Keep wallet authentication, token eligibility and score verification separate.
Use the existing DevFridge Solana program; do not deploy a new timelock contract. Explain expiry, the 2% redemption fee and routing constraints before any locking flow. Do not buy tokens, move funds or sign transactions during setup.
Keep an AI build log. When I ask to submit, follow references/hackathon-submission.md: prepare my evidence and project metadata, validate it, and handle the GitHub fork, branch and PR to mikeminer/devfridge for me. Guide sign-in only if needed; do not give me Git homework. Owner review, merge and successful deployment publish the gallery entry. Dates, prizes and final competition eligibility remain to be announced.`;

export const SUBMISSION_PROMPT = 'Use $devfridge-game-builder and read references/hackathon-submission.md. Prepare and submit my game to the DevFridge hackathon gallery. I am not a developer: handle evidence, validation, the GitHub fork, branch and pull request for me. Reuse our build details and ask only for missing decisions. Guide GitHub sign-in only if needed. Submit only my project metadata to mikeminer/devfridge:master, keep source in my own repository, and return the real PR link and review status. Help fix checks and address feedback; do not self-approve or claim publication before owner review, merge and successful deployment.';
export const SHOWCASE_STATUS = 'Gallery submissions are open for review. Competition dates, prizes and final eligibility remain to be announced.';
export const SUBMISSION_INTRO = 'Submit through your own coding agent with the DevFridge Game Builder skill. No Git experience needed. Your agent prepares the project details and evidence, handles the GitHub fork and pull request, checks errors and helps with review feedback. You provide missing decisions and sign in when needed.';
export const SUBMISSION_STEPS = [
  ['01', 'Your agent submits', 'It checks the playable game and evidence, validates the project details and opens a review request. You receive the real PR link.'],
  ['02', 'DevFridge reviews', 'The owner reviews the game and project details. Your agent helps fix checks and address feedback in the same PR.'],
  ['03', 'Your game goes live', 'After owner review, merge and a successful deployment, the project appears in the gallery automatically. Approval alone does not publish it.'],
] as const;
