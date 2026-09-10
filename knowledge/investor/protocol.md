---
type: "Report"
title: "Protocol adoption and PASTA LP evidence"
description: "DevFridge investor knowledge: Protocol adoption and PASTA LP evidence"
resource: "https://connect.devfridge.cool"
tags: ["devfridge", "investors"]
timestamp: "2026-09-10T17:07:43Z"
generated: true
---

# Protocol adoption and PASTA LP evidence

Evidence for community leaders evaluating a DevFridge integration. Counts are observations, not claims of outside adoption or revenue.

## Activity

ok · last successful observation: 2026-09-10T17:07:43Z · last attempt: 2026-09-10T17:07:43Z.

```json
{
  "active_locks": 94,
  "cumulative_fee_revenue": null,
  "depositor_wallets": 3,
  "external_depositors": null,
  "open_lock_accounts": 127,
  "program": "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6",
  "scope": "Currently open accounts, including expired unclaimed locks. Claimed/closed accounts are absent; these are not lifetime adoption counts.",
  "slot": 445936876,
  "unique_mints": 19
}
```

## Lp

ok · last successful observation: 2026-09-10T17:07:43Z · last attempt: 2026-09-10T17:07:43Z.

```json
{
  "decimals": 9,
  "explorer": "https://solscan.io/token/9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V",
  "interpretation": "Zero outstanding LP supply at observation for this mint. This is not a guarantee of future pool liquidity, price, or permanent absence of newly minted LP shares.",
  "lp_mint": "9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V",
  "mint_authority": "5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5",
  "owner_program": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "pool": "5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5",
  "slot": 445936888,
  "supply_base_units": "0",
  "zero_supply": true
}
```

## Reported Stats

ok · last successful observation: 2026-09-10T17:07:43Z · last attempt: 2026-09-10T17:07:43Z.

```json
{
  "boost_vault_lamports": 890880,
  "interpretation": "The published stats implementation reads an incinerator token balance for pastaBurned. It is not a complete ledger of SPL Burn instructions. Vault balance and burn-token value do not establish cumulative fee revenue.",
  "reported_pasta_burned": "876026.010648",
  "source_timestamp_ms": 1789060066953
}
```

[Product pitch and pilot](./kol.md) · [Investor index](./index.md) · [Program source](https://github.com/mikeminer/devfridge/blob/master/programs/fridge/src/lib.rs) · [Stats implementation](https://github.com/mikeminer/devfridge/blob/master/scan/lib/stats.ts)
