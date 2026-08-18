# DevFridge

Too many tokens? Fridge them.

Solana Anchor dApp for time-locking **Token-2022** balances.

License: [Business Source License 1.1](LICENSE) (converts to GPL-2.0-or-later on 2030-08-18).

Any wallet can create multiple independent locks by pasting a mint address, choosing a positive amount, and setting an unlock date. Tokens move into a PDA-owned associated token vault. Only the original depositor can claim, and only after `unlock_at`. Claim closes the vault and the lock PDA so rent returns to the depositor.

## Program

- Program ID: `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`
- Keypair: `target/deploy/fridge-keypair.json`
- PDA seeds: `["lock", depositor, mint, lock_id_le_bytes]`
- Token program: Token-2022 only (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Stored lock fields: `depositor`, `mint`, `amount`, `created_at`, `unlock_at`, `bump`, plus `lock_id` so each lock stays unique and claimable.

`create_lock` rejects zero amounts, past unlock times, wrong mint/ATA/authority, and non-Token-2022 mints. Transfers use `transfer_checked`. The amount stored is the vault balance after the deposit (so transfer-fee mints record what actually arrived).

Redeeming takes a **2% fee** that **buys and burns $PASTA** (`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`):

- If the lock is PASTA, the program burns 2% from the vault.
- If the lock is another Token-2022, the program swaps 2% to PASTA through Jupiter and burns the output.

## Frontend

Phantom wallet adapter, mint lookup, amount + date presets, lock list, and claim.

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173

## Deploy

Requires Solana CLI + Anchor 0.30.1.

```bash
solana config set --url devnet
anchor build
anchor deploy --program-keypair target/deploy/fridge-keypair.json
```

Then set the program ID in the dApp **Program & RPC** panel. Use a private RPC if lock listing fails (`getProgramAccounts` is often blocked on public endpoints).

## Tests

```bash
cargo test --manifest-path programs/fridge/Cargo.toml --lib
cd app && npm test
```
