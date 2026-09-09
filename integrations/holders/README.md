# Verified reserve classification

The holder scan accepts SPL Token and Token-2022 mints without ticker, suffix or mint allowlists.
It enumerates the full mint-filtered token-account set, groups by spending authority and attributes
Fridge vaults to their depositors. Protocol reserves are separately classified using program-owned
state, mint/vault bindings and the actual token-account authority. Virtual reserves are never
counted as minted tokens. Classification does not establish that LP claims are locked or burned.

## Coverage

| Path | Verification |
| --- | --- |
| Pump.fun bonding curve, before/after completion | Official program, account discriminator, mint-derived curve PDA and token-program-specific ATA |
| PumpSwap graduation and secondary pools | Official program, Pool discriminator, pool PDA including index/creator/both mints, stored vault and ATA; any quote mint, either side |
| Historical Raydium AMM V4 migrations | Official program, initialized 752-byte state, authority nonce, mint-filtered pool discovery and stored vault |
| Raydium CPMM | Official program, PoolState discriminator, mint/token-program fields, authority nonce and vault PDA |
| Raydium CLMM | Official program, PoolState discriminator, mint fields, pool authority and vault PDA |
| Orca Whirlpool | Official program, discriminator, pool PDA/fee-tier seed/bump, mint fields and stored vault |
| Meteora DLMM | Official program, LbPair discriminator, mint fields, reserve PDA and pool authority |

Pool discovery uses the authorities of positive-balance token accounts, so secondary pools and
arbitrary quote mints do not require an external DEX index. Shared Raydium authorities additionally
require mint-filtered pool-state enumeration on both sides. Unknown programs are not excluded.
Unmapped shared Raydium custody remains included and disclosed. The concentration grade is unknown
if the grade differs with versus without those uncertain balances.

## Completeness and timing

- No fixed 100,000-account cutoff or largest-20 extrapolation. Only the required 109-byte token
  header is downloaded (mint, authority, amount and initialized/frozen state).
- Full account reads have a 30-second per-provider timeout. Other RPC reads retain 6 seconds;
  successful requests cancel their outstanding alternatives. Report functions have 60 seconds.
- Supply is reread after account enumeration using `minContextSlot`; the exact sum of account
  balances must equal that supply. Duplicate, incomplete or malformed results fail closed.
- `observedSlot`, `supplyObservedSlot` and `classificationSlot` identify separate confirmed RPC
  observations. This is not an atomic snapshot or cryptographic inclusion proof.
- RPC limits, concurrent burns, transfer-fee withholding or unsupported layouts can still produce
  unavailable data. Support is not a guarantee that every provider serves every mint at every time.
- Custodial accounts and unsupported protocols may remain included. On-chain owners do not establish
  independent people or ultimate beneficial ownership. Percentages use total mint supply, not a
  denominator reduced by locked balances or reserves.

## Validation

`fixtures/mainnet.json` records public state/vault observations for PASTA PumpSwap, an active
Token-2022 Pump.fun curve, and Fartcoin Raydium V4/CPMM pools. Each observation carries its slot.
Synthetic cases cover both mint sides, arbitrary quote mints, SPL/Token-2022 curves, secondary
PumpSwap pools, CLMM, Whirlpool, DLMM, forged authorities/vaults and more than 100,000 accounts.

Run `node --test scan/tests/*.test.cjs` with Node 24 and `npm run build --prefix scan`.

## Primary layout references

Reviewed 2026-09-09; appended fields are accepted where prefix layouts remain compatible.

- [Pump program and historical migration](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md)
- [Pump IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json)
- [PumpSwap state and PDA](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_SWAP_README.md)
- [Raydium V4 layout](https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/raydium/liquidity/layout.ts)
- [Raydium CPMM state](https://github.com/raydium-io/raydium-cp-swap/blob/master/programs/cp-swap/src/states/pool.rs)
- [Raydium CLMM state](https://github.com/raydium-io/raydium-clmm/blob/master/programs/amm/src/states/pool.rs)
- [Orca Whirlpool state](https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/whirlpool.rs)
- [Meteora DLMM IDL](https://github.com/MeteoraAg/dlmm-sdk/blob/main/idls/dlmm.json)
