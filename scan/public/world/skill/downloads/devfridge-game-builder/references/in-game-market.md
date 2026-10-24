# Optional in-game token market

Ask in discovery: **Add an in-app Buy <TOKEN> screen?** Record include/exclude/pending independently from the Season Pass and both ads. Implement only if selected. Quotes and wallet interaction remain in the game; external discovery links are not the default purchase path. The agent never executes a real purchase to test or demonstrate this module.

## Source and route contract

Reviewed **2026-10-24**: official [`@pump-fun/pump-sdk`](https://www.npmjs.com/package/@pump-fun/pump-sdk) version **4.3.1**, [source](https://github.com/pump-fun/pump-sdk), [multi-hop documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/MULTI_HOP_SWAP.md) and [official IDLs](https://github.com/pump-fun/pump-public-docs/tree/main/idl). Pin the reviewed version and IDL/source hash in the generated game; check version-matched API/types rather than inventing method names or reproducing stale fee mathematics. Public docs' example SDK versions can lag npm. Source verification here is not a live trade test.

Verify the program IDs against the pinned IDLs and executable chain accounts before release: Pump `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`; PumpSwap AMM `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`. Inspect the actual mint owner/extensions and canonical curve/pool state at runtime. Choose the active bonding curve while trading, or the canonical migrated PumpSwap pool after graduation; do not choose by ticker, a URL suffix or a cached UI flag. Route changes invalidate quotes and reviews.

The official public-docs IDLs fetched for this skill review are pinned at commit `639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22`: [pump.json](https://github.com/pump-fun/pump-public-docs/blob/639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22/idl/pump.json), SHA-256 `7616681ea557975f9f623ac211080f22a93060781eaf4765b0a488d980997207`; [pump_amm.json](https://github.com/pump-fun/pump-public-docs/blob/639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22/idl/pump_amm.json), SHA-256 `b7d8c57a4d9c4dd0109a9ab893052352333252d4eedced10ac091d4d66cab89b`. Their declared addresses match the IDs above. Match the installed SDK's own layouts to these sources and the current deployment rather than assuming a later docs commit is compatible with any older package.

For a token paired with another token, resolve supported multi-hop routes from chain state. The official `multi_hop_swap` is exact-in, has one final positive minimum-out constraint, and keeps intermediate output inside the route. Confirm each hop's owner, mints, PDAs, supported mode and canonical pool/curve. Unsupported or migrating routes fail closed. Example (Street Meat): SOL → PASTA → MEAT in one swap; the user never holds the middle token. These mints, game, limits and route are examples, never defaults.

## Quote and transaction

1. Resolve route and reserves with slot/context; include current protocol/creator/LP fees using the pinned SDK. Refresh about every five seconds while the quote view is visible; stop in background. Reject stale/incomplete quotes and update when wallet, route, amount or slippage changes.
2. Use exact raw integers; UI decimal inputs must convert without floating-point rounding. Offer 1 / 2 / 5% slippage (2% proposed default, explicitly configurable). After preflight simulation, set `minOut = floor(simulatedOutput × (10000 − slippageBps) / 10000)` with BigInt; reject zero/negative output. Rebuild with that minimum and re-simulate the **final** transaction. Simulation output is not a guaranteed fill.
3. Show input, expected output, minimum output, market impact, network fee, first-time account setup and the SOL reserve retained for future fees and the selected pass deposit. Re-fetch live rent and fee estimates. Owner sets min/max bounds; Example (Street Meat): 0.001 SOL minimum and a 100 SOL fail-closed maximum, not general recommendations. Do not let a stale quote spend the SOL reserve.
4. Compile a versioned v0 transaction. Resolve and validate all address tables if needed; prefer the simplest route with statically verifiable accounts. Budget/ATA/wrapped-SOL setup and close instructions are allowed only where required by the reviewed route. No arbitrary transfers, delegates, authority changes or hidden tips. Closing an account is permitted only for the exact transient wrapped-SOL account created/owned by this flow, with rent returned to the connected wallet.
5. Simulate → validate native intent and exact account/instruction layout → persist awaiting-wallet record → explicit wallet approval (`signAndSendTransactions` in native MWA; provider API on web) → persist signature/unknown state → confirm chain effect. See [wallet recovery](seeker-wallet.md). A quote refresh must never change the reviewed transaction while wallet UI is open.
6. Confirm success for this wallet, cluster, route, amount, destination token account and minimum output; then refresh balance and return to Season Pass. A callback or local balance prediction alone is insufficient. A lost signature needs a discoverable reference/history strategy selected before enabling the market; if none can prove outcome, keep recovery/support available and do not automatically swap again.

## Native BuyTxValidator

The renderer is untrusted. Use the same strict bounded decoder and single-flight/lifecycle boundary as [Season Pass validation](season-pass.md). Pin programs, complete ordered accounts, PDAs and fee/buyback recipients from verified global configuration. Bind exact input lamports and chosen minimum output, input/output mints, route, wallet, cluster and quote expiry to native reviewed intent. Check account writable/signer flags, transaction header, version and signature placeholders; reject unrelated/duplicate/trailing instructions, accounts or bytes. The pass validator's no-LUT rule must not silently permit arbitrary tables in the market: support fully resolved validated tables or reject that route.

Use approximately 20 meaningful tamper cases: wrong wallet/cluster, program, route order, mint, canonical pool, reserve vault, protocol recipient, buyback recipient, ATA authority, amount, minimum out, quote expiry, excessive compute/tip, added transfer/delegate, changed close-account destination, signer/writable flags, missing account, trailing/truncated data and changed lookup table. Test quote math, changing fees, rounding beyond 2^53, and route migration. Assert the pinned IDL's account order with valid fixtures. Run a read-only unsigned `simulate:buy` with a suitable public holder; record outcome without signing or broadcasting. This skill supplies the implementation specification, not a prebuilt Kotlin trading client.

## Plain player copy

Use the owner's locale and token name. Do not imply appreciation, income or an investment; third-party platform names are optional only at the owner's request. Keep the full token mint visible in details. Store screenshots show a quote, never a fabricated completed trade.

```player-copy/market
Buy <TOKEN>
Swap SOL for <TOKEN> via the <TOKEN> pool on Solana, right here in the game.
Your wallet shows the full transaction before you approve. Nothing moves unless you approve it there.
Token prices move.
Expected amount
Minimum amount
Network fee and account setup
SOL kept for later network fees and your pass
The market is moving to its new pool right now. Try again in a few minutes.
The quote changed. Review the new amounts before continuing.
Not enough SOL for this swap and the network fee.
There is no SOL in this wallet yet.
This token account changed. Refresh and try again.
This quote expired. Refresh it before continuing.
We could not confirm the result. Check your wallet activity before you swap again.
Check again
```

Map slippage, insufficient SOL, changed account, expired quote and unknown outcome separately. Never display raw RPC URLs, stack traces, program names or token-finance promises. Keep technical evidence in redacted developer logs.
