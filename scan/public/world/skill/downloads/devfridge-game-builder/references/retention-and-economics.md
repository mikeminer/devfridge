# Retention, commitment and the PASTA loop

## The simple pitch

“Give your meme a world worth coming back to. Lock your community token, unlock your character, and play while your lock qualifies.”

The problem: owning a meme token does not itself give a holder a recurring activity. A game can turn the community's character and lore into something players do together. DevFridge supplies the access infrastructure so the developer can focus on the game.

The mechanism: Phantom identifies the wallet; the player voluntarily locks a supported token in the existing DevFridge Solana program; SDK/API reads supply eligibility evidence; the game applies its own amount/duration rules. Tokens sit in program-owned vaults, not a game developer's wallet. A new timelock program is unnecessary for this integration. An existing lock can qualify for another game only if that game independently accepts the same mint and policy; there is no universal access pass.

## The speculative market layer

A **tokenized game** in this stack connects a community's existing fungible meme token to a playable character or feature. The skill maps the exact verified mint to the character identity—art, lore, mood or music—and builds game access around a qualifying DevFridge lock. For example: a character in Cold Storage, lives in MezzoPollo or food in Pikko. The same mint remains tradable on its existing market (including Pump.fun where listed). Token holders do not thereby own the game, character IP or game revenue.

**Why Token-2022?** It is the token program the current Fridge program accepts. Its metadata extensions also offer a standard, machine-readable identity for the mint: `MetadataPointer` identifies where metadata is stored; `TokenMetadata` can store the name, symbol, URI and custom key-value fields. That URI can point to JSON containing the character image, description, game website and community/social links. This lets wallets, explorers and game tooling identify and present the tokenized character. The metadata does not contain the game code, create the access rule or prove a lock. A mint can instead use Metaplex metadata, so inspect the actual mint and supported client format; do not assume every Pump.fun token uses the same metadata layout. The Fridge program validates Token-2022 timelocks and does not read or write either metadata format. See [Solana's Token-2022 metadata documentation](https://solana.com/docs/tokens/extensions/metadata).

For a Pump.fun community, the game gives the meme a playable use: holders can enter as the character, share the experience and return for community challenges or new content. This can make the existing token more relevant to players and may create additional demand for that same mint. It is a possible market effect—not guaranteed adoption, retention, liquidity or appreciation. A qualifying lock opens access; it does not make the game or token price rise by itself.

Tokens in an active vault cannot be transferred or sold from that vault before the chosen unlock time, and the depositor cannot withdraw early. After expiry, the same wallet redeems: 2% of the redeemed amount buys and burns PASTA, or is burned directly if the locked mint is PASTA; the remainder is returned, subject to an executable redemption route and separate network costs. The holder may then sell into the market available at that time.

If more players want access, demand for the associated mint may increase. That gives the game a speculative market layer, but not a payout loop: later players do not pay earlier players, and the program does not encode audience size or engagement as token value. The open market determines price and liquidity; either can rise or fall. A timelock sets no price floor or market cap and guarantees no return. A player may realize a gain or a loss after redemption, while bearing the risk of having the locked balance unavailable until expiry. Never pitch a lock as a way to make the token appreciate.

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
