# DevFridge canonical OFT bridge

Reference implementation for canonical token routes using LayerZero V2 OFT. The canonical ERC-20 is locked in `CanonicalOFTAdapter`; remote representations are minted and burned by the official OFT implementation. The safety layer is fail-closed: every inbound and outbound EID needs a configured limit before value can move.

## Controls

- The LayerZero delegate and contract owner must be the same published governor address.
- The current launch profile uses one EOA governor per chain; migration to multisig remains possible through ownership transfer.
- Only the governor can change peers, limits, guardian or unpause the bridge.
- The emergency guardian can pause immediately, but cannot unpause or alter configuration.
- Inbound and outbound flow limits use independent linearly-decaying buckets.
- Unknown EIDs have zero capacity.

## TMC topology

The topology treats the existing Robinhood Chain TMC contract as canonical. Its adapter escrows TMC on chain 4663. On Solana, the official LayerZero Solana OFT program mints and burns a new wrapper controlled by an OFT Store. The legacy Solana mint `EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump` has revoked mint authority and an independent fixed supply, so it must never be configured as the OFT wrapper.

Official LayerZero mainnet parameters verified on 2026-09-06: Robinhood EID `30416`, Endpoint V2 `0x6f475642a6e85809b1c36fa62763669b1b48dd5b`; Solana EID `30168`, Endpoint `76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6`.

## Deployment gates

1. Confirm the canonical-chain declaration and publish a supply reconciliation.
2. Publish the governor addresses and fund them with native gas; the initial profile is mono-address governance.
3. Obtain the current LayerZero V2 Endpoint/EIDs from the official deployment registry; never infer an EID from chain ID.
4. Select at least two independent DVNs and set enforced receive options.
5. Deploy on testnet, run round-trip and pause/retry tests, then commission an external audit.
6. Deploy the Robinhood adapter with `npm run deploy:robinhood` and initialize the Solana OFT Store with the official LayerZero tooling.
7. Set peers last, from both multisigs, after byte-for-byte address verification.

No mainnet deployment script contains a private key or a hard-coded Endpoint. Environment validation refuses EOAs as the EVM governor.
