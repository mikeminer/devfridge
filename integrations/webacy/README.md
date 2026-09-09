# DevFridge protocol evidence for Solana risk engines

Integration proposal, not an accepted Webacy partnership or a request to whitelist a token.

This adapter verifies DevFridge Token-2022 lock accounts and canonical PumpSwap graduation pools directly from Solana account state. It works for any supported mint; PASTA is a reproducible example, not a special case in the decoder. Webacy retains control of its proprietary risk scores and labels.

## Reproduce

Use Node.js 24 or newer (native TypeScript stripping) and the dependencies in `scan/package-lock.json`:

```sh
cd scan
npm ci
node --test tests/solana-evidence.test.cjs
export SOLANA_RPC_URL='https://YOUR_MAINNET_RPC'
node scripts/collect-lock-evidence.cjs BiYiPVevNJfdJoMewoaSTzPF7bmdtLi4JH4JrGNxS3KC evidence.json
```

PowerShell: use `$env:SOLANA_RPC_URL='https://YOUR_MAINNET_RPC'` instead of `export`. The CLI requires no wallet or signature and never writes RPC URLs or API keys into its output. RPC HTTP requests are read-only. It fails explicitly on transport/provider errors. A missing account is `absent`, never automatically `claimed`.

Implementation: [`scan/lib/solana-evidence.ts`](../../scan/lib/solana-evidence.ts). Exported `collectLockEvidence(rpc, lockPda)` takes an injectable JSON-RPC transport; `verifyLockSnapshot(address, keys, snapshot)` is pure and can be run offline. Import the TypeScript module using your normal build tool. Integer balances, supply and lock IDs use decimal strings to avoid JavaScript precision loss. Do not convert them to floating point before aggregation.

## Evidence and trust boundary

- Checks program owner, executable flag, the supported 105-byte Lock layout, discriminator, PDA seeds and bump.
- Binds the lock's mint and depositor to its Token-2022 associated vault; checks initialized token/mint state, actual balance, vault owner and mint.
- Uses Solana Clock time and a single finalized `getMultipleAccounts` snapshot for lock, mint, vault, program and ProgramData. An initial discovery read supplies addresses; the final read revalidates them with `minContextSlot`.
- Returns `active` or `expired_unclaimed`. An expired account is still held in a vault; a claim requires successful transaction evidence, which this state-only adapter does not collect.
- Retains depositor/beneficiary attribution. `ownershipExcluded: false` means a lock does not erase economic ownership or historic connections.
- Includes upgrade authority, mint/freeze authorities, vault delegate/close authority, frozen state, extension IDs and caveats. This is account-state evidence, not an audit or reproducible-bytecode verification. An upgradeable program can change behavior. Unreviewed extensions may restrict or override transfer/burn behavior.
- Separately verifies canonical PumpSwap pool PDA, base and quote reserve bindings and LP mint supply. Only index-0 WSOL graduation pools are discovered; other pools require separate enumeration. A missing canonical pool does not establish absent liquidity. Zero LP mint supply describes one snapshot, not future supply, immutable program behavior, price protection or deep liquidity.
- On-chain immutable metadata does not imply an immutable HTTP resource at its URI.

The collector trusts the configured RPC's account data and finality claims. Run against independent RPC providers to corroborate it; the saved JSON is not a cryptographic inclusion proof.

## PASTA example: 9 September 2026

Mint identity: `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`.

The raw fixture is [`fixtures/pasta-mainnet.json`](fixtures/pasta-mainnet.json). It was collected using the public read-only proxy at `https://scan.devfridge.cool/api/rpc`; use your own RPC to reproduce independently. The lock snapshot is finalized slot **445691026**; the separate pool snapshot is slot **445691030**. The snapshots are four slots apart and are not a single simultaneous global state.

| Observation | Value |
| --- | --- |
| Mint supply | 963,341,299.999043 PASTA, 6 decimals |
| Canonical PumpSwap pool | `5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5` |
| Pool PASTA reserve | 739,503,947.925919 PASTA, about 76.7645% of observed supply |
| Pool WSOL reserve | 7.417087425 SOL |
| LP mint | `9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V` |
| LP mint supply | 0 |
| Lock PDA | `BiYiPVevNJfdJoMewoaSTzPF7bmdtLi4JH4JrGNxS3KC` |
| Actual vault balance | 100,000,000 PASTA, about 10.3805% of observed supply |
| Vault token account | `3ivooMZKMC4bwBNbDZSkbn4vtVy5sfNWFmUZVZ1rreCq` |
| Beneficiary | `GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W` |
| Unlock time | 18 August 2027, 22:02:00 UTC |
| Fridge upgrade authority | `7rXYtcws1sHW5Hhgx79AeMQYGfTtREzyvWq63FVpSyUY` |
| Mint, freeze, metadata pointer/update authorities | Revoked at the snapshot |

In the observed Webacy UI, these two owner addresses appeared among top holders with approximately 76.76% and 10.38%. The balances themselves agree with chain state. The request is to clarify protocol-account classification and the meaning of concentration, not to assert that these balances are wrong. This adapter does not reproduce Webacy's proprietary score or establish whether its internal engine already applies adjustments not visible in the UI.

Do not subtract these percentages from an existing top-10 figure and call the result a recomputed top 10. Re-rank the complete eligible population, group token accounts by beneficial owner where supportable, disclose denominator and coverage, and show separately:

1. raw account distribution;
2. protocol reserves;
3. beneficial ownership concentration (including locked balances);
4. currently transferable balances and unlock schedule, subject to program/extension controls.

Historical bundling, sniping and coordinated ownership are separate questions. A later lock does not disprove historical activity. Ask for the relevant time window, denominator, confidence and transaction evidence rather than deleting those signals.

## Corrections in DevFridge Scan accompanying this proposal

Scan now uses canonical PumpSwap account verification as a fallback when market providers fail; it distinguishes unobserved liquidity from proven absence. Token-2022 extension types are read from the TLV region, metadata pointer and update authorities are evaluated separately, and Metaplex's mutability flag is read after its variable-length fields. Missing price data no longer implies low liquidity.

The existing top-10 Scan metric still excludes Fridge vault accounts and does not aggregate beneficial owners or remove all protocol reserves. It is not the complete four-part methodology above. This limitation must not be used as evidence that one scanner's overall grade is authoritative.

## Proposed Webacy integration

Ask maintainers which protocol-data ingestion interface and repository they accept. The open SDK is an API client; SDK-only changes do not modify DD's backend classification. An agreed contribution could be an example consuming these verified records, typed fields for an accepted API schema, or protocol fixtures/decoder in a repository they nominate. Do not invent Webacy response fields or silently rewrite their risk scores client-side.

Acceptance criteria: protocol accounts labeled explicitly; beneficiaries retained; expired/claimed states separated; stale or failed reads shown as unknown; decoder rejects forged bindings; history labels retain their own windows; no mint-specific safe-list.

All code remains subject to the repository's existing license. Do not assume it can be copied into Webacy's MIT SDK without agreeing compatible licensing with the project owner.

## Primary references

- [Webacy architecture and protocol-specific data](https://docs.webacy.com/what-technology-does-webacy-build-in-house)
- [Webacy contribution guide](https://github.com/Webacy-Prod/sdk/blob/staging/CONTRIBUTING.md)
- [Webacy developer portal](https://developers.webacy.co/)
- [DevFridge program source](../../programs/fridge/src/lib.rs)
- [PumpSwap official IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump_amm.json)
- [Solana metadata extensions](https://solana.com/docs/tokens/extensions/metadata)
- [DevFridge official contacts](https://connect.devfridge.cool/)
