---
type: "Index"
title: "Investor glossary"
description: "Investor guide for DevFridge: Investor glossary"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Investor glossary

## Identity

**Mint / contract:** the address identifying an asset within a network. A ticker is a label.

**Token-2022:** Solana's extension-capable token program. Inspect the actual enabled extensions and their authorities.

**PDA:** a Solana program-derived address. A lock PDA is the lock account, not the token mint. A burn authority PDA alone does not prove a specific burn.

## Supply and markets

**Total supply:** supply returned by a mint or ERC-20 at a specified point. It is not automatically circulating supply.

**FDV:** price multiplied by a supply assumption. It is not cash held by a project.

**Liquidity:** assets available in a trading venue. USD liquidity estimates and displayed prices are not guaranteed execution at size.

**Account concentration:** concentration of balances among accounts. It can include pools, curves, custodians and program vaults; it differs from beneficial-owner concentration.

**Bonding curve / graduation:** launch-specific trading and transition rules. See the applicable [Pons v2 documentation](https://docs.ponsfamily.com/v2) or the asset's launch page; do not mix v1/v2 rules.

## Evidence

**On-chain observation:** specific RPC fields read at a slot/block; narrower than an audit.

**Source claim:** a statement from project documentation or a provider. Attribution does not make it independently verified.

**Stale:** a previous successful observation whose latest refresh failed, or whose age exceeds the freshness window.

**Unavailable:** no successful data recorded. It does not mean zero, false, safe or absent.

[Asset records](../assets/index.md) · [Risks](../investor/risks.md) · [Sources](../sources/index.md).
