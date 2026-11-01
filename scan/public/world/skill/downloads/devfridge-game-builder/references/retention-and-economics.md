# Subscriptions, retention and honest economics

Developer reference. Technical descriptions below are not player-facing copy. Use the explicitly marked copy blocks for UI and [the subscription guide](season-pass.md) for implementation.

## The simple pitch

```player-copy/general
Give your meme a world worth coming back to. Pick a Daily, Weekly or Monthly Pass and play while it is active.
```

The problem: owning a meme token does not itself give a holder a recurring activity. A game can turn the community's character and lore into something players do together. DevFridge supplies the access infrastructure so the developer can focus on the game.

The mechanism (developer view): the chosen runtime's wallet connects; the player picks a Daily, Weekly or Monthly Pass and approves one locally built transaction that spends the plan's SOL price to buy the game's token and deposits the bought amount with `create_lock` in the existing Fridge program until the pass ends; any active deposit of that mint for that wallet establishes access, and the countdown reads its end time. The optional SDK/API read path has different semantics and caching limitations. Tokens sit in PDA-controlled vaults, not a game developer's wallet. No new timelock program is necessary. An existing deposit qualifies elsewhere only if that game independently accepts the same mint and policy; there is no universal access pass. Connection alone is not authenticated server identity.

## The speculative market layer

A **tokenized game** in this stack connects a community's existing fungible meme token to a playable character or feature. The skill maps the exact verified mint to the character identity—art, lore, mood or music—and builds game access around a qualifying DevFridge lock. For example: a character in Cold Storage, lives in MezzoPollo or food in Pikko. The same mint remains tradable on its existing market (including Pump.fun where listed). Token holders do not thereby own the game, character IP or game revenue.

**Why Token-2022?** It is the token program the current Fridge program accepts. Its metadata extensions also offer a standard, machine-readable identity for the mint: `MetadataPointer` identifies where metadata is stored; `TokenMetadata` can store the name, symbol, URI and custom key-value fields. That URI can point to JSON containing the character image, description, game website and community/social links. This lets wallets, explorers and game tooling identify and present the tokenized character. The metadata does not contain the game code, create the access rule or prove a lock. A mint can instead use Metaplex metadata, so inspect the actual mint and supported client format; do not assume every Pump.fun token uses the same metadata layout. The Fridge program validates Token-2022 timelocks and does not read or write either metadata format. See [Solana's Token-2022 metadata documentation](https://solana.com/docs/tokens/extensions/metadata).

For a Pump.fun community, the game gives the meme a playable use: holders can enter as the character, share the experience and return for community challenges or new content. This can make the existing token more relevant to players and may create additional demand for that same mint. It is a possible market effect—not guaranteed adoption, retention, liquidity or appreciation. A qualifying lock opens access; it does not make the game or token price rise by itself.

Tokens in an active vault cannot be transferred or sold from that vault before the chosen unlock time, and the depositor cannot withdraw early. After expiry, the same wallet redeems: 2% of the redeemed amount buys and burns PASTA, or is burned directly if the locked mint is PASTA; the remainder is returned, subject to an executable redemption route and separate network costs. The holder may then sell into the market available at that time.

If more players want access, demand for the associated mint may increase. That gives the game a speculative market layer, but not a payout loop: later players do not pay earlier players, and the program does not encode audience size or engagement as token value. The open market determines price and liquidity; either can rise or fall. A timelock sets no price floor or market cap and guarantees no return. A player may realize a gain or a loss after redemption, while bearing the risk of having the locked balance unavailable until expiry. Never pitch a lock as a way to make the token appreciate.

## Why players might return

- **Identity:** a character tied to their meme gives community membership a visible, playable expression.
- **A clear window:** a Daily, Weekly or Monthly Pass gives a defined period with a visible countdown. Remind before it ends, never pressure to renew; there is no automatic renewal.
- **Progress and belonging:** personal bests, mastery, new levels and community challenges provide reasons for the next session. Choose features that fit the genre; rewards are optional and require separate design.

These are design hypotheses, not measured results or a psychological guarantee. Locked TVL and actual play are different metrics. Ask for a concrete return reason, then measure first-session completion, return visits and repeat play separately from lock volume, with appropriate privacy choices. Avoid sunk-cost pressure, price FOMO, “lock longer to avoid losing everything,” fake scarcity and forced renewals. Explain what expires and preserve earned progress where possible.

## Copyable player onboarding

Use a plan radiogroup (Daily / Weekly / Monthly, only the plans the owner sells). Disable the action when a fresh SOL balance cannot cover the price plus fees; unknown balance is a distinct checking state. Substitute verified game values into these templates:

```player-copy/pass
<Game> subscription
Pick your pass
Daily Pass · <price> SOL
Weekly Pass · <price> SOL
Monthly Pass · <price> SOL
Subscribe
Approve in your wallet
Subscription active · <time> left
Subscription ended. Subscribe again to keep playing.
```

Show the end date in local time and UTC on the review. Present Details from the review before approval:

```player-copy/details
Details
Your SOL buys <TOKEN> for your wallet. That <TOKEN> stays set aside for your subscription until it ends.
Token value can change.
Network fees and account setup are separate.
Token address
Copy
```

Replace every placeholder with verified game values. No per-run fee is implied by this access model; disclose any separately selected Arcade charge in its own flow. Player copy never names timelocks, vaults, deposits, the Fridge or DevFridge program, program addresses, PASTA, redemption or withdrawal; raw program errors go through a plain-language mapper.

## What players are told, and what stays in the terms

Game screens present a subscription. They still state the one economic fact a player can see in the wallet anyway: the SOL buys the game's token, which stays set aside until the subscription ends and can change in value. Hiding that would make the wallet's confirmation look unexpected and would make the Store listing untrue.

The game's **terms page** and reviewer notes describe the full mechanics honestly: the bought tokens are deposited in the Fridge program until the end time, cannot be moved early, and when they later leave the program 2% buys and burns PASTA; the remainder returns to the depositor, subject to an executable route and network costs; market and liquidity risk remain. A subscription sets no token price or price floor.

Current DevFridge docs: on redemption, 2% of the vault amount buys PASTA through Jupiter and burns the PASTA acquired. For PASTA vaults, that portion is burned directly. The remaining 98% returns to the depositor on successful redemption, before separate network costs and any token-specific effects. Non-PASTA redemption needs an executable Jupiter route. Do not invent a second 2% charge inside the game or collect a copy of the protocol fee.

PASTA is pappardelle.sol's developer token. The project's stated intent is to connect ecosystem usage to support for its builder, ongoing development and infrastructure sustainability through PASTA buy-and-burn. The on-chain mechanism spends the fee on buying/burning tokens: it does not transfer that fee to a treasury, establish audited cost coverage, guarantee developer income or guarantee a token price increase.

## Sources and scope

Mechanics reviewed 2026-09-22: https://docs.devfridge.cool/fridge ; https://docs.devfridge.cool/tokenomics ; https://docs.devfridge.cool/program . PASTA developer identity and infrastructure-support intent are project-owner positioning supplied for this skill, not a treasury-flow finding. Retention suggestions are product-design hypotheses; do not invent conversion/retention statistics.
