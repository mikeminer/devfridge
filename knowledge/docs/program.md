---
type: "Documentation"
title: "Program IDs and fees"
description: "DevFridge investor knowledge: Program IDs and fees"
resource: "https://docs.devfridge.cool/program"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T07:42:35Z"
generated: true
---

# Program IDs and fees

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/program) · ok · last successful observation: 2026-09-09T07:42:35Z · last attempt: 2026-09-09T07:42:35Z.

ON-CHAIN

## Program IDs and fees

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

Not affiliated with any other token using the PASTA ticker.

The Solana mint above identifies the $PASTA tied to DevFridge. Match the full address before using a swap link; token names, tickers, and logos can be reused.

| Item | Value |
| --- | --- |
| Fridge program | 9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6 |
| $PASTA mint | 39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump |
| Treasury / dev | GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W |
| Claim fee | 2% buyback-and-burn $PASTA |
| Feature | 0.1 SOL / 24h · 0.18 SOL / 48h · 0.5 SOL / 7d, plus network fees → $PASTA burn |

### Verify the buyback burn identity

Burn authority PDA: [`6PQhfXQNnqrau7EKjFxrH6xwX3uv97RMsx62LmKBmT9m`](https://solscan.io/account/6PQhfXQNnqrau7EKjFxrH6xwX3uv97RMsx62LmKBmT9m). Derive it from the UTF-8 seed `burn` and the Fridge program ID above. This authority is distinct from a user's lock PDA and the incinerator address.

In the published [program source](https://github.com/mikeminer/devfridge/blob/master/programs/fridge/src/lib.rs), `PASTA_MINT` is fixed to `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`. Both `crank_buyback` and `buyback_and_burn_pasta` check this mint and the token account's burn authority before invoking Token-2022 Burn.

To verify an actual burn, inspect a successful transaction from this program: its inner Token-2022 Burn instruction must name that mint and the derived authority. The PDA alone does not prove which mint was burned. Source checks describe this version; verify the deployed program and its upgrade authority before assuming future behavior.

[Example verified mainnet burn](https://solscan.io/tx/8ed3v9zmo2G9hZwVrQrUmpaiXFFcoopr18X4XVu9cmYRttYW2eEmCn6W4iKAoB7r5fCbw3U6sUMZtTAgTW8rBnv): slot `441452166`, successful transaction, with an inner Token-2022 Burn naming this mint and burn authority. It burned `801223464986` base units (801,223.464986 PASTA at 6 decimals).

Source: [github.com/mikeminer/devfridge](https://github.com/mikeminer/devfridge). Official socials and the bot: [connect.devfridge.cool](https://connect.devfridge.cool).

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/program/page.tsx) — deployed content can differ from the committed source.
