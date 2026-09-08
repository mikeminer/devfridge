---
type: "Concept"
title: "Economics and fee flows"
description: "Investor guide for DevFridge: Economics and fee flows"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Economics and fee flows

The [tokenomics](../docs/tokenomics.md), [program](../docs/program.md) and [buy-and-burn](../docs/boost.md) documentation are the source for the flows below. Check their observation timestamps.

## Fridge claim fee

The documented claim fee is 2% of the vault balance. For a PASTA claim, the fee path burns PASTA; for supported non-PASTA claims, the documented path swaps the fee into PASTA and burns it. Swap execution, route availability and minimum-output constraints matter. Network fees and any Token-2022 extension costs are distinct.

A lock is not a yield deposit. Token quantity returned is subject to the applicable claim fee and the asset/program rules. Review the actual transaction before signing.

## Get Featured

| Documented tier | Duration | Additional cost |
| --- | --- | --- |
| 0.1 SOL | 24 hours | Network fees |
| 0.18 SOL | 48 hours | Network fees |
| 0.5 SOL | 7 days | Network fees |

A live lock is required. Payment goes to the program's feature vault; a crank performs the documented PASTA buy-and-burn operation. Payment receipt alone is not proof that a later swap/burn has executed. Check the resulting successful transaction and exact mint.

Sponsored placement is visibility on DevFridge surfaces. It does not change a risk grade, certify a token, create liquidity, guarantee impressions or promise price performance.

## What investors can measure

Separate feature payments received, successful swaps, tokens burned, balances awaiting processing, active locked balances, expiring locks and claim activity. Do not label all deposited principal as revenue or add a token balance to the USD value of the same balance.

TVL depends on token pricing and liquidity. An observable lock amount can have an uncertain or unreliable dollar valuation. Market cap and FDV are provider calculations; they are not capital invested, cash reserves or executable exit values.

## Burn verification

The documented burn authority PDA is `6PQhfXQNnqrau7EKjFxrH6xwX3uv97RMsx62LmKBmT9m`, derived from the burn seed and Fridge program. A PDA address alone does not prove which mint was burned. Inspect the successful Token-2022 Burn instruction, its mint and authority, and the deployed program's constraints. See the worked transaction in [Program IDs and fees](../docs/program.md).

Program upgradeability is a separate diligence question. Source code and an earlier transaction do not prove immutable future behaviour.

## TMC and other collection tokens

TMC vault trading P&L and discretionary buybacks are outside the Fridge fee mechanism. The Brainrot tokens are not automatically entitled to PASTA burns, vault earnings, a treasury distribution or bridge redemption. Require explicit terms and deployed mechanism evidence for any such claim.
