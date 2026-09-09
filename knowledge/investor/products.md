---
type: "Concept"
title: "Products and asset roles"
description: "Investor guide for DevFridge: Products and asset roles"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Products and asset roles

## DevFridge

DevFridge helps Solana Token-2022 communities, including compatible Pump.fun communities, turn developer and holder commitment into time-locked membership. Instead of relying only on a promise to hold, developers and community members lock tokens for a publicly verifiable period. Projects can offer access to services in exchange for a qualifying lock, using the SDK to verify membership. The dApp makes locking easy; Scan verifies the lock; badges, the bot and other products build on the same DevFridge vault.

The locked tokens cannot be sold from the vault before the unlock time under the program rules. This constrains the availability of that locked balance for the stated period; it does not freeze or guarantee price, market capitalization, all circulating supply or DEX liquidity. Access depends on the service’s configured membership rules, and Token-2022 mint/extension compatibility must be checked. Membership is not cost-free: applicable network, claim and token fees still apply.

[Fridge](../docs/fridge.md) is a Solana Token-2022 time-lock. A lock is an individual depositor/mint/lock-id account with a token vault controlled by the program. The original depositor can claim after the unlock time under the program's rules. A timelock reduces access to the locked balance until expiry; it does not lock every holder's supply or a DEX liquidity pool.

The [scanner](../docs/scan.md) and [methodology](../docs/methodology.md) report observable signals. A Fridged badge evidences a lock and its parameters. It is not a guarantee about the project, other wallets or market price. [Get Featured](../docs/feature.md) buys sponsored visibility; it must be evaluated separately from the scanner's findings.

## PASTA

Solana mint: `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`.

PASTA is the ecosystem burn token described in [tokenomics](../docs/tokenomics.md). A user does not need to hold PASTA to create a Fridge lock. Usage-related buys/burns are not dividends, a promised buyback price, or a right to redeem against a reserve.

## TMC

TMC is listed on Robinhood Chain and Solana. See both network entries in the [asset registry](../assets/index.md).

[Trust Me Capital](https://capital.devfridge.cool) publishes a [Hyperliquid vault](https://app.hyperliquid.xyz/vaults/0xf8815770e046d32f606385700f3bc96ffbb4e879) and [performance evidence](https://capital.devfridge.cool/vault). Buying a TMC token is a different transaction from depositing into that vault. TMC is not a share of the vault or a claim on its assets. Trading-related buyback policy is separate from Fridge program fees.

[Trust Rewards](https://capital.devfridge.cool/rewards) has separate membership/access terms. Verify those terms, the network and the required contract before treating token ownership as eligibility.

## Brainrot collection and World

Ten named characters are currently in the published registry: Rugarugo, Aperitivo, FriedFomo, FudFusilli, Lambocello, GmGnocco, SerSugo, MoonZarella, Bonkatino and Ciccia Salsiccia. Each has a Solana and a Robinhood entry, with independent addresses and supplies.

The [World guide](../docs/world.md) documents the current game and access rules. Use the live guide for thresholds and timelock requirements; a website plan, character story or same-name token on another network is not proof of current access.

## Other products

- [Telegram bot](../docs/bot.md): reports, badge commands and lock expiry registration.
- [Badge](../docs/badge.md): website integration for displaying lock evidence.
- [SDK](../docs/sdk.md): timelock-based integration.
- [Bridge](./bridge.md): separate cross-chain infrastructure and verification requirements.
- [Program](../docs/program.md): public identifiers, fees and burn evidence.
