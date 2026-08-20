import express from "express";
import { Bot, webhookCallback } from "grammy";
import { ALERTS_CHANNEL, PORT, TOKEN, WEBHOOK_SECRET, WEBHOOK_URL } from "./config.js";
import { registerCommands } from "./commands.js";
import { startCron } from "./cron.js";

if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and fill it.");
  process.exit(1);
}

const bot = new Bot(TOKEN);

bot.use(async (ctx, next) => {
  const type = ctx.chat?.type;
  if (!type || type === "private") return next();
  const text = ctx.message?.text || ctx.update.message?.text || "";
  const me = ctx.me.username ? `@${ctx.me.username}` : "@PastaBot";
  const isCmd = text.startsWith("/");
  const replyToBot = ctx.message?.reply_to_message?.from?.id === ctx.me.id;
  const mentioned = text.toLowerCase().includes(me.toLowerCase());
  if (isCmd || replyToBot || mentioned) return next();
});

registerCommands(bot);

bot.catch((err) => {
  console.error("bot error", err.error);
});

void bot.api.setMyCommands([
  { command: "pasta", description: "$PASTA price + stats" },
  { command: "scan", description: "Full trust report for a mint" },
  { command: "fridge", description: "Quick fridge check" },
  { command: "buy", description: "Buy $PASTA" },
  { command: "burn", description: "Burn tracker" },
  { command: "badge", description: "Embeddable Fridge badge" },
  { command: "recent", description: "Recent scans" },
  { command: "boosted", description: "Active boosts" },
  { command: "help", description: "All commands" },
]);

startCron(bot);

const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true, alerts: Boolean(ALERTS_CHANNEL) }));

if (WEBHOOK_URL && WEBHOOK_SECRET) {
  app.use(`/webhook/${WEBHOOK_SECRET}`, webhookCallback(bot, "express"));
  app.listen(PORT, async () => {
    const url = `${WEBHOOK_URL.replace(/\/$/, "")}/webhook/${WEBHOOK_SECRET}`;
    await bot.api.setWebhook(url);
    console.log(`PastaBot webhook on :${PORT} → ${url}`);
  });
} else {
  app.listen(PORT, () => console.log(`health on :${PORT}`));
  void bot.start({
    onStart: (info) => console.log(`PastaBot polling as @${info.username}`),
  });
}

process.on("SIGINT", () => {
  void bot.stop();
  process.exit(0);
});
