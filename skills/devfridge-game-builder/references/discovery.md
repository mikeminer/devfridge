# Developer interview and build brief

Start with three questions, omitting anything already answered:
1. What should players do? Offer runner, arena survival, drift racing, physics puzzle or exploration. Ask about win/loss, session length and desired 3D style.
2. What is the exact Solana mint and intended network? Ask for the Pump.fun URL/full address and available logo, model, animation and sounds. A ticker alone is not identity.
3. What should the timelock unlock? Ask token quantity, whole tokens versus raw units, one or several characters, and whether the rule is any active lock, an original minimum duration or minimum remaining time.

Follow up only where needed: minimum device/orientation; single-player versus actual multiplayer; assets/licences; one mint or multiple independently gated avatars; free practice; local best versus competitive scores; selected ecosystem modules; repository/domain/hosting. If unsure, let the developer compare two or three scoped concepts. Never ask for seed phrases/private keys.

Record in the brief:
- Name, visual direction, loop, camera, session length and win/loss.
- Desktop/touch actions, pause/restart, audio and accessibility.
- Network, full mint, verified program owner/decimals/extensions, evidence source/date.
- Per-mint threshold as a decimal string and exact raw amount; minimum original/remaining seconds; aggregation policy; avatar mapping.
- Sign-in, first-lock onboarding, recheck policy and expired/unavailable behavior.
- Selected modules, score authority, database, contract requirements and owner powers.
- Assets, deployment target, test matrix, assumptions and unresolved blockers.

Defaults to propose, not impose: single-player; no paid entry/rewards; visibly labeled practice until mint/rules are confirmed; one small level; external DevFridge locking plus recheck; local personal best labeled local. Rewards need further design, not an automatically selected contract.

Continue reversible scene work while mint/hosting answers are pending. Never invent production settings to make a build appear complete.
