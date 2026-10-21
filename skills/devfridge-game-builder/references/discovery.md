# Developer interview and build brief

Start with three questions, omitting anything already answered:
1. What should players do? Offer runner, arena survival, drift racing, physics puzzle or exploration. Ask about win/loss, session length and desired 3D style.
2. What is the exact Solana mint and intended network? Ask for the Pump.fun URL/full address and available logo, model, animation and sounds. A ticker alone is not identity.
3. What should the timelock unlock? Ask token quantity, whole tokens versus raw units, one or several characters, and whether the rule is any active lock, an original minimum duration or minimum remaining time.

Follow up only where needed: minimum device/orientation; single-player versus actual multiplayer; assets/licences; one mint or multiple independently gated avatars; free practice; local best versus competitive scores; selected ecosystem modules; repository/domain/hosting. If unsure, let the developer compare two or three scoped concepts. Never ask for seed phrases/private keys.

Before implementing gameplay, ask the owner about both Free Play placements unless they have already explicitly chosen for this game:

1. "Include an OnlyFridge Club promotion before every new free round, including the first and retries, with a Continue button?"
2. "Include the DevFridge Scan sponsored-token card at the top during Free Play, showing YOUR AD HERE when there is no active sponsor?"

The choices are independent: both, one or neither. Do not preselect consent, treat silence as refusal/consent, infer consent from a free-mode request, or enable ads because an example game has them. An unanswered choice remains pending; wait before gameplay implementation, while continuing read-only discovery/setup. If the owner explicitly excludes Free Play, mark both not applicable. Reuse answers already given for this game instead of repeating questions. These questions are for the creator during planning, not for players before each round. For any approved placement, follow [the integration guide](free-play-sponsors.md).

Record in the brief:
- Name, visual direction, loop, camera, session length and win/loss.
- Desktop/touch actions, pause/restart, audio and accessibility.
- Network, full mint, verified program owner/decimals/extensions, evidence source/date.
- Per-mint threshold as a decimal string and exact raw amount; minimum original/remaining seconds; aggregation policy; avatar mapping.
- Sign-in, first-lock onboarding, recheck policy and expired/unavailable behavior.
- Selected modules, score authority, database, contract requirements and owner powers.
- Free Play scope and each placement's decision (include / exclude / pending / not applicable), with the owner's answer; no unanswered ad setting may become enabled.
- Assets, deployment target, test matrix, assumptions and unresolved blockers.

Defaults to propose, not impose: single-player; no paid entry/rewards; visibly labeled practice until mint/rules are confirmed; one small level; external DevFridge locking plus recheck; local personal best labeled local. Rewards need further design, not an automatically selected contract.

Once the Free Play placement choices are resolved, continue reversible scene work while mint/hosting answers are pending. Never invent production settings to make a build appear complete.
