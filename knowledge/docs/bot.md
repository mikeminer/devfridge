---
type: "Documentation"
title: "@frigopastabot"
description: "DevFridge investor knowledge: @frigopastabot"
resource: "https://docs.devfridge.cool/bot"
tags: ["devfridge", "investors"]
timestamp: "2026-09-09T06:59:27Z"
generated: true
---

# @frigopastabot

Published documentation snapshot; source claims are not independent verification.

[Canonical page](https://docs.devfridge.cool/bot) · ok · last successful observation: 2026-09-09T06:59:27Z · last attempt: 2026-09-09T06:59:27Z.

TELEGRAM BOT

## @frigopastabot

DevFridge $PASTA · Solana mint: [`39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`](https://docs.devfridge.cool/program) · Ticker ≠ identity.

[bot.devfridge.cool](https://bot.devfridge.cool) is the landing page. [t.me/frigopastabot](https://t.me/frigopastabot) opens the bot directly in Telegram.

FrigoPasta is the official DevFridge Telegram bot. It is completely free — no premium tiers, no token gates, no hidden fees. It works in private chats, groups, and channels.

### Add to your group

- Open [t.me/frigopastabot?startgroup=true](https://t.me/frigopastabot?startgroup=true) — Telegram will ask which group to add it to.

- Select your group and confirm. The bot does not need admin rights. It only reads messages that start with `/`.

- Type `/help` in the group. Every member can now use all commands.

To use it in a channel, add @frigopastabot as a channel admin. This enables broadcast alerts for boosts, burns, and $PASTA price moves.

### Commands — $PASTA

`/pasta` and `/buy` print the full Solana mint in the first line so copied messages and screenshots identify the token. A ticker alone is not an identity.

| Command | What it does |
| --- | --- |
| /pasta | Live price, market cap, 24h volume, burned supply, holder count. |
| /burn | Total $PASTA burned and recent burn history (requires Helius for history). |
| /buy | Direct swap links on Jupiter, DexScreener, and Birdeye. |
| /holders | Top 10 holder distribution with concentration grade (safe / caution / danger). |
| /vault | TRUST ME CAPITAL vault on Hyperliquid — leader address, APR, deposit link. |
| /roadmap | Current ecosystem roadmap. |
| /about | What is DevFridge and $PASTA — quick explainer. |

### Commands — Fridge and Scanner

| Command | What it does |
| --- | --- |
| /scan <mint> | Full trust report: authorities, holder concentration, market data, and Fridge lock status. Same data as scan.devfridge.cool. |
| /fridge <mint> | Quick fridge check — fridged, expired, or not fridged. Shows locked amount and unlock date. |
| /badge <mint> | Returns an HTML embed snippet for a live Fridge badge. Copy-paste into any website. |
| /aiprompt <mint> | Copy-paste prompt to integrate the badge using ChatGPT, Claude, Grok, or Cursor. |
| /recent | Last 10 tokens scanned on the platform. |
| /boosted | Currently boosted tokens with tier and time remaining. |
| /boost | Boost tiers and pricing — how to feature a token on the scanner. |
| /lock | Step-by-step guide to locking tokens in the Fridge. |
| /register <pda> | Register the Fridge lock account PDA, not the token mint, for expiry DM alerts. |

### How /scan works

When a user sends `/scan` followed by a Solana mint address, the bot calls the same API that powers scan.devfridge.cool. The response includes:

- Fridge status — fridged (with locked amount, unlock date, depositor, PDA), expired, or not fridged.

- Security checks — mint authority, freeze authority, top holder concentration, and other risk signals with safe / caution / danger grades.

- Market data — price, market cap, 24h volume, holder count, token age, and platform.

The report is posted inline so the entire group can see it. Two buttons link to the full web report and a direct "Fridge it" action.

You can also reply to a message containing a mint address and type `/scan` — the bot extracts the mint from the replied message.

### How /register works

Token devs who have locked supply in the Fridge can register for expiry alerts. Send `/register` followed by the vault PDA (the on-chain lock account address), not your token mint. Copy the full lock PDA from your scan report. The bot verifies it on-chain and stores your Telegram ID. You will receive DMs as the unlock date approaches.

Alerts are sent daily and then hourly in the final 24 hours before unlock. This ensures devs never miss a claim window or forget to re-lock.

### Language support

The bot detects Italian and English automatically from the message text and Telegram language setting. Status messages, error replies, and flavor text adapt to the detected language.

### Rate limiting

To prevent spam and protect the Solana RPC, each user is limited to one `/scan` or `/fridge` call every 10 seconds. Other commands have no cooldown. This keeps the bot responsive in large groups.

### Privacy and permissions

- The bot does not need admin rights in groups.

- It only processes messages that start with `/` — it never reads regular chat.

- No wallet connection is required. The bot is read-only and cannot execute transactions.

- No data is sold or shared. Registered alert PDAs and Telegram IDs are stored locally on the bot server.

### Pros

- Instant trust reports without leaving Telegram.

- Same scanner data as scan.devfridge.cool — live on-chain.

- Works in any group, channel, or private chat.

- Bilingual — responds in English and Italian.

- Expiry DM alerts so devs never miss an unlock.

- No sign-up, no wallet connection, no permissions needed.

- Badge and AI prompt generation in one command.

- 10-second cooldown prevents spam in public groups.

### Limitations

- Token pricing depends on Jupiter and DexScreener — very new tokens may show no price yet.

- Burn history requires Helius RPC — without it only the total burned amount is shown.

- Rate-limited to one scan per 10 seconds per user to protect the RPC.

- Cannot execute on-chain transactions — it is read-only and informational.

- Telegram-only — no Discord or Slack version at this time.

### Links

- [t.me/frigopastabot](https://t.me/frigopastabot) — open the bot

- [Add to your group](https://t.me/frigopastabot?startgroup=true)

- [bot.devfridge.cool](https://bot.devfridge.cool) — landing page

- [connect.devfridge.cool](https://connect.devfridge.cool) — all official contacts

[Repository page source](https://github.com/mikeminer/devfridge/blob/master/scan/app/docs/bot/page.tsx) — deployed content can differ from the committed source.
