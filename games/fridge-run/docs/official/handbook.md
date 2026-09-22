# DevFridge Hackathon — Builder handbook

Dates, prizes and submissions: to be announced.

## Start here

One meme. One playable world. Build with your coding agent and the DevFridge stack.

### Who this is for

Solana developers, Pump.fun creators, artists and community builders who already have a token or are planning one. Work solo or as a team. You can start with a concept: launching or buying a token is not required to begin building.



### The challenge

Create a browser game with a complete play → result → replay loop, a community identity and a clear reason to return. Make it work on desktop and mobile. Use Phantom for wallet access and DevFridge timelocks to unlock a meaningful part of the experience.

Agentic coding means using an AI agent to plan, implement and test with you. You remain responsible for the code, dependencies, asset rights and claims. Record what the agent did and what you verified.



### Your first session

- Install the DevFridge Game Builder skill using the prompt on the home page.
- Answer the skill’s discovery questions: game loop, exact mint or pre-launch status, access policy.
- Build one small playable scene before expanding the world.
- Add a labelled practice mode and then real wallet + timelock verification.
- Test on a real phone and desktop. Save the evidence in your build log.

### Event status

The preparation kit is available now. Event dates, submission opening and deadline, judges, awards and prizes are to be announced. This site does not yet accept entries or register participants. Starting a project now does not reserve a place or guarantee eligibility for future prizes.

There is no hackathon entry fee announced. The skill download is free. AI tools, hosting, RPC usage, Solana network fees and optional token activity can have separate costs. Recheck the published rules when submissions open.



[Install the skill](https://world.devfridge.cool/skill#quick-install) · [Explore DevFridge World](https://world.devfridge.cool) · [Official contact directory](https://connect.devfridge.cool)

---

## Build with your agent

Reuse the infrastructure. Put your effort into the game only your community could make.

### Choose a direction

- Arcade & skill: a runner, precision platformer, drift course or survival arena.
- Social worlds: a community clubhouse, cooperative challenge or exploration game.
- Puzzle & strategy: a compact repeatable challenge with a fair difficulty curve.
- Invent your own: another browser game is welcome if the core requirements are met. These are inspiration paths, not separate prize categories.

### Keep the first build small

Agree on a one-page design: player action, objective, failure state, session length, unlocked benefit and replay hook. Ask the agent to implement one complete loop, then review it before adding features. A polished five-minute experience beats a large unfinished world.



### The recommended stack

- Three.js: a readable 3D scene, realistic PBR materials, intentional lighting and optimized textures. React Three Fiber is optional.
- Phantom: desktop wallet extension and the mobile wallet browser; recover from cancellation, account changes and returning from the background.
- DevFridge Game Builder skill: discovery, integration references, an exact-amount gate helper and delivery checks.
- DevFridge SDK/API: discover eligible timelocks; verify authoritative access on your server when protecting sessions, content or rewards.
- Optional Scan badges, ecosystem discovery and health checks only when they help the game. TopShelf is an advanced, separate Robinhood integration, not a required Solana feature.

### A useful agent workflow

- Plan: write acceptance criteria and known limitations.
- Build: ship small changes and keep secrets out of prompts, commits and client bundles.
- Review: inspect generated code, dependency changes and asset licences.
- Test: desktop + physical phone, wallet failures, gate boundaries and the complete gameplay loop.
- Record: commit the result, update the AI build log and keep a reproducible setup guide.

### Build before a token launch

Use clearly labelled fixtures or a supported test environment while exploring. Never present mock locks, prices, players or scores as live on-chain data. Do not call a planned token a verified mainnet integration. Before live rollout, verify the exact mint, token program, decimals, extensions and redemption route.



[Game Builder skill and examples](https://world.devfridge.cool/skill) · [DevFridge SDK](https://sdk.devfridge.cool) · [Ecosystem map](https://ecosystem.devfridge.cool)

---

## Timelocks & community retention

Give a community token a use inside a game: a time-bound access commitment.

### What a DevFridge timelock is

A player deposits a supported Solana Token-2022 token into a vault controlled by the DevFridge program (9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6) and chooses an unlock time. The vault records the depositor, mint, amount and expiry. The original depositor can redeem after expiry under the program’s rules; there is no early withdrawal.

Games using this stack read timelocks in the existing DevFridge Solana program. Each game defines its supported mint, minimum amount and duration rules. It does not need to deploy its own token vault. A wallet connection alone does not prove that a qualifying lock exists.



### The problem it addresses

A meme can attract attention without giving holders an ongoing activity. A game turns shared identity into something to do together. A voluntary timelock ties access to a commitment period, while challenges, friends, progress and fresh content give players reasons to use that access.

Locked tokens cannot be sold from the vault before expiry. That does not prevent selling other holdings, guarantee retention or make a token’s price rise. The game must be worth returning to; the lock is an access mechanism, not a substitute for fun.



### Design an honest access policy

- Show the exact mint, human-readable minimum, lock duration, unlock timestamp and benefit before the user signs.
- State whether multiple locks of the same mint are summed or one vault must qualify. Never add amounts across different tokens.
- Define expiry behaviour: when eligibility ends, how progress is preserved and whether practice play remains available.
- Choose an accessible threshold for your own community. World’s 500,000-token rule and ten-character roster are not hackathon defaults.
- Never require a token purchase or mainnet deposit just to inspect a submission. Provide a labelled practice mode and a gate demonstration.

### Redemption and the 2% service fee

The current documented redemption flow charges 2% of redeemed tokens, plus separate network costs. The fee applies on redemption whether the player later sells or keeps the tokens. It is not a tax on every token sale and it does not allow early exit.

The fee is used for PASTA buy-and-burn through Jupiter, or direct burning for PASTA. This is the ecosystem’s developer-support model; it is not a direct infrastructure treasury payment or a guarantee of developer income. Non-PASTA redemption needs an executable Jupiter route. A new or illiquid Pump.fun token may not have one: check route availability and explain this limitation before users lock.

The exit cost can make repeated entry and redemption less attractive, but it is modest and must be disclosed. Motivate players with a good experience rather than pressure, price promises or hidden fees.



### What “verified” does and does not mean

A verified build lets people compare deployed bytecode with a reproducible source build. Embedded security.txt metadata describes security contacts and policies. Neither is an independent audit or a guarantee that funds are safe.

The program is upgradeable. Review its current authority, source, verification evidence and published security notes. Team checks and on-chain audit records must be described precisely; do not turn them into claims of an independent audit. Do not promise that a lock protects against token price losses.



[Fridge documentation](https://docs.devfridge.cool/fridge) · [Program and security documentation](https://docs.devfridge.cool/program) · [Inspect the program](https://solscan.io/account/9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6) · [Full skill integration references](https://world.devfridge.cool/skill)

---

## Integration & technical checks

A working gate checks evidence. A secure competition also checks identity and gameplay.

### Verify the token first

Use the exact Solana mint, not a symbol or a copied logo. Verify its owning token program, decimals and supported extensions with trusted RPC data. The DevFridge flow documented here uses Token-2022. A Pump.fun link by itself is not proof that a mint is compatible.



### Read the published API contract

Start with sdk.devfridge.cool and the skill’s sdk-access reference. The published browser SDK exposes DevFridgeSDK; do not invent an npm package. Its check endpoint is https://scan.devfridge.cool/api/sdk/check?wallet=<wallet>&mint=<mint>. Follow the documented response and freshness semantics.

For exact amounts, the skill includes a BigInt gate helper. Validate each lock’s depositor, mint, positive raw amount and future expiry. Use verified decimals to convert a displayed threshold to raw units. Recheck when locks partially expire, the wallet changes or the page returns to the foreground.

The SDK’s subscription plans use day-based rules; sub-day eligibility and large raw amounts need the exact-policy approach explained in the skill. A stale response or failed request must show unavailable/retry, not silently grant access or report zero holdings. Coalesce requests and back off on rate limits.



### Separate three decisions

- Identity: verify a nonce-based, expiring wallet challenge server-side when authentication is needed. Connecting Phantom is not authentication.
- Eligibility: check fresh DevFridge program evidence for that authenticated wallet and the exact game policy. Client checks are interface feedback.
- Competition: use server-authoritative gameplay or an appropriately secured verification design for valuable scores. Browser scores and artificially prepared valid replays are not proof of human play. Do not promise perfect anti-cheat.

### Required test evidence

- Wrong wallet, wrong mint, insufficient amount and expired locks deny access.
- Exact threshold passes; partial expiry and multiple-lock policies behave as documented.
- RPC/API timeout, stale data and 429 responses show a recoverable error without granting access.
- Wallet rejection, disconnect and account switching clear the previous eligibility.
- Desktop keyboard/mouse and mobile touch can complete and restart a run.
- Background/foreground restores controls and audio; overlays do not cover the playable area.
- A clean checkout can build without embedded credentials or local-only files.

[SDK documentation](https://sdk.devfridge.cool) · [Game Builder references and gate helper](https://world.devfridge.cool/skill) · [Service health](https://health.devfridge.cool)

---

## Participation & conduct

Build in public with care. Make the work reviewable and the experience welcoming.

### Preparation rules

This is the initial preparation handbook. Dates, submission channel, judges, final eligibility and any prize-specific terms will be published before entries open. No prize, grant, token allocation or acceptance is promised by this page.

Solo builders and teams may prepare projects now. Disclose pre-existing code, templates and earlier game versions so reviewers can understand what you added. AI assistance is encouraged; identify the tools and review the output yourself.



### Project requirements

- Provide a playable browser game with desktop and mobile support, a complete gameplay loop and a distinct community concept.
- Demonstrate Phantom and DevFridge timelock integration. Label fixtures and incomplete mainnet work honestly.
- Provide a repository reviewers can access, setup instructions, an immutable commit reference and a brief demo video.
- Include the access policy, fee and expiry disclosures, test evidence, asset attribution and an AI build log.
- Make the demo assessable without spending money. A practice mode must be clearly separated from real gated access.

### Respect users and other builders

- No harassment, discrimination, impersonation, plagiarism or malicious code.
- No seed phrase or private-key collection, concealed transfers, deceptive approvals or undisclosed fund movement.
- Use assets and dependencies you have rights to use; document licences. Publishing code does not waive its existing licence.
- Do not spam communities or promise investment returns. Do not treat TVL, token price or buying volume as a judging criterion.
- Report security issues privately through the project’s published security policy. Use the official DevFridge contact directory for organizer questions.

### Ownership, privacy and affiliations

Creators retain rights to their work, subject to existing licences. Make the review permissions and third-party licences clear. Reusing the live DevFridge program is different from relicensing or redeploying its source; check repository terms.

Use test wallets and redacted logs in demos. Wallet addresses and blockchain activity may be public; never submit secrets or unnecessary personal data. This preparation site does not collect application forms.

This is a DevFridge initiative. Mentioning Solana, Pump.fun, Phantom or coding agents describes compatible tools and audiences, not an announced sponsorship or partnership.



[Official contacts](https://connect.devfridge.cool) · [DevFridge source and security policy](https://github.com/mikeminer/devfridge)

---

## Evaluation rubric

A published 100-point preparation rubric. Build quality and player experience come first.

### How projects will be assessed

This rubric helps you prepare a balanced submission. The judging panel, judging dates, tie-break procedure and final event terms will be announced before submissions open. It does not announce winners or prizes.



### 30 points · Playability & craft

- A complete, enjoyable loop with clear controls, feedback and a reason to replay.
- Readable art direction, purposeful 3D materials and consistent performance.
- Polish of the actual playable build, not just the pitch or screenshots.

### 25 points · DevFridge integration

- Correct wallet, mint, amount, duration and expiry checks.
- Clear distinction between mock demonstration and real program evidence.
- Honest onboarding, fee disclosure and recoverable wallet/network failures.

### 20 points · Community usefulness

- A specific audience and a meaningful role for its token.
- An enjoyable retention loop with fair access rules and no price promises.
- Distinctive world, social interaction or recurring challenges that fit the community.

### 15 points · Desktop & mobile delivery

- Touch controls, responsive UI and a complete run on a physical phone.
- Phantom flow, audio recovery and background handling.
- Accessible instructions, readable text and usable loading/error states.

### 10 points · Agentic process & reproducibility

- A concise build log explaining prompts, agent contributions and human review.
- Clean setup, pinned dependencies, relevant tests and disclosed limitations.
- Traceable sources and licensed assets.

### Safety is a prerequisite

Missing wallet safety, malicious behaviour, plagiarism or misleading financial claims cannot be offset by a high visual score. Reviewers should record blocking issues separately from points. Token price, market cap, deposits and trading volume earn no points.



[Submission checklist](https://hackathon.devfridge.cool/handbook/submission) · [Integration checks](https://hackathon.devfridge.cool/handbook/integration)

---

## Prepare your submission

Make it easy for someone else to play, inspect and reproduce your game.

### Submission status

The submission window and destination are to be announced. Downloading a template, copying a prompt or sharing a build is not an official entry. Prepare the following package now; this page will identify the submission channel when it opens.



### Your project package

- Name, one-sentence pitch, team aliases and your chosen public contact.
- Playable HTTPS URL and repository URL with the reviewed commit hash.
- Short gameplay video showing desktop, mobile and the real/labelled gate flow.
- Exact Solana mint, token program, network, launch status and supported extensions—or an explicit pre-launch fixture declaration.
- Minimum amount, duration and aggregation policy, expiry behaviour, redemption disclosures and known routing limitations.
- Setup commands, environment-variable names without values, asset licences and dependency notes.
- AI tools used, prompt/build log, human review notes and a summary of what existed before this project.
- Test evidence, device/browser details, security limitations and what remains unfinished.

### Suggested demo sequence

- Explain the community and game loop in one sentence.
- Play a complete run, show the result and restart.
- Show the access policy and fee disclosure, then a qualifying and non-qualifying gate state.
- Demonstrate the mobile layout and wallet cancellation recovery.
- Show the relevant code, test results and one honest limitation.

### Final self-review

Open your URL in a fresh browser. Can a reviewer understand and try the game without buying tokens? Can a new developer reproduce it from the specified commit? Are all simulation labels visible? Confirm that no private keys, API secrets or personal records are included.



[Download submission template](https://hackathon.devfridge.cool/kit/submission.md) · [Download AI build log](https://hackathon.devfridge.cool/kit/build-log.md) · [Download review scorecard](https://hackathon.devfridge.cool/kit/scorecard.md)

---

## Frequently asked questions

The practical answers before you start building.

### Do I need a Pump.fun token already?

No. Start with a concept and labelled fixtures. If you use a live token, verify the exact Solana mint and DevFridge compatibility before admitting real locks. A launch is not a guarantee of compatibility or liquidity.



### Do I have to use World’s characters or buy PASTA?

No. Build for your own community with assets you can legally use. Your game selects its own compatible mint and access policy. The preparation kit does not require buying PASTA or using World’s ten character tokens.



### Do all games share the same Solana program?

Games using DevFridge timelock gating read locks held by the existing DevFridge Solana program. Their worlds, mints and eligibility rules can differ. Reusing a program does not automatically grant access across every game.



### Is the skill mandatory?

It is the recommended starting point, with prompts, integration references and delivery checks. You may implement directly against the documented stack, but must meet the same integration and safety requirements. Using more AI tools does not automatically earn more points.



### Does a timelock stop dumping or guarantee rewards?

It prevents withdrawal of that deposit before expiry. It does not control other holdings, guarantee a price, prove a player is human or promise rewards. Retention comes from a game people enjoy and a transparent access commitment.



### Is it all free?

The skill and preparation materials are free. There are no announced entry fees. Your AI, hosting and RPC services may charge fees. Optional on-chain use incurs network fees and the documented 2% redemption service fee.



### Can I add leaderboards and rewards?

Yes as a project feature, with an honest threat model and appropriate server-side verification. The client cannot be the authority for valuable scores. TopShelf currently belongs to the separate Robinhood part of the ecosystem; it is optional and not an automatic Solana reward service.



### Where do I register? What are the dates and prizes?

They are to be announced. There is no registration or submission form yet. Use this site to prepare and return for official event details. Organizer contacts are listed in the DevFridge directory.



[Start with the skill](https://world.devfridge.cool/skill) · [Official contacts](https://connect.devfridge.cool)