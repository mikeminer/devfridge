# @frigopastabot

Official Telegram bot for DevFridge + $PASTA. Speaks like an Italian who understands DeFi. Same scanner data as [scan.devfridge.cool](https://scan.devfridge.cool/). Official contacts only: [connect.devfridge.cool](https://connect.devfridge.cool/).

## Run locally

```bash
cd bot
npm install
cp .env.example .env
# set TELEGRAM_BOT_TOKEN (and HELIUS_API_KEY if you have one)
npm run dev
```

Without `WEBHOOK_URL` the bot uses long polling (good for local).

## Commands

`/pasta` `/burn` `/buy` `/holders` `/vault` `/roadmap` `/about`
`/scan <mint>` `/fridge <mint>` `/badge <mint>` `/aiprompt <mint>`
`/recent` `/boosted` `/boost` `/lock` `/register <vault_pda>` `/help`

## Production (Railway / Fly)

Needs a **persistent process** (not Vercel) for cron:

- vault poll every 1 min
- expiry DMs daily / hourly
- $PASTA ±20% and burn/boost alerts

Set:

```
TELEGRAM_BOT_TOKEN
TELEGRAM_ALERTS_CHANNEL_ID   # optional broadcast chat id
TELEGRAM_WEBHOOK_SECRET
WEBHOOK_URL                  # https://your-app.up.railway.app
HELIUS_API_KEY               # optional, better holders/burns
```

Point BotFather webhook is set automatically when `WEBHOOK_URL` is present.

Telegram: [t.me/frigopastabot](https://t.me/frigopastabot). Display name **FrigoPasta**. Add it to the alerts channel as admin if you want broadcasts.

There is no Supabase here: recent/boosted are read from scan.devfridge.cool; registrations and broadcast dedupe live in `data/store.json`.
