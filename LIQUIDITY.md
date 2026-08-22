# $PASTA Liquidity Disclosure

**Mint:** `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`
**Pool:** PumpSwap SOL/PASTA — `5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5`
**Snapshot date:** 2026-08-22

## Summary

| Metric | Value |
|--------|-------|
| DEX | PumpSwap (pump.fun AMM) |
| Pool liquidity | ~$6,318 USD |
| SOL in pool | ~24.8 SOL |
| PASTA in pool | ~435,859,219 |
| LP mint | `9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V` |
| LP supply | **0** (burned) |
| LP status | **Permanently burned** — liquidity cannot be withdrawn by anyone |
| FDV | ~$8,870 |

## LP Token Burn Verification

The LP tokens for the SOL/PASTA pool were **burned in the same transaction** as the bonding curve graduation on pump.fun. This is the default behavior for all pump.fun tokens that complete their bonding curve — LP tokens are minted and immediately burned during the `migrate` instruction.

**On-chain proof:**

```bash
# Verify LP supply is 0 (all tokens burned)
curl -X POST https://api.mainnet-beta.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V"]}'

# Response: {"amount":"0","decimals":9,"uiAmount":0.0}
```

**What this means:** No wallet holds LP tokens. The liquidity is owned by the PumpSwap program itself and is permanent. No one — not the founder, not the team, not any single entity — can withdraw or rug this liquidity.

This is **stronger than a time-lock**. A time-lock defers withdrawal; a burn eliminates it permanently.

## Honest Assessment

The liquidity is permanently committed, but it is **thin**:

- ~$6.3k total — a single $500 sell would move the price significantly
- This is a micro-cap token with micro-cap liquidity
- Slippage on trades >$100 will be material
- The Jupiter buyback path in the Fridge `claim` instruction depends on this liquidity — if the pool is too thin, non-PASTA claims may fail due to slippage exceeding `min_pasta_out`

**This is not a solved problem.** Liquidity depth grows only through:
1. Organic trading volume (generates fees that compound in the pool)
2. Additional LP provision (anyone can add liquidity on PumpSwap)
3. Protocol adoption driving demand

We report liquidity as a live metric, not a milestone to check off.

## Live Tracking

Liquidity depth is tracked in real time at:
- **Dashboard:** https://scan.devfridge.cool/stats (refreshes every 60s)
- **API:** https://scan.devfridge.cool/api/stats (JSON, includes `liquidity` object)
- **DexScreener:** https://dexscreener.com/solana/5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5

## How to Verify

```bash
# 1. Confirm the pool is the canonical PumpSwap pool for PASTA
# Pool owner must be pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA
curl -X POST https://api.mainnet-beta.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5",{"encoding":"jsonParsed"}]}'
# → "owner": "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"

# 2. Confirm LP tokens are burned (supply = 0)
curl -X POST https://api.mainnet-beta.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V"]}'
# → "amount": "0"

# 3. Check current reserves via DexScreener
curl "https://api.dexscreener.com/tokens/v1/solana/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump"
```
