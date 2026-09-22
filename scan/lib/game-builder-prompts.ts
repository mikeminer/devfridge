// One copy source for the skill landing page and hackathon onboarding.
export const INSTALL_PROMPT = `Help me build a Solana community game with DevFridge and prepare it for the DevFridge hackathon showcase. I do not need to know Git: guide me through decisions and handle the technical work.

Read https://hackathon.devfridge.cool/llms.txt and its linked handbook first.
Install the official DevFridge Game Builder skill from:
https://world.devfridge.cool/world/skill/downloads/devfridge-game-builder.zip
Verify its SHA-256 using https://world.devfridge.cool/world/skill/downloads/manifest.json, inspect SKILL.md and the archive, and extract only inside the destination directory.
Use .agents/skills/devfridge-game-builder/ for Codex, .claude/skills/devfridge-game-builder/ for Claude Code, or your agent's documented skill directory. Preserve existing customized files and ask before replacing them. Keep all references, assets and agents files. If installation is unavailable, explain manual steps instead of claiming success.

Load the skill. Ask me up to three questions: the game and community I want to build for; my exact Solana token mint (or whether it is not launched yet); and my intended timelock access rules.
Create a playable Three.js browser game for desktop and mobile with Phantom and DevFridge timelock gating. Start with a clearly labelled practice mode if there is no verified mint. Use realistic materials, an original art direction and touch controls. Keep wallet authentication, token eligibility and score verification separate.
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
