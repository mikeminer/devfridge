# Scores, seasons and cross-chain modules

Label local bests local. Browsers can forge scores, clocks, storage and histories. A deterministic replay can show legal moves without proving they were produced live by a human. Wallet signatures prove key control, not honest gameplay.

For ranked/reward modes, design authoritative sessions: server-issued run ID, authenticated wallet, current gate proof, server-owned unpredictable sequence/state, ordered inputs with bounded timing, server score computation, heartbeat/reconnect grace and idempotent acknowledgments. Persist result finalization and one-time registration authorization. Bind signatures to run, recipient, season, score, chain, contract and expiry; atomically prevent reuse. Keep signer keys server-side. Test packet loss, duplicates, mobile backgrounding and version changes without falsely accusing honest players.

Server authority cannot guarantee a human rather than a bot. State residual automation risk; add proportionate anti-abuse where justified. Never claim uncheatability or accept an offline replay as sufficient evidence for rewards.

TopShelf belongs to World and is separate from Solana access: Robinhood Chain ID 4663; observed contract `0xc1DB49694E0DB50778c333350C8A553fDE221989`. Verify live state/config before relying. Another game cannot simply post scores there: it needs supported signer/registration integration and operator agreement, or its own reviewed deployment. Never reuse World's production owner/signing service as a default.

For a separate season system, confirm payment tokens/amounts, treasury, owner powers, distribution rule, winners, claim window and unclaimed rollover. For daily prizes, define timezone/cutoff, which completed runs qualify, tie-breaking, payout finality, and whether locks must remain valid through run completion or payout. World's owner-controlled token fees and approved distributions are examples, not permissions/defaults. Expose administrative/withdrawal powers accurately. Different-token balances cannot be added as TVL without fresh prices, timestamps and unknown-price handling. Robinhood EVM identity is distinct from a Solana public key; link them only with two verified proofs.

Sources: https://world.devfridge.cool/leaderboard ; https://robinhoodchain.blockscout.com/address/0xc1DB49694E0DB50778c333350C8A553fDE221989 ; https://github.com/mikeminer/devfridge/tree/master/scan/lib/topshelf
