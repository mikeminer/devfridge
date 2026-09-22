export const HACKATHON_ORIGIN = 'https://hackathon.devfridge.cool';
export const SKILL_URL = 'https://world.devfridge.cool/skill';
export const PROGRAM = '9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6';
export { INSTALL_PROMPT } from './game-builder-prompts';

export type Chapter = { slug: string; title: string; intro: string; sections: { title: string; paragraphs?: string[]; items?: string[] }[]; links: [string, string][] };
export const CHAPTERS: Chapter[] = [
  { slug: 'start', title: 'Start here', intro: 'One meme. One playable world. Build with your coding agent and the DevFridge stack.', sections: [
    { title: 'Who this is for', paragraphs: ['Solana developers, Pump.fun creators, artists and community builders who already have a token or are planning one. Work solo or as a team. You can start with a concept: launching or buying a token is not required to begin building.'] },
    { title: 'The challenge', paragraphs: ['Create a browser game with a complete play → result → replay loop, a community identity and a clear reason to return. Make it work on desktop and mobile. Use Phantom for wallet access and DevFridge timelocks to unlock a meaningful part of the experience.', 'Agentic coding means using an AI agent to plan, implement and test with you. You remain responsible for the code, dependencies, asset rights and claims. Record what the agent did and what you verified.'] },
    { title: 'Your first session', items: ['Install the DevFridge Game Builder skill using the prompt on the home page.', 'Answer the skill’s discovery questions: game loop, exact mint or pre-launch status, access policy.', 'Build one small playable scene before expanding the world.', 'Add a labelled practice mode and then real wallet + timelock verification.', 'Test on a real phone and desktop. Save the evidence in your build log.'] },
    { title: 'Event status', paragraphs: ['The builder kit and agent-guided gallery submissions are available now. Your agent can prepare a project PR for owner review. Event dates, the official competition window, judges, awards and prizes remain to be announced. Gallery inclusion does not reserve a competition place or guarantee eligibility for prizes.', 'There is no hackathon entry fee announced. The skill download is free. AI tools, hosting, RPC usage, Solana network fees and optional token activity can have separate costs. Recheck the published rules when submissions open.'] },
  ], links: [['Install the skill', `${SKILL_URL}#quick-install`], ['Explore DevFridge World', 'https://world.devfridge.cool'], ['Official contact directory', 'https://connect.devfridge.cool']] },
  { slug: 'build', title: 'Build with your agent', intro: 'Reuse the infrastructure. Put your effort into the game only your community could make.', sections: [
    { title: 'Choose a direction', items: ['Arcade & skill: a runner, precision platformer, drift course or survival arena.', 'Social worlds: a community clubhouse, cooperative challenge or exploration game.', 'Puzzle & strategy: a compact repeatable challenge with a fair difficulty curve.', 'Invent your own: another browser game is welcome if the core requirements are met. These are inspiration paths, not separate prize categories.'] },
    { title: 'Keep the first build small', paragraphs: ['Agree on a one-page design: player action, objective, failure state, session length, unlocked benefit and replay hook. Ask the agent to implement one complete loop, then review it before adding features. A polished five-minute experience beats a large unfinished world.'] },
    { title: 'The recommended stack', items: ['Three.js: a readable 3D scene, realistic PBR materials, intentional lighting and optimized textures. React Three Fiber is optional.', 'Phantom: desktop wallet extension and the mobile wallet browser; recover from cancellation, account changes and returning from the background.', 'DevFridge Game Builder skill: discovery, integration references, an exact-amount gate helper and delivery checks.', 'DevFridge SDK/API: discover eligible timelocks; verify authoritative access on your server when protecting sessions, content or rewards.', 'Optional Scan badges, ecosystem discovery and health checks only when they help the game. TopShelf is an advanced, separate Robinhood integration, not a required Solana feature.'] },
    { title: 'A useful agent workflow', items: ['Plan: write acceptance criteria and known limitations.', 'Build: ship small changes and keep secrets out of prompts, commits and client bundles.', 'Review: inspect generated code, dependency changes and asset licences.', 'Test: desktop + physical phone, wallet failures, gate boundaries and the complete gameplay loop.', 'Record: commit the result, update the AI build log and keep a reproducible setup guide.'] },
    { title: 'Build before a token launch', paragraphs: ['Use clearly labelled fixtures or a supported test environment while exploring. Never present mock locks, prices, players or scores as live on-chain data. Do not call a planned token a verified mainnet integration. Before live rollout, verify the exact mint, token program, decimals, extensions and redemption route.'] },
  ], links: [['Game Builder skill and examples', SKILL_URL], ['DevFridge SDK', 'https://sdk.devfridge.cool'], ['Ecosystem map', 'https://ecosystem.devfridge.cool']] },
  { slug: 'timelocks', title: 'Timelocks & community retention', intro: 'Give a community token a use inside a game: a time-bound access commitment.', sections: [
    { title: 'What a DevFridge timelock is', paragraphs: [`A player deposits a supported Solana Token-2022 token into a vault controlled by the DevFridge program (${PROGRAM}) and chooses an unlock time. The vault records the depositor, mint, amount and expiry. The original depositor can redeem after expiry under the program’s rules; there is no early withdrawal.`, 'Games using this stack read timelocks in the existing DevFridge Solana program. Each game defines its supported mint, minimum amount and duration rules. It does not need to deploy its own token vault. A wallet connection alone does not prove that a qualifying lock exists.'] },
    { title: 'The problem it addresses', paragraphs: ['A meme can attract attention without giving holders an ongoing activity. A game turns shared identity into something to do together. A voluntary timelock ties access to a commitment period, while challenges, friends, progress and fresh content give players reasons to use that access.', 'Locked tokens cannot be sold from the vault before expiry. That does not prevent selling other holdings, guarantee retention or make a token’s price rise. The game must be worth returning to; the lock is an access mechanism, not a substitute for fun.'] },
    { title: 'Design an honest access policy', items: ['Show the exact mint, human-readable minimum, lock duration, unlock timestamp and benefit before the user signs.', 'State whether multiple locks of the same mint are summed or one vault must qualify. Never add amounts across different tokens.', 'Define expiry behaviour: when eligibility ends, how progress is preserved and whether practice play remains available.', 'Choose an accessible threshold for your own community. World’s 500,000-token rule and ten-character roster are not hackathon defaults.', 'Never require a token purchase or mainnet deposit just to inspect a submission. Provide a labelled practice mode and a gate demonstration.'] },
    { title: 'Redemption and the 2% service fee', paragraphs: ['The current documented redemption flow charges 2% of redeemed tokens, plus separate network costs. The fee applies on redemption whether the player later sells or keeps the tokens. It is not a tax on every token sale and it does not allow early exit.', 'The fee is used for PASTA buy-and-burn through Jupiter, or direct burning for PASTA. This is the ecosystem’s developer-support model; it is not a direct infrastructure treasury payment or a guarantee of developer income. Non-PASTA redemption needs an executable Jupiter route. A new or illiquid Pump.fun token may not have one: check route availability and explain this limitation before users lock.', 'The exit cost can make repeated entry and redemption less attractive, but it is modest and must be disclosed. Motivate players with a good experience rather than pressure, price promises or hidden fees.'] },
    { title: 'What “verified” does and does not mean', paragraphs: ['A verified build lets people compare deployed bytecode with a reproducible source build. Embedded security.txt metadata describes security contacts and policies. Neither is an independent audit or a guarantee that funds are safe.', 'The program is upgradeable. Review its current authority, source, verification evidence and published security notes. Team checks and on-chain audit records must be described precisely; do not turn them into claims of an independent audit. Do not promise that a lock protects against token price losses.'] },
  ], links: [['Fridge documentation', 'https://docs.devfridge.cool/fridge'], ['Program and security documentation', 'https://docs.devfridge.cool/program'], ['Inspect the program', `https://solscan.io/account/${PROGRAM}`], ['Full skill integration references', SKILL_URL]] },
  { slug: 'integration', title: 'Integration & technical checks', intro: 'A working gate checks evidence. A secure competition also checks identity and gameplay.', sections: [
    { title: 'Verify the token first', paragraphs: ['Use the exact Solana mint, not a symbol or a copied logo. Verify its owning token program, decimals and supported extensions with trusted RPC data. The DevFridge flow documented here uses Token-2022. A Pump.fun link by itself is not proof that a mint is compatible.'] },
    { title: 'Read the published API contract', paragraphs: ['Start with sdk.devfridge.cool and the skill’s sdk-access reference. The published browser SDK exposes DevFridgeSDK; do not invent an npm package. Its check endpoint is https://scan.devfridge.cool/api/sdk/check?wallet=<wallet>&mint=<mint>. Follow the documented response and freshness semantics.', 'For exact amounts, the skill includes a BigInt gate helper. Validate each lock’s depositor, mint, positive raw amount and future expiry. Use verified decimals to convert a displayed threshold to raw units. Recheck when locks partially expire, the wallet changes or the page returns to the foreground.', 'The SDK’s subscription plans use day-based rules; sub-day eligibility and large raw amounts need the exact-policy approach explained in the skill. A stale response or failed request must show unavailable/retry, not silently grant access or report zero holdings. Coalesce requests and back off on rate limits.'] },
    { title: 'Separate three decisions', items: ['Identity: verify a nonce-based, expiring wallet challenge server-side when authentication is needed. Connecting Phantom is not authentication.', 'Eligibility: check fresh DevFridge program evidence for that authenticated wallet and the exact game policy. Client checks are interface feedback.', 'Competition: use server-authoritative gameplay or an appropriately secured verification design for valuable scores. Browser scores and artificially prepared valid replays are not proof of human play. Do not promise perfect anti-cheat.'] },
    { title: 'Required test evidence', items: ['Wrong wallet, wrong mint, insufficient amount and expired locks deny access.', 'Exact threshold passes; partial expiry and multiple-lock policies behave as documented.', 'RPC/API timeout, stale data and 429 responses show a recoverable error without granting access.', 'Wallet rejection, disconnect and account switching clear the previous eligibility.', 'Desktop keyboard/mouse and mobile touch can complete and restart a run.', 'Background/foreground restores controls and audio; overlays do not cover the playable area.', 'A clean checkout can build without embedded credentials or local-only files.'] },
  ], links: [['SDK documentation', 'https://sdk.devfridge.cool'], ['Game Builder references and gate helper', SKILL_URL], ['Service health', 'https://health.devfridge.cool']] },
  { slug: 'rules', title: 'Participation & conduct', intro: 'Build in public with care. Make the work reviewable and the experience welcoming.', sections: [
    { title: 'Preparation rules', paragraphs: ['This is the initial preparation handbook. The gallery uses reviewed GitHub PRs. Competition dates, judges, final eligibility and any prize-specific terms will be published before competition entries open. No prize, grant, token allocation or acceptance is promised by this page.', 'Solo builders and teams may prepare projects now. Disclose pre-existing code, templates and earlier game versions so reviewers can understand what you added. AI assistance is encouraged; identify the tools and review the output yourself.'] },
    { title: 'Project requirements', items: ['Provide a playable browser game with desktop and mobile support, a complete gameplay loop and a distinct community concept.', 'Demonstrate Phantom and DevFridge timelock integration. Label fixtures and incomplete mainnet work honestly.', 'Provide a repository reviewers can access, setup instructions, an immutable commit reference and a brief demo video.', 'Include the access policy, fee and expiry disclosures, test evidence, asset attribution and an AI build log.', 'Make the demo assessable without spending money. A practice mode must be clearly separated from real gated access.'] },
    { title: 'Respect users and other builders', items: ['No harassment, discrimination, impersonation, plagiarism or malicious code.', 'No seed phrase or private-key collection, concealed transfers, deceptive approvals or undisclosed fund movement.', 'Use assets and dependencies you have rights to use; document licences. Publishing code does not waive its existing licence.', 'Do not spam communities or promise investment returns. Do not treat TVL, token price or buying volume as a judging criterion.', 'Report security issues privately through the project’s published security policy. Use the official DevFridge contact directory for organizer questions.'] },
    { title: 'Ownership, privacy and affiliations', paragraphs: ['Creators retain rights to their work, subject to existing licences. Make the review permissions and third-party licences clear. Reusing the live DevFridge program is different from relicensing or redeploying its source; check repository terms.', 'Use test wallets and redacted logs in demos. Wallet addresses and blockchain activity may be public; never submit secrets or unnecessary personal data. This preparation site does not collect application forms.', 'This is a DevFridge initiative. Mentioning Solana, Pump.fun, Phantom or coding agents describes compatible tools and audiences, not an announced sponsorship or partnership.'] },
  ], links: [['Official contacts', 'https://connect.devfridge.cool'], ['DevFridge source and security policy', 'https://github.com/mikeminer/devfridge']] },
  { slug: 'judging', title: 'Evaluation rubric', intro: 'A published 100-point preparation rubric. Build quality and player experience come first.', sections: [
    { title: 'How projects will be assessed', paragraphs: ['This rubric helps you prepare a balanced submission. The judging panel, judging dates, tie-break procedure and final event terms will be announced before submissions open. It does not announce winners or prizes.'] },
    { title: '30 points · Playability & craft', items: ['A complete, enjoyable loop with clear controls, feedback and a reason to replay.', 'Readable art direction, purposeful 3D materials and consistent performance.', 'Polish of the actual playable build, not just the pitch or screenshots.'] },
    { title: '25 points · DevFridge integration', items: ['Correct wallet, mint, amount, duration and expiry checks.', 'Clear distinction between mock demonstration and real program evidence.', 'Honest onboarding, fee disclosure and recoverable wallet/network failures.'] },
    { title: '20 points · Community usefulness', items: ['A specific audience and a meaningful role for its token.', 'An enjoyable retention loop with fair access rules and no price promises.', 'Distinctive world, social interaction or recurring challenges that fit the community.'] },
    { title: '15 points · Desktop & mobile delivery', items: ['Touch controls, responsive UI and a complete run on a physical phone.', 'Phantom flow, audio recovery and background handling.', 'Accessible instructions, readable text and usable loading/error states.'] },
    { title: '10 points · Agentic process & reproducibility', items: ['A concise build log explaining prompts, agent contributions and human review.', 'Clean setup, pinned dependencies, relevant tests and disclosed limitations.', 'Traceable sources and licensed assets.'] },
    { title: 'Safety is a prerequisite', paragraphs: ['Missing wallet safety, malicious behaviour, plagiarism or misleading financial claims cannot be offset by a high visual score. Reviewers should record blocking issues separately from points. Token price, market cap, deposits and trading volume earn no points.'] },
  ], links: [['Submission checklist', '/handbook/submission'], ['Integration checks', '/handbook/integration']] },
  { slug: 'submission', title: 'Submit with your agent', intro: 'Make it easy for someone else to play, inspect and reproduce your game.', sections: [
    { title: 'No Git experience needed', paragraphs: ['Ask the Game Builder skill: Prepare and submit my game to the hackathon gallery. Handle the GitHub workflow for me and ask only for missing decisions. Your agent prepares evidence and the registry file, validates it, creates or reuses your fork, opens the PR and helps resolve feedback. If needed, it guides you through GitHub sign-in without asking for a password or access token.'] },
    { title: 'Review and publication', paragraphs: ['The submission target is mikeminer/devfridge, branch master. Each game adds one metadata file at scan/data/hackathon-projects/<slug>.json. Its source and playable demo stay in your own repository and hosting. Your agent follows the repository template and validates the file before opening a PR.', 'The owner reviews the game, evidence and ownership. A reviewed merge triggers the production build, which automatically adds the card to the gallery. Approval alone is not publication: merge and deployment must succeed. Your agent reports the real PR link and status. Dates, prizes and final competition eligibility remain to be announced; a listing is not a prize or an audit.'] },
    { title: 'Your project package', items: ['Name, one-sentence pitch, team aliases and your chosen public contact.', 'Playable HTTPS URL and repository URL with the reviewed commit hash.', 'Short gameplay video showing desktop, mobile and the real/labelled gate flow.', 'Exact Solana mint, token program, network, launch status and supported extensions—or an explicit pre-launch fixture declaration.', 'Minimum amount, duration and aggregation policy, expiry behaviour, redemption disclosures and known routing limitations.', 'Setup commands, environment-variable names without values, asset licences and dependency notes.', 'AI tools used, prompt/build log, human review notes and a summary of what existed before this project.', 'Test evidence, device/browser details, security limitations and what remains unfinished.'] },
    { title: 'Suggested demo sequence', items: ['Explain the community and game loop in one sentence.', 'Play a complete run, show the result and restart.', 'Show the access policy and fee disclosure, then a qualifying and non-qualifying gate state.', 'Demonstrate the mobile layout and wallet cancellation recovery.', 'Show the relevant code, test results and one honest limitation.'] },
    { title: 'Final self-review', paragraphs: ['Open your URL in a fresh browser. Can a reviewer understand and try the game without buying tokens? Can a new developer reproduce it from the specified commit? Are all simulation labels visible? Confirm that no private keys, API secrets or personal records are included.'] },
  ], links: [['Guided submission prompt', `${SKILL_URL}#submit`], ['Repository submission and owner guide', 'https://github.com/mikeminer/devfridge/blob/master/docs/hackathon/README.md'], ['Playable projects', '/projects'], ['Download submission template', '/kit/submission.md'], ['Download AI build log', '/kit/build-log.md'], ['Download review scorecard', '/kit/scorecard.md']] },
  { slug: 'faq', title: 'Frequently asked questions', intro: 'The practical answers before you start building.', sections: [
    { title: 'Do I need a Pump.fun token already?', paragraphs: ['No. Start with a concept and labelled fixtures. If you use a live token, verify the exact Solana mint and DevFridge compatibility before admitting real locks. A launch is not a guarantee of compatibility or liquidity.'] },
    { title: 'Do I have to use World’s characters or buy PASTA?', paragraphs: ['No. Build for your own community with assets you can legally use. Your game selects its own compatible mint and access policy. The preparation kit does not require buying PASTA or using World’s ten character tokens.'] },
    { title: 'Do all games share the same Solana program?', paragraphs: ['Games using DevFridge timelock gating read locks held by the existing DevFridge Solana program. Their worlds, mints and eligibility rules can differ. Reusing a program does not automatically grant access across every game.'] },
    { title: 'Is the skill mandatory?', paragraphs: ['It is the recommended starting point, with prompts, integration references and delivery checks. You may implement directly against the documented stack, but must meet the same integration and safety requirements. Using more AI tools does not automatically earn more points.'] },
    { title: 'Does a timelock stop dumping or guarantee rewards?', paragraphs: ['It prevents withdrawal of that deposit before expiry. It does not control other holdings, guarantee a price, prove a player is human or promise rewards. Retention comes from a game people enjoy and a transparent access commitment.'] },
    { title: 'Is it all free?', paragraphs: ['The skill and preparation materials are free. There are no announced entry fees. Your AI, hosting and RPC services may charge fees. Optional on-chain use incurs network fees and the documented 2% redemption service fee.'] },
    { title: 'Can I add leaderboards and rewards?', paragraphs: ['Yes as a project feature, with an honest threat model and appropriate server-side verification. The client cannot be the authority for valuable scores. TopShelf currently belongs to the separate Robinhood part of the ecosystem; it is optional and not an automatic Solana reward service.'] },
    { title: 'Where do I register? What are the dates and prizes?', paragraphs: ['Your agent can submit a gallery project through a PR to mikeminer/devfridge. Ask the skill to handle preparation, GitHub and review feedback for you. The owner reviews and merges projects; successful deployment publishes them. Competition dates, prizes and final eligibility remain to be announced.'] },
  ], links: [['Start with the skill', SKILL_URL], ['Official contacts', 'https://connect.devfridge.cool']] },
];

export const SUBMISSION_TEMPLATE = `# DevFridge Hackathon — Project submission draft

Status: Gallery submission via an agent-guided PR to mikeminer/devfridge:master. Dates, prizes and final competition eligibility to be announced.
Guide: https://hackathon.devfridge.cool/handbook/submission
Your agent creates scan/data/hackathon-projects/<slug>.json from the repository template, validates it and opens the PR. Owner review + merge + successful deployment publish the card.

## Project
- Name:
- One-sentence pitch:
- Team aliases and public contact:
- Playable HTTPS URL:
- Repository URL and commit hash:
- Demo video URL:
- Community and core gameplay loop:

## Solana and DevFridge
- Network and exact token mint (or labelled pre-launch fixture):
- Token program, verified decimals and extensions:
- Minimum raw and displayed amount:
- Original/remaining duration requirements and expiry behaviour:
- Single-lock or sum-of-same-mint policy:
- Real evidence vs mock data:
- Wallet authentication and authoritative access design:
- Redemption fee disclosure and Jupiter-route limitations:

## Reproduce and review
- Clean setup/build/run commands:
- Environment variable names ONLY:
- Desktop and real mobile devices tested:
- Wallet/gate/failure-path test evidence:
- Score verification design (if applicable):
- Pre-existing work and new contributions:
- AI tools, build log and human review:
- Asset/dependency licences:
- Known issues and unfinished features:
- Practice mode instructions (no purchase required):
`;
export const BUILD_LOG = `# AI build log

Repeat for each meaningful iteration. Never include secrets or private wallet data.

## Iteration / date
- Goal and acceptance criteria:
- Agent and model/tool used:
- Skill version and source:
- Prompt or prompt summary:
- Files/behaviour changed:
- Human review and corrections:
- Tests run and results:
- Desktop/mobile evidence:
- Remaining limitations:
- Commit:
`;
export const SCORECARD = `# DevFridge Hackathon — Preparation scorecard

Project / commit:
Reviewer / date:
Blocking safety or eligibility issues:

| Criterion | Maximum | Score | Evidence |
|---|---:|---:|---|
| Playability & craft | 30 | | |
| DevFridge integration | 25 | | |
| Community usefulness | 20 | | |
| Desktop & mobile delivery | 15 | | |
| Agentic process & reproducibility | 10 | | |
| Total | 100 | | |

Strengths:
Required fixes:
Unverified claims / limitations:

Preparation rubric only. Judges, dates, tie-breaks and final event terms are to be announced.
`;
export function handbookMarkdown() {
  return '# DevFridge Hackathon — Builder handbook\n\nGallery submissions: agent-guided GitHub PRs. Dates, prizes and final competition eligibility: to be announced.\n\n' + CHAPTERS.map(c => `## ${c.title}\n\n${c.intro}\n\n` + c.sections.map(s => `### ${s.title}\n\n${(s.paragraphs || []).join('\n\n')}${s.paragraphs ? '\n\n' : ''}${(s.items || []).map(i => '- ' + i).join('\n')}\n`).join('\n') + '\n' + c.links.map(([label, href]) => `[${label}](${href.startsWith('/') ? HACKATHON_ORIGIN + href : href})`).join(' · ')).join('\n\n---\n\n');
}
