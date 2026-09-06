# Solana wrapper runbook

Use LayerZero's official `oft-solana` CLI and program; do not deploy a custom bridge program.

1. Initialize a new OFT mint and OFT Store in mint/burn mode for the wrapper.
2. Set the OFT Store admin and mint authority to a Squads-controlled authority.
3. Configure the Robinhood LayerZero EID in both outbound and inbound PeerConfig accounts.
4. Apply matching inbound/outbound limits before the peer is opened.
5. Configure at least two independent DVNs and enforced executor options.
6. Verify the Robinhood adapter address encoded as 32 bytes, then set peers on both sides as the final activation transaction.
7. Run a small round trip, exercise the emergency pause, and verify that the message can be retried safely after unpause.

The final mint, OFT Store, PeerConfig accounts, multisig vault and transaction signatures must be published in `config/token.json` before the web route is enabled.
