---
type: "Concept"
title: "Risk and diligence checklist"
description: "Investor guide for DevFridge: Risk and diligence checklist"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Risk and diligence checklist

## Identity and network

Start from [Connect](https://connect.devfridge.cool), then match the complete address and network with the transaction. Tickers can be duplicated. MoonZarella even has different displayed ticker lengths across networks. The same name is not proof of a wrapped token or a redemption relationship.

## Supply and control

For Solana, inspect the mint owner program, mint/freeze authority and every returned Token-2022 extension. A missing mint authority does not remove all possible transfer restrictions. Transfer-fee configuration, hooks, delegates and metadata authorities can have separate effects.

For Robinhood ERC-20s, totalSupply and decimals are basic read-only facts. They do not establish owner privileges, taxes, blacklists, upgradeability or renounced control. Inspect verified source, proxy implementation, admin roles and the actual launch configuration.

Supply snapshots are totals, not free float. Pool, curve, program vault and custodial balances can distort apparent holder concentration. One entity may control many accounts.

## Market and exit

Assess executable quotes at your intended size, slippage, spread, reserves, fees and recent activity. A price on a chart can come from very small or stale trades. An empty DexScreener result does not mean a Pump.fun curve has no activity. Pons indexer data can lag its contracts.

Do not add the nominal values of illiquid collection tokens into a portfolio valuation without an explicit pricing method.

## Lock scope

A Fridge lock covers one vault and its unlock time. Other supply can move. After expiry, a depositor can claim subject to fees. Check the share of total supply locked, concentration among depositors, expiry clustering and whether a claim is executable. A locked token balance is not locked DEX liquidity.

## Protocol and operations

Read the current [security disclosure](../docs/security.md) and demand a linked independent audit report before describing the system as independently audited. Public code, automated tests and scanner grades are different forms of evidence.

RPC outages, DEX routes, third-party indexers and wallet behaviour can affect execution. [Health](https://health.devfridge.cool) indicates observed service status, not solvency or complete security.

## TMC vault and bridge

TMC holders have no automatic claim to the separate vault. Inspect vault history, drawdowns, current leverage, strategy exposure and withdrawal terms directly. Published historical profit does not establish future buyback budgets.

Cross-chain infrastructure adds separate administrators, messaging providers, adapters, rate limits and recovery procedures. See [Bridge status](./bridge.md).

## Evidence gaps

[Freshness and discrepancies](../operations/freshness.md) lists source failures and address disagreements. “Unknown” remains unknown until evidence is obtained. This bundle does not produce a buy/sell recommendation or a safety score.
