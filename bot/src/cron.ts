import cron from "node-cron";
import type { Bot } from "grammy";
import { ALERTS_CHANNEL, PASTA_MINT, SCANNER_URL } from "./config.js";
import { listAllLocks } from "./lib/locks.js";
import { apiBoosted, apiPasta } from "./lib/scanApi.js";
import {
  addBroadcast,
  alreadyBroadcast,
  knownVaults,
  listAlerts,
  markAlertSent,
  pastaPriceState,
  rememberVaults,
  setPastaPrice,
} from "./lib/store.js";
import { pastaBurns } from "./lib/onchain.js";
import { fmtUnlock, shortKey } from "./lib/format.js";

async function shout(bot: Bot, text: string) {
  if (!ALERTS_CHANNEL) return;
  await bot.api.sendMessage(ALERTS_CHANNEL, text, { link_preview_options: { is_disabled: true } });
}

export function startCron(bot: Bot) {
  cron.schedule("* * * * *", () => {
    void pollVaults(bot).catch((err) => console.error("vault poll", err));
  });
  cron.schedule("0 * * * *", () => {
    void expiryPass(bot, 24).catch((err) => console.error("24h expiry", err));
  });
  cron.schedule("0 9 * * *", () => {
    void expiryPass(bot, 7 * 24).catch((err) => console.error("7d expiry", err));
  });
  cron.schedule("*/5 * * * *", () => {
    void priceAlert(bot).catch((err) => console.error("price", err));
    void burnAlert(bot).catch((err) => console.error("burn", err));
    void boostAlert(bot).catch((err) => console.error("boost", err));
  });
}

async function pollVaults(bot: Bot) {
  const locks = await listAllLocks();
  const now = Math.floor(Date.now() / 1000);
  const ids = locks.map((l) => l.address);
  const prev = new Set(knownVaults());
  if (prev.size === 0) {
    rememberVaults(ids);
    return;
  }
  for (const lock of locks) {
    if (prev.has(lock.address)) continue;
    if (lock.unlockAt <= now) continue;
    if (alreadyBroadcast("new_vault", lock.address)) continue;
    const date = fmtUnlock(lock.unlockAt);
    await shout(
      bot,
      `🧊 New token fridged: ${shortKey(lock.mint)} — locked until ${date} — ${SCANNER_URL}/t/${lock.mint}`
    );
    addBroadcast({ eventType: "new_vault", mint: lock.mint, vaultPda: lock.address, at: Date.now(), channel: ALERTS_CHANNEL });
  }
  for (const lock of locks) {
    if (lock.unlockAt > now) continue;
    if (alreadyBroadcast("expired", lock.address)) continue;
    await shout(
      bot,
      `🔓 ${shortKey(lock.mint)} fridge expired. Dev can now withdraw. Was fridged until ${fmtUnlock(lock.unlockAt)}.`
    );
    addBroadcast({ eventType: "expired", mint: lock.mint, vaultPda: lock.address, at: Date.now(), channel: ALERTS_CHANNEL });
  }
  rememberVaults(ids);
}

async function expiryPass(bot: Bot, hours: number) {
  const locks = await listAllLocks();
  const now = Math.floor(Date.now() / 1000);
  const until = now + hours * 3600;
  const kind = hours <= 24 ? "expiring_24h" : "expiring_7d";
  for (const lock of locks) {
    if (lock.unlockAt <= now || lock.unlockAt > until) continue;
    if (alreadyBroadcast(kind, lock.address)) continue;
    if (hours <= 24) {
      await shout(
        bot,
        `🚨 ${shortKey(lock.mint)} fridge expires in 24h. Dev can withdraw soon.`
      );
    }
    for (const alert of listAlerts().filter((a) => a.vaultPda === lock.address)) {
      if (alert.alertsSent.includes(kind)) continue;
      const text =
        hours <= 24
          ? `🚨 Your ${shortKey(lock.mint)} vault expires in 24h.`
          : `⏰ Your ${shortKey(lock.mint)} vault expires in 7 days. Renew on https://devfridge.cool`;
      try {
        await bot.api.sendMessage(alert.telegramId, text);
        markAlertSent(lock.address, kind);
      } catch {
        /* user blocked bot */
      }
    }
    addBroadcast({ eventType: kind, mint: lock.mint, vaultPda: lock.address, at: Date.now(), channel: ALERTS_CHANNEL });
  }
}

async function priceAlert(bot: Bot) {
  const pasta = await apiPasta();
  if (pasta.price == null) return;
  const prev = pastaPriceState();
  if (prev && prev > 0) {
    const chg = (pasta.price - prev) / prev;
    if (chg >= 0.2 && !alreadyBroadcast("price_up", String(Math.floor(Date.now() / 3600000)))) {
      await shout(bot, "📈 $PASTA +20% in the last hour. Al dente. 🍝");
      addBroadcast({ eventType: "price_up", mint: PASTA_MINT, at: Date.now(), channel: ALERTS_CHANNEL });
    } else if (chg <= -0.2 && !alreadyBroadcast("price_down", String(Math.floor(Date.now() / 3600000)))) {
      await shout(bot, "📉 $PASTA taking a dip. Accumulation time? 🍝");
      addBroadcast({ eventType: "price_down", mint: PASTA_MINT, at: Date.now(), channel: ALERTS_CHANNEL });
    }
  }
  setPastaPrice(pasta.price);
}

async function burnAlert(bot: Bot) {
  const { burned, history } = await pastaBurns();
  const last = history[0];
  if (!last) return;
  if (alreadyBroadcast("burn", last.sig || last.when.toString())) return;
  await shout(bot, `🔥 ${last.amount} $PASTA burned from boost fees. Total burned: ${burned}`);
  addBroadcast({
    eventType: "burn",
    mint: PASTA_MINT,
    vaultPda: last.sig,
    at: Date.now(),
    channel: ALERTS_CHANNEL,
  });
}

async function boostAlert(bot: Bot) {
  const rows = await apiBoosted();
  for (const t of rows) {
    const key = `${t.mint}:${t.expiresAt}`;
    if (alreadyBroadcast("boost", key)) continue;
    const fire = t.tier === "7d" ? "🔥🔥🔥" : t.tier === "48h" ? "🔥🔥" : "🔥";
    await shout(bot, `${fire} $${t.symbol || "TKN"} boosted for ${t.tier || "24h"} on ${SCANNER_URL}/t/${t.mint}`);
    addBroadcast({ eventType: "boost", mint: t.mint, vaultPda: key, at: Date.now(), channel: ALERTS_CHANNEL });
  }
}
