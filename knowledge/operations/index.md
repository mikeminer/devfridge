---
type: "Index"
title: "Knowledge maintenance"
description: "Investor guide for DevFridge: Knowledge maintenance"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Knowledge maintenance

- [Refresh status and discrepancies](./freshness.md)
- [Configuration](../config.json)
- [Raw source observations](../data/snapshot.json)
- [Generator](../../scripts/knowledge/refresh.py)
- [Validator](../../scripts/knowledge/validate.py)
- [Workflow](../../.github/workflows/knowledge.yml)

## Update triggers

The repository's **Investor knowledge** GitHub Actions workflow runs daily at 06:17 UTC, on relevant master-branch source changes, and with workflow_dispatch. It requires no wallet, private key, paid RPC secret or model key.

The refresh job has contents-write permission solely to commit the knowledge folder using the repository's short-lived GITHUB_TOKEN. PR validation has read-only permission and makes no network calls. The workflow does not change app code, execute trades, sign transactions or modify cloud settings.

The four Vercel project configurations use [a build guard](../../scripts/knowledge/skip-site-build.mjs) to skip knowledge-only commits. Application changes and unrelated configuration changes continue to build; missing Git history defaults to building. This prevents daily data commits from unnecessarily redeploying websites.

GitHub may delay scheduled jobs, and public repositories can have scheduled workflows disabled after inactivity. Check the [Actions page](https://github.com/mikeminer/devfridge/actions/workflows/knowledge.yml) and the per-source timestamps. If branch protections later prevent bot commits, updates will fail visibly until maintainers configure an approved PR-based publishing path; do not bypass protections.

## Local commands

```sh
python scripts/knowledge/refresh.py
python scripts/knowledge/validate.py
python -m unittest discover -s scripts/knowledge -p 'test_*.py'
python scripts/knowledge/refresh.py --offline
```

Online refresh reads the published Connect registry, discovers documentation pages, observes Solana mint state, reads Robinhood ERC-20 state at a common block, and obtains indexed market evidence. Offline mode regenerates identical Markdown from the saved snapshot.

## Failure policy

Each source stores status, last successful observation, latest attempt and observed values. On failure, prior data and its success timestamp are preserved and marked stale. A first failure produces unavailable data. The report never replaces unavailable measurements with zero.

Pinned asset identities prevent a disappearing or substituted mint from silently replacing the known registry. A valid newly added registry asset is discovered automatically. Review config.json when accepting a removal or replacement; preserve historical identity documentation before changing pins.

A refresh is a dated observation, not continuous monitoring. Treat observations older than 36 hours as stale even if the last run succeeded. Supply reads do not establish beneficial ownership; indexed prices do not establish execution.

## Editorial versus generated content

Investor guides and glossary pages are reviewed editorial content. Asset pages, docs snapshots, source index, freshness report and root index are generated; edit their source or generator, not their output.

The generator maintains frontmatter and relative links. The validator checks page metadata, every required asset identity, observation states, all local docs routes, index coverage and local links. Tests exercise source failures, address identity, malformed data and filtering.

Magistra provided the structural example: one concept per Markdown file, metadata, indices and links. No Magistra code or domain-specific content was copied.
