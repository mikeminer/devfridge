# Project gallery: agent-guided submission and owner operations

The Game Builder skill handles the submission for the builder, including a non-developer. The builder supplies decisions and signs into GitHub when needed; their agent prepares the evidence, validates the metadata, creates a fork/branch and opens the PR. Start at https://world.devfridge.cool/skill#submit or use the packaged [guided procedure](../../skills/devfridge-game-builder/references/hackathon-submission.md).

## Builder contract

The target is `mikeminer/devfridge`, base branch `master`. A submission adds exactly one file, `scan/data/hackathon-projects/<slug>.json`, using [project.example.json](project.example.json). Replace all placeholders. Game source stays in the builder's own repository; submit public HTTPS demo/evidence links and its full source commit SHA. No secrets, game binaries, scripts, changes to CI, or unrelated files belong in a project PR. The built-in `fridge-run` slug is reserved.

Required fields: schemaVersion (1), slug (lowercase letters/numbers separated by hyphens, maximum 60), name (80), pitch (240), community (80), access (1600), limitations (1600), playUrl, repositoryUrl, demoUrl, submissionUrl, buildLogUrl, verificationUrl (public HTTPS, maximum 800 characters each), commit (40 lowercase hexadecimal characters), practiceAvailable (true). Text limits are characters. The entire file must be at most 16 KiB; unknown fields fail. JSON content is rendered as text, never HTML. URLs are validated syntactically but must also be opened and reviewed by the owner; validation does not certify their contents or safety.

The access description and linked submission document must state network, mint/fixture status, minimum amount, duration, aggregation and expiry rules, fee and routing disclosures. Evidence must document asset rights, AI contributions, real device testing versus emulation and score authority. Never make a reviewer purchase tokens or deposit funds to assess the game.

Run from a clean repository checkout:

```sh
node scripts/validate-hackathon-projects.cjs
node --test scan/tests/hackathon-project-registry.test.cjs
```

Use the [project PR template](../../.github/PULL_REQUEST_TEMPLATE/hackathon-project.md). Check existing PRs first. A new release updates the same slug and evidence rather than creating a duplicate. For an existing entry, the owner must verify that the requester controls the project or has authorization.

## Owner: install and enforce the pipeline

1. Merge the pipeline PR to `master`. It installs `.github/workflows/hackathon-projects.yml`, `.github/CODEOWNERS`, the validator, gallery reader and agent guide. Enable GitHub Actions for the repository. The workflow uses Node 24, read-only repository permissions, no deployment secret, and runs on pull requests and pushes. GitHub may require approval before running Actions from a first-time contributor; inspect the entire diff before approving a run.
2. In GitHub Settings → Rules → Rulesets (or branch protection), protect `master`: require a pull request, at least one approval, review from Code Owners, dismissal of stale approvals after new pushes, resolved conversations, and the `Validate hackathon projects` and existing `web` checks. Select the checks after their first successful run. Restrict bypass/direct pushes to the intended owner emergency policy. CODEOWNERS alone requests review; it does **not** enforce approval without this setting. Ensure another trusted reviewer can review owner-authored infrastructure changes: GitHub does not allow authors to approve their own PRs. This setup is not claimed active merely because the files exist.
3. Keep the existing Vercel Git integration for `scan-devfridge-cool`: repository `mikeminer/devfridge`, production branch `master`, root directory `scan`, build command `npm run build`, domain `hackathon.devfridge.cool`. Verify auto-deployment is enabled. No custom action deploying fork content with production credentials is needed. Disable/limit automatic external-fork previews if production environment values would otherwise be exposed; inspect the Vercel project settings.
4. Review each submission's full diff, ownership, free playable loop, links, pinned source and evidence. A metadata PR must not change the validator or workflow. Check disclosures and honest limitations; passing CI is not a content/security audit. Use GitHub's **Approve** review and merge only after checks pass. Do not add an auto-merge rule triggered by a label, agent message or JSON flag.
5. The merge triggers the existing production build. The static gallery reads every validated JSON entry, so no page edit is needed. Wait for the `Vercel – scan-devfridge-cool` deployment to succeed; visit https://hackathon.devfridge.cool/projects and verify the card/links. Approval without merge, a PR preview or a failed production build is not publication.

Dates, prizes, official competition eligibility and final judging remain to be announced. Gallery inclusion is a reviewed showcase entry, not a prize or an audit endorsement.

## Recovery and maintenance

- Validation failure: ask the agent to fix the same branch. Re-review after changes.
- Build/deployment failure: inspect the GitHub/Vercel logs; do not call the project live until the production URL is verified. Rerun the failed deployment after fixing the cause.
- Removal: delete the entry through a reviewed PR; the next successful deployment removes the card. Revert the merge to roll back erroneous metadata.
- Mutable external demos can change after review. Source/evidence should be commit-pinned; review link or release changes again. The gallery links out and never embeds or executes a submitted game.
- Skills are maintained in `skills/devfridge-game-builder`. Run `python scripts/package-game-skill.py` when updating them and commit the generated downloads and manifest. The public ZIP and `.skill` must contain the guided procedure, not only this repository document.
