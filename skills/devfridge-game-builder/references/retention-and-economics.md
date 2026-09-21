# Retention, commitment and the PASTA loop

## The simple pitch

“Give your meme a world worth coming back to. Lock your community token, unlock your character, and play while your lock qualifies.”

The problem: owning a meme token does not itself give a holder a recurring activity. A game can turn the community's character and lore into something players do together. DevFridge supplies the access infrastructure so the developer can focus on the game.

The mechanism: Phantom identifies the wallet; the player voluntarily locks a supported token in the existing DevFridge Solana program; SDK/API reads supply eligibility evidence; the game applies its own amount/duration rules. Tokens sit in program-owned vaults, not a game developer's wallet. A new timelock program is unnecessary for this integration. An existing lock can qualify for another game only if that game independently accepts the same mint and policy; there is no universal access pass.

## Why players might return

- **Identity:** a character tied to their meme gives community membership a visible, playable expression.
- **Voluntary commitment:** choosing an amount and unlock date creates a defined participation window. Clearly explain the tradeoff: those tokens cannot be transferred, sold or redeemed early.
- **Progress and belonging:** personal bests, mastery, new levels and community challenges provide reasons for the next session. Choose features that fit the genre; rewards are optional and require separate design.

These are design hypotheses, not measured results or a psychological guarantee. Locked TVL and actual play are different metrics. Ask for a concrete return reason, then measure first-session completion, return visits and repeat play separately from lock volume, with appropriate privacy choices. Avoid sunk-cost pressure, price FOMO, “lock longer to avoid losing everything,” fake scarcity and forced renewals. Explain what expires and preserve earned progress where possible.

## Copyable player onboarding

“Your token is your character key. Connect Phantom and lock [amount] [token] on DevFridge under [duration policy] to unlock [access]. Your game checks that lock on Solana. Choose your unlock date carefully: there is no early withdrawal. When you redeem after expiry, DevFridge charges 2% of the redeemed vault amount to buy and burn PASTA. Network costs are separate. Check token compatibility and redemption routing before you lock.”

Replace every placeholder with verified game policy. Show the full mint, exact quantity, unlock date and fee estimate before signing. A timelock is a commitment with a redemption cost, not a free refundable deposit. No per-run fee is implied by this access model; disclose any separate game charges explicitly.

## What the 2% does

Current DevFridge docs: on redemption, 2% of the vault amount buys PASTA through Jupiter and burns the PASTA acquired. For PASTA vaults, that portion is burned directly. The remaining 98% returns to the depositor on successful redemption, before separate network costs and any token-specific effects. Example: a 100,000-token vault has a 2,000-token protocol fee and a 98,000-token remainder; this is token arithmetic, not a USD value or a guaranteed executable quote.

Non-PASTA redemption needs an executable Jupiter route. Expiry alone does not guarantee immediate redemption for an illiquid or ungraduated token. Verify the mint/extensions, current fee, program and route; do not invent a second 2% charge inside the game or collect a copy of the protocol fee.

PASTA is pappardelle.sol's developer token. The project's stated intent is to connect ecosystem usage to support for its builder, ongoing development and infrastructure sustainability through PASTA buy-and-burn. Explain this as an ecosystem support model. The on-chain mechanism spends the fee on buying/burning tokens: it does not transfer that same fee to an infrastructure/developer treasury, establish audited cost coverage, guarantee developer income or guarantee a token price increase. Do not present it as a direct donation or server invoice payment.

Players can lock the game's supported token; owning PASTA separately is not required unless the game itself chooses PASTA as its access token.

## Sources and scope

Mechanics reviewed 2026-09-22: https://docs.devfridge.cool/fridge ; https://docs.devfridge.cool/tokenomics ; https://docs.devfridge.cool/program . PASTA developer identity and infrastructure-support intent are project-owner positioning supplied for this skill, not a treasury-flow finding. Retention suggestions are product-design hypotheses; do not invent conversion/retention statistics.
