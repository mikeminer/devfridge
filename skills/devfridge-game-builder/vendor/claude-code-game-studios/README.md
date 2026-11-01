# Claude Code Game Studios — vendored snapshot

Source: [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) release **1.2.0**, commit **05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418** (2026-10-19), retrieved and verified **2026-10-30**.

License: [MIT](LICENSE). Copyright (c) 2026 Donchitos. The license file is the upstream file, unchanged.

This directory is build-time knowledge for the DevFridge Game Builder. It is not a game template and it is not installed into the game repository. Load it through [the DevFridge studio adapter](../../references/game-studio.md).

## What was copied

437 upstream files, checked byte-for-byte against that commit's git blobs. Local content modifications: none. This README is packaging documentation, not an upstream file.

| Upstream path | Path in this package | Contents |
| --- | --- | --- |
| `.claude/agents/` | `agents/` | 49 role definitions |
| `.claude/skills/` | `skills/` | 74 workflow skills and their references |
| `.claude/rules/` | `rules/` | 14 path-scoped coding standards |
| `.claude/docs/` | `docs/` | Roster, skill index, workflow catalog, templates, coordination notes |
| `design/` | `design/` | Upstream design-registry notes |
| `docs/` | `studio-docs/` | Workflow guide and Godot, Unity and Unreal reference notes |
| `CLAUDE.md`, `project.yaml` | same names | Upstream session notes and the unconfigured project example |

Upstream paths inside those files still say `.claude/` and `docs/`. Read them here at the mapped paths above. Do not create a `.claude/` tree in the game to make those paths true.

## What was left upstream

These files are part of the Claude Code template and are not in this package:

- `.claude/hooks/` and `.claude/scripts/` — bash helpers for Claude Code hook events and for reading `project.yaml`
- `.claude/settings.json` — Claude Code permissions and hook wiring
- `src/`, `production/` and `studio-tests/` — an empty engine stub, production placeholders, and tests of the studio framework
- `.github/`, `CHANGELOG.md`, `UPGRADING.md`, `CONTRIBUTING.md`, `SECURITY.md` and the upstream README

When a vendored skill tells the agent to run one of those scripts, follow the adapter instead of fetching and executing the script. The pinned commit remains the place to read a script's text.

## How to use it

DevFridge platform, Season Pass, wallet, advertisement and release rules win on every conflict. The upstream files assume a Claude Code session at the root of a cloned studio, with Godot as the example engine and an ask-before-every-edit protocol. Neither assumption applies to a DevFridge game. The adapter states the path that does apply: Three.js for Browser, Seeker or both, minimal studio rigor, and a running game that someone has looked at.
