# Use the vendored game studio

Reviewed **2026-10-30**. The pinned snapshot is [Claude Code Game Studios 1.2.0](../vendor/claude-code-game-studios/README.md), commit `05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418`. Load this page before any file in that directory. Load only the one role or workflow needed for the current step.

The studio supplies roles, design method and review checklists. It does not replace this skill's discovery, subscription, wallet, advertisement or release gates, and it does not choose the engine.

## What stays in force

Resolve these with the DevFridge guides, even when a studio file asks a different question or tells you to stop:

| Decision or gate | DevFridge source |
| --- | --- |
| Browser, Seeker app or both, and APK content | [SKILL.md](../SKILL.md), [Android delivery](seeker-android.md) |
| Game Room, only for a web path | [Game Room](game-room.md) |
| RPC, Token-2022 mint, domain, subscription prices, free scope | [Discovery](discovery.md), [subscription](season-pass.md) |
| Optional market and each Free Play placement | [Market](in-game-market.md), [Free Play](free-play-sponsors.md) |
| Three.js scene, materials, characters, feel | [Gamedev skills](gamedev-skills.md), [delivery](game-delivery.md), [visual realism](visual-realism.md) |
| Wallet trust, RPC, performance, Store, delivery | [Wallet trust](wallet-trust.md), [performance](performance-and-capture.md), [updates](release-updates.md) |

An unanswered DevFridge choice still waits. A choice the owner already made is not asked again. After those choices, implement the approved game. Do not add the studio's ask-before-every-file-edit stop, and do not treat a skipped studio question as a reason to halt a build the owner already requested.

## What not to install

Do not clone the studio as the game. Do not copy `project.yaml`, `CLAUDE.md`, `settings.json`, hooks or scripts into the game repository. Do not create `.claude/hooks`, `.claude/scripts` or a Godot `src/` tree to satisfy a path written inside a vendored file.

The bash helpers and Claude Code settings were left upstream on purpose. When a skill says to run `.claude/scripts/*.sh`, `hooks/yaml-helper.sh` or a Godot parse command, skip that command. Read the vendored checklist for its intent, then use the game's typecheck, build, tests and the DevFridge evidence tools. A missing studio script is not a blocker.

`/start`, `/setup-engine` and `/settings` are not run. This skill already chose Three.js for Browser, Seeker or both. Godot, Unity and Unreal notes under `studio-docs/engine-reference/` identify those engines for readers. They do not authorize a migration. If the owner explicitly wants a different engine, stop and say this package builds Three.js; do not switch silently.

Do not fan out the 49 roles or the `team-*` workflows unless the owner asks for that review. One session reads the single relevant role and does the work. Ignore `model:` pins in agent frontmatter and use the session model. `disable-model-invocation` in a vendored skill only means Claude Code would not auto-run that slash command. Here the file is a reference the adapter tells you to read.

Do not let `economy-designer`, `live-ops-designer` or a studio economy template set token amounts, prices, burn claims or a battle pass. Subscription plans and SOL prices come from the owner. Do not let `security-audit` or `release-checklist` replace wallet trust, the 50 FPS gate or Store submission rules. Use them only as extra checklists, and keep DevFridge's block when they disagree.

## Default path

Upstream measured four games from one brief. At `minimal` rigor the studio wrote one page before code. At `standard` it wrote 30 pages and took 58 minutes, and blind review plus a human playtest ranked that build last. This skill therefore uses **minimal** unless the owner asks for `standard` or `full`.

1. Finish DevFridge discovery. Record platform, APK architecture when needed, Game Room when it applies, RPC, mint, domain, subscription prices, free scope, market and both ad choices.
2. If the core loop is still vague, read [brainstorm](../vendor/claude-code-game-studios/skills/brainstorm/SKILL.md) and write one short gameplay brief: verb, camera, fail state, restart and what a pass opens. Do not author the full GDD set. For a small change, read [quick-design](../vendor/claude-code-game-studios/skills/quick-design/SKILL.md) instead of [design-system](../vendor/claude-code-game-studios/skills/design-system/SKILL.md).
3. Implement that loop in the game's existing Three.js source. Read [dev-story](../vendor/claude-code-game-studios/skills/dev-story/SKILL.md) for its implementation and "run and look" standard, not for its story-file, sprint-file or bash phases. Missing `production/epics/` files do not stop the build. Follow [incremental checkpoints](incremental-build.md): one working loop, then small tested steps.
4. Before calling a player-visible change done, launch the game, look at the affected screen and keep the evidence the DevFridge guide for that surface requires. Read [run and observe](../vendor/claude-code-game-studios/docs/run-and-observe.md). A parse check or a green unit test is not that look. Map the studio's screenshot note to the game's real capture path and, at release, to [performance and capture](performance-and-capture.md).
5. Read [story-done](../vendor/claude-code-game-studios/skills/story-done/SKILL.md) only for its completion questions: criteria met, what was observed, what is still broken. DevFridge verification, not the studio's phase machine, closes the step.

The role index is [agent-roster.md](../vendor/claude-code-game-studios/docs/agent-roster.md). The workflow index is [skills-reference.md](../vendor/claude-code-game-studios/docs/skills-reference.md). Rigor definitions are in [workflow-modes.md](../vendor/claude-code-game-studios/docs/workflow-modes.md).

## Who to read for the current task

| Current task | Read next |
| --- | --- |
| Loop, verbs, fail and restart | [game-designer](../vendor/claude-code-game-studios/agents/game-designer.md), then implement |
| Gameplay code | [gameplay-programmer](../vendor/claude-code-game-studios/agents/gameplay-programmer.md) and the Three.js skill from [gamedev-skills](gamedev-skills.md) |
| HUD, menus, touch targets | [ux-design](../vendor/claude-code-game-studios/skills/ux-design/SKILL.md) and [ui-programmer](../vendor/claude-code-game-studios/agents/ui-programmer.md) |
| Style, materials, character direction | [art-bible](../vendor/claude-code-game-studios/skills/art-bible/SKILL.md), [asset-spec](../vendor/claude-code-game-studios/skills/asset-spec/SKILL.md), then [3D assets](3d-assets-and-characters.md) |
| Level pacing | [level-designer](../vendor/claude-code-game-studios/agents/level-designer.md) |
| Audio direction | [audio-director](../vendor/claude-code-game-studios/agents/audio-director.md), then [sound](sound-prompts.md) and [music](music-prompts.md) |
| A change the player can see | [run and observe](../vendor/claude-code-game-studios/docs/run-and-observe.md) |
| Code structure of a finished slice | [code-review](../vendor/claude-code-game-studios/skills/code-review/SKILL.md) |
| Test plan for a feature | [qa-plan](../vendor/claude-code-game-studios/skills/qa-plan/SKILL.md) and [qa-lead](../vendor/claude-code-game-studios/agents/qa-lead.md) |
| Frame budget | [perf-profile](../vendor/claude-code-game-studios/skills/perf-profile/SKILL.md) and [performance capture](performance-and-capture.md) |
| Release readiness | [release-checklist](../vendor/claude-code-game-studios/skills/release-checklist/SKILL.md) after the DevFridge release gates |

## When the owner asks for a heavier studio

`standard` or `full` adds GDD sections, ADRs and story files. Put those documents in the game repository only after the owner asks for that rigor. Keep them beside the code as design notes. Still do not install hooks, still do not block the first playable loop on a complete document set, and still run DevFridge discovery and release checks unchanged. [create-architecture](../vendor/claude-code-game-studios/skills/create-architecture/SKILL.md), [create-stories](../vendor/claude-code-game-studios/skills/create-stories/SKILL.md) and [gate-check](../vendor/claude-code-game-studios/skills/gate-check/SKILL.md) are the references for that heavier pass. A studio gate result of PASS does not release a build that fails wallet trust, the FPS gate or an unanswered owner choice.
