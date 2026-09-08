---
type: "Concept"
title: "Bridge status and network identity"
description: "Investor guide for DevFridge: Bridge status and network identity"
tags: [devfridge, investors]
timestamp: "2026-09-08T00:00:00Z"
generated: false
---

# Bridge status and network identity

Same-name Solana and Robinhood tokens must be treated as separate assets unless an explicitly verified route establishes their relationship.

The [bridge code](https://github.com/mikeminer/devfridge/blob/master/scan/lib/bridge.ts) defines a Robinhood-canonical TMC route and labels `EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump` as the Solana legacy mint. Its active destination mint, EVM OFT adapter, Solana OFT store and enabled flag are deployment configuration. The existence of this code does not establish that mainnet bridging is enabled.

## Required verification

| Check | Evidence |
| --- | --- |
| Canonical asset and representation | Full source/destination addresses and network IDs |
| Endpoint configuration | Deployed adapter/OFT store and trusted peers |
| Control | Owners, governors, guardians and upgradeability |
| Limits | Active rate limits and paused/enabled state |
| Settlement | Source lock/burn and destination mint/release transaction evidence |
| Supply relationship | Reconciled escrow, circulating representations and outstanding messages |
| Failure handling | Retry, emergency pause and recovery rules |

Use the current [bridge interface](https://bridge.devfridge.cool), [contract sources](https://github.com/mikeminer/devfridge/tree/master/bridge-contracts) and [Solana bridge sources](https://github.com/mikeminer/devfridge/tree/master/bridge-contracts/solana).

The automated asset snapshots deliberately do not label a route “live” based on matching symbols, a documented daily limit, or the presence of an address. They do not read private deployment environment variables. Verify the current deployment directly before attributing bridge rights to either TMC mint.

[Return to assets](../assets/index.md).
