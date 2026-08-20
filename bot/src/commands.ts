import { Bot, InlineKeyboard, type Context } from "grammy";
import {
  CONNECT_URL,
  FRIDGE_URL,
  PASTA_MINT,
  SCANNER_URL,
  TRUST_ME_LEADER,
  TRUST_ME_VAULT,
} from "./config.js";
import { detectLang, say, type Lang } from "./voice.js";
import { ago, esc, fmtAmt, fmtUnlock, money, parseMint, remaining, shortKey } from "./lib/format.js";
import { apiBoosted, apiFridge, apiPasta, apiRecent, apiScan, dex } from "./lib/scanApi.js";
import { pastaBurns, pastaHolders } from "./lib/onchain.js";
import { vaultDetails } from "./lib/vault.js";
import { addAlert } from "./lib/store.js";
import { decodeLock } from "./lib/locks.js";
import { rpc } from "./lib/rpc.js";

const scanCooldown = new Map<number, number>();

function langOf(ctx: Context): Lang {
  return detectLang(ctx.message?.text || "", ctx.from?.language_code);
}

function mintArg(ctx: Context): string | null {
  const match = typeof ctx.match === "string" ? ctx.match : "";
  const fromCmd = parseMint(match);
  if (fromCmd) return fromCmd;
  const reply = ctx.message?.reply_to_message?.text || "";
  return parseMint(reply);
}

function tooSoon(ctx: Context): boolean {
  const id = ctx.from?.id;
  if (!id) return false;
  const last = scanCooldown.get(id) || 0;
  if (Date.now() - last < 10_000) return true;
  scanCooldown.set(id, Date.now());
  return false;
}

function icon(level: string): string {
  if (level === "safe") return "✅";
  if (level === "danger") return "❌";
  return "⚠️";
}

export function registerCommands(bot: Bot) {
  bot.command("start", async (ctx) => {
    const l = langOf(ctx);
    await ctx.reply(
      `${say.ciao(l)}\n\n` +
        (l === "it"
          ? "Io sono @PastaBot — il sous-chef di DevFridge e $PASTA.\nUnico punto ufficiale: " +
            CONNECT_URL +
            "\n\nProva /pasta o /help."
          : "I'm @PastaBot — sous-chef for DevFridge and $PASTA.\nOnly official door: " +
            CONNECT_URL +
            "\n\nTry /pasta or /help."),
      { link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `🍝 @PastaBot — Al dente on-chain.\n\n` +
        `━━━━ 🍝 $PASTA ━━━━\n` +
        `/pasta      $PASTA price + stats\n` +
        `/burn       Burn tracker\n` +
        `/buy        Buy $PASTA\n` +
        `/holders    Holder distribution\n` +
        `/vault      TRUST ME CAPITAL vault\n` +
        `/roadmap    Ecosystem roadmap\n` +
        `/about      What is DevFridge?\n\n` +
        `━━━━ 🧊 FRIDGE / SCAN ━━━━\n` +
        `/scan &lt;mint&gt;      Full Trust Report\n` +
        `/fridge &lt;mint&gt;    Quick fridge check\n` +
        `/badge &lt;mint&gt;     Get embed snippet\n` +
        `/aiprompt &lt;mint&gt;  AI integration prompt\n` +
        `/recent           Recent scans\n` +
        `/boosted          Active boosts\n` +
        `/boost            How to boost\n` +
        `/lock             How to lock tokens\n` +
        `/register &lt;pda&gt;  Dev expiry DMs\n\n` +
        `━━━━ 🔗 Official door ━━━━\n` +
        `${CONNECT_URL}\n` +
        `${FRIDGE_URL}\n` +
        `${SCANNER_URL}\n\n` +
        `Non conosco questo piatto? Prova /help. 🍝`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("pasta", async (ctx) => {
    const l = langOf(ctx);
    await ctx.reply(say.cooking(l));
    try {
      const [pasta, market, holders] = await Promise.all([apiPasta(), dex(PASTA_MINT), pastaHolders()]);
      const price = pasta.price ?? market?.price ?? null;
      const mcap = market?.mcap ?? (price != null ? price * (holders.supply || 1e9) : null);
      const text =
        `🍝 <b>$PASTA</b> — Al dente on-chain.\n\n` +
        `💰 Price:      ${money(price)}\n` +
        `📊 Market Cap: ${money(mcap)}\n` +
        `📈 24h Vol:    ${money(market?.vol ?? null)}\n` +
        `🔥 Burned:     ${pasta.burned ?? "—"} PASTA\n` +
        `👥 Holders:    ${holders.holders?.toLocaleString() ?? "—"}\n` +
        `🏦 Supply:     ${(holders.supply || 0).toLocaleString()}\n\n` +
        `📍 Mint: <code>${PASTA_MINT}</code>\n` +
        `⚠️ Mint/freeze revocation in progress. Track on ${FRIDGE_URL}`;
      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .url("Jupiter", `https://jup.ag/swap/SOL-${PASTA_MINT}`)
          .url("DexScreener", `https://dexscreener.com/solana/${PASTA_MINT}`)
          .url("Birdeye", `https://birdeye.so/token/${PASTA_MINT}?chain=solana`),
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("buy", async (ctx) => {
    await ctx.reply(
      `🍝 Buy $PASTA — al dente, always.\n\nMint: <code>${PASTA_MINT}</code>\n\n⚠️ Mint/freeze authority revocation in progress.\nDYOR. Not financial advice.\n\nOfficial contacts: ${CONNECT_URL}`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .url("Jupiter Swap →", `https://jup.ag/swap/SOL-${PASTA_MINT}`)
          .row()
          .url("DexScreener →", `https://dexscreener.com/solana/${PASTA_MINT}`)
          .url("Birdeye →", `https://birdeye.so/token/${PASTA_MINT}?chain=solana`),
        link_preview_options: { is_disabled: true },
      }
    );
  });

  bot.command("burn", async (ctx) => {
    const l = langOf(ctx);
    await ctx.reply(say.cooking(l));
    try {
      const { burned, history } = await pastaBurns();
      const last = history[0];
      let body = `🔥 <b>$PASTA Burn Tracker</b>\n\nTotal burned:  ${burned} PASTA\n`;
      if (last) body += `Last burn:     ${ago(last.when)} — ${last.amount} PASTA\n`;
      if (history.length) {
        body += `\n🔥 Burn history (last ${history.length}):\n`;
        for (const h of history) body += `  • ${h.amount} PASTA — ${ago(h.when)}\n`;
      } else {
        body += `\nBurn history needs Helius — total is from the incinerator ATA.\n`;
      }
      body += `\nEvery boost on scan.devfridge.cool burns $PASTA.`;
      await ctx.reply(body, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("Scanner", SCANNER_URL),
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("holders", async (ctx) => {
    const l = langOf(ctx);
    await ctx.reply(say.cooking(l));
    try {
      const { top, top10, holders } = await pastaHolders();
      const medals = ["🥇", "🥈", "🥉"];
      const lines = top.map((r, i) => {
        const tag = medals[i] || `${i + 1}.`;
        return `${tag}  ${shortKey(r.address)} — ${r.pct.toFixed(1)}%`;
      });
      const flag = top10 > 70 ? "❌ DANGER" : top10 > 30 ? "⚠️ CAUTION" : "✅ SAFE";
      await ctx.reply(
        `👥 <b>$PASTA Holder Distribution</b>\n\nTotal holders: ${holders?.toLocaleString() ?? "—"}\nTop 10 concentration: ${top10.toFixed(1)}%\n\n${lines.join("\n")}\n\nConcentration: ${flag} ${top10 > 30 ? "(>30%)" : ""}`,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("vault", async (ctx) => {
    const v = await vaultDetails();
    const shortV = `${v.vault.slice(0, 6)}...${v.vault.slice(-4)}`;
    const shortL = `${v.leader.slice(0, 6)}...${v.leader.slice(-4)}`;
    const extra = v.ok && v.apr != null ? `\nAPR: ${(v.apr * 100).toFixed(1)}%` : "";
    await ctx.reply(
      `🏦 <b>TRUST ME CAPITAL Vault</b>\n   Hyperliquid Perpetuals\n\nLeader:  <code>${shortL}</code>\nVault:   <code>${shortV}</code>${extra}\n\n📊 Strategy: Long $PPUMP perps → USDC yield → $PASTA accumulation\n\n<code>${TRUST_ME_VAULT}</code>\n<code>${TRUST_ME_LEADER}</code>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .url("View on Hyperliquid →", `https://app.hyperliquid.xyz/vaults/${TRUST_ME_VAULT}`)
          .row()
          .url("Deposit →", `https://app.hyperliquid.xyz/vaults/${TRUST_ME_VAULT}`),
        link_preview_options: { is_disabled: true },
      }
    );
  });

  bot.command("roadmap", async (ctx) => {
    await ctx.reply(
      `🗺️ DevFridge + $PASTA Roadmap\n\n` +
        `✅ DONE\n` +
        `  • $FRIDGE Timelock Vault — mainnet live\n` +
        `  • ${FRIDGE_URL} — frontend live\n` +
        `  • $PASTA launched on pump.fun\n` +
        `  • TRUST ME CAPITAL vault — Hyperliquid live\n` +
        `  • ${SCANNER_URL} — scanner + badge + boost\n` +
        `  • ${CONNECT_URL} — only official contacts\n\n` +
        `🔨 IN PROGRESS\n` +
        `  • Mint/freeze authority revocation ($PASTA)\n` +
        `  • @PastaBot — this bot\n\n` +
        `🔜 NEXT\n` +
        `  • Freeze the program (immutable)\n` +
        `  • Dappster.fun integration\n` +
        `  • $PASTA DEX promotions\n\n` +
        `${CONNECT_URL}`,
      { link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("about", async (ctx) => {
    await ctx.reply(
      `🍝 What is DevFridge?\n\n` +
        `DevFridge is a Solana-native trust primitive.\n` +
        `Devs lock their token supply in a timelock vault.\n` +
        `The lock is verifiable onchain — no trust needed.\n\n` +
        `🧊 The Fridge Badge\nAny locked token gets a verifiable badge.\nEmbed it on your site, Linktree, docs, anywhere.\nOne &lt;img&gt; tag. No code. Free.\n\n` +
        `🍝 What is $PASTA?\nThe ecosystem token. Store of value.\nBoost fees on scan.devfridge.cool → $PASTA buyback + burn.\n\n` +
        `📍 Mint: <code>${PASTA_MINT}</code>\n\n` +
        `Official contacts (only these):\n${CONNECT_URL}`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("lock", async (ctx) => {
    await ctx.reply(
      `🧊 How to Fridge Your Tokens\n\n` +
        `1. Go to ${FRIDGE_URL}\n` +
        `2. Connect your wallet (Phantom / Backpack / Solflare)\n` +
        `3. Paste your Token-2022 mint address\n` +
        `4. Choose amount + lock duration\n` +
        `5. Sign the transaction\n\n` +
        `Your tokens are locked in the Anchor vault.\nCommunity can verify onchain anytime.\n\n` +
        `After locking → get your badge:\n/badge YOUR_MINT`,
      {
        reply_markup: new InlineKeyboard().url("Open the Fridge", FRIDGE_URL),
        link_preview_options: { is_disabled: true },
      }
    );
  });

  bot.command("boost", async (ctx) => {
    await ctx.reply(
      `🔥 Boost Your Token\n\nGet featured on scan.devfridge.cool\nBoost fees → $PASTA buyback + burn 🔥\n\nTiers:\n  🔥   24h — 0.1 SOL\n  🔥🔥  48h — 0.18 SOL\n  🔥🔥🔥 7d  — 0.5 SOL\n\nConnect wallet and boost →`,
      {
        reply_markup: new InlineKeyboard().url("Boost on scanner", `${SCANNER_URL}/#feature`),
        link_preview_options: { is_disabled: true },
      }
    );
  });

  bot.command("recent", async (ctx) => {
    const l = langOf(ctx);
    try {
      const rows = await apiRecent();
      if (!rows.length) {
        await ctx.reply(
          l === "it" ? "Nessuno scan in pentola ancora. Prova /scan." : "No scans in the pot yet. Try /scan."
        );
        return;
      }
      const lines = rows.slice(0, 10).map((t, i) => {
        const tag = t.fridged ? "🧊 FRIDGED" : "⚠️ NOT FRIDGED";
        const when = t.scannedAt ? ago(t.scannedAt) : "";
        return `${i + 1}. $${esc(t.symbol || "???")} — ${tag}${when ? ` — ${when}` : ""}`;
      });
      await ctx.reply(`🕐 Recent Scans\n\n${lines.join("\n")}`, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("Scanner", SCANNER_URL),
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("boosted", async (ctx) => {
    const l = langOf(ctx);
    try {
      const rows = await apiBoosted();
      if (!rows.length) {
        await ctx.reply(
          l === "it"
            ? "Nessun boost attivo. Sii il primo — /boost"
            : "No active boosts. Be the first — /boost"
        );
        return;
      }
      const fire = { "24h": "🔥", "48h": "🔥🔥", "7d": "🔥🔥🔥" } as Record<string, string>;
      const blocks = rows.slice(0, 8).map((t) => {
        const left = t.expiresAt ? remaining(t.expiresAt) : "";
        const tag = t.fridged ? "🧊 FRIDGED" : "⚠️ NOT FRIDGED";
        return `${fire[t.tier || "24h"] || "🔥"} $${esc(t.symbol || "???")} — expires in ${left}\n        ${tag}\n        ${SCANNER_URL}/t/${t.mint}`;
      });
      await ctx.reply(`🔥 Boosted Tokens\n\n${blocks.join("\n\n")}\n\nBoost your token → /boost`, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("fridge", async (ctx) => {
    const l = langOf(ctx);
    const mint = mintArg(ctx);
    if (!mint) return ctx.reply(say.needMint(l));
    if (tooSoon(ctx)) return ctx.reply(say.rate(l));
    await ctx.reply(say.cooking(l));
    try {
      const fridge = await apiFridge(mint);
      const report = await apiScan(mint).catch(() => null);
      const sym = report?.identity.symbol || "TKN";
      const dec = report?.identity.decimals ?? 6;
      if (fridge.status === "fridged") {
        const lock = fridge.locks[0];
        await ctx.reply(
          `🧊 Fridge Check: $${esc(sym)}\n\n` +
            `Status:  FRIDGED ✓\n` +
            `Locked:  ${fmtAmt(fridge.activeAmount, dec)} ${esc(sym)}\n` +
            `Unlocks: ${fmtUnlock(fridge.unlockAt)}\n` +
            `Dev:     ${shortKey(fridge.depositor || "")}\n` +
            `PDA:     ${shortKey(lock?.address || "")}\n\n` +
            `${say.fridged(l)}`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .url("Full report", `${SCANNER_URL}/t/${mint}`)
              .url("Solscan", `https://solscan.io/account/${lock?.address || mint}`),
            link_preview_options: { is_disabled: true },
          }
        );
      } else if (fridge.status === "expired") {
        await ctx.reply(`⚠️ Fridge Check: $${esc(sym)}\n\nStatus: EXPIRED\n${say.thawed(l)}`, {
          parse_mode: "HTML",
        });
      } else {
        await ctx.reply(
          `⚠️ Fridge Check: $${esc(sym)}\n\nStatus: NOT FRIDGED\nNo active vault found for this mint.\n\n${say.notFridged(l)}\n\nLock your tokens → ${FRIDGE_URL}`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().url("Fridge it", `${FRIDGE_URL}/?mint=${mint}`),
            link_preview_options: { is_disabled: true },
          }
        );
      }
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("scan", async (ctx) => {
    const l = langOf(ctx);
    const mint = mintArg(ctx);
    if (!mint) return ctx.reply(say.needMint(l));
    if (tooSoon(ctx)) return ctx.reply(say.rate(l));
    await ctx.reply(`🔍 ${say.cooking(l)}`);
    try {
      const r = await apiScan(mint);
      const f = r.fridge;
      const age =
        r.identity.ageSeconds == null
          ? "—"
          : r.identity.ageSeconds < 86400
            ? `${Math.floor(r.identity.ageSeconds / 3600)}h`
            : `${Math.floor(r.identity.ageSeconds / 86400)}d`;
      let fridgeBlock = `⚠️ NOT FRIDGED\nDev has not locked supply in DevFridge.\nNo rug protection verified.`;
      if (f.status === "fridged") {
        fridgeBlock =
          `🧊 FRIDGED ✓ VERIFIED ONCHAIN\n` +
          `   Locked:  ${fmtAmt(f.activeAmount, r.identity.decimals)} ${esc(r.identity.symbol)}\n` +
          `   Unlocks: ${fmtUnlock(f.unlockAt)}\n` +
          `   Dev:     ${shortKey(f.depositor || "")}\n` +
          `   PDA:     ${shortKey(f.locks[0]?.address || "")}`;
      } else if (f.status === "expired") {
        fridgeBlock = `🔓 FRIDGE EXPIRED\n${say.thawed(l)}`;
      }
      const sec = r.security
        .slice(0, 6)
        .map((c) => `   ${icon(c.level)} ${esc(c.label)}${c.amount ? `: ${esc(c.amount)}` : ""}`)
        .join("\n");
      const pastaNote =
        mint === PASTA_MINT ? `\n⚠️ $PASTA: mint/freeze revocation in progress. Track on ${FRIDGE_URL}` : "";
      const text =
        `🔍 Scanning: $${esc(r.identity.symbol)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${fridgeBlock}\n\n🔐 Security\n${sec}\n\n` +
        `💰 Market\n   Price:   ${money(r.market.priceUsd)}\n` +
        `   MCap:    ${money(r.market.marketCap)}\n` +
        `   24h Vol: ${money(r.market.volume24h)}\n` +
        `   Holders: ${r.market.holders?.toLocaleString() ?? "—"}\n` +
        `   Age:     ${age}\n\n🚀 Platform: ${esc(r.identity.platform)}${pastaNote}`;
      await ctx.reply(text.slice(0, 4000), {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .url("Full report", `${SCANNER_URL}/t/${mint}`)
          .url("Fridge it", `${FRIDGE_URL}/?mint=${mint}`),
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/invalid/i.test(msg)) await ctx.reply(say.invalid(l));
      else await ctx.reply(say.offline(l));
    }
  });

  bot.command("badge", async (ctx) => {
    const l = langOf(ctx);
    const mint = mintArg(ctx);
    if (!mint) return ctx.reply(say.needMint(l));
    try {
      const r = await apiScan(mint);
      const fridged = r.fridge.status === "fridged";
      const snippet =
        `<a href="${SCANNER_URL}/t/${mint}">\n` +
        `  <img src="${SCANNER_URL}/api/badge?mint=${mint}&theme=dark"\n` +
        `       alt="DevFridge Badge" width="420" height="${fridged ? 90 : 60}" />\n` +
        `</a>`;
      await ctx.reply(
        `🏷️ DevFridge Badge for: $${esc(r.identity.symbol)}\n\n` +
          `Status: ${fridged ? "🧊 FRIDGED ✓" : "⚠️ NOT FRIDGED"}\n\n` +
          `Copy your embed snippet:\n\n<code>${esc(snippet)}</code>\n\n` +
          `Or grab your AI prompt → /aiprompt ${mint}\n\n` +
          `Free. No JS. Updates live from blockchain.`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().url("Badge generator", `${SCANNER_URL}/badge?mint=${mint}`),
          link_preview_options: { is_disabled: true },
        }
      );
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.command("aiprompt", async (ctx) => {
    const l = langOf(ctx);
    const mint = mintArg(ctx);
    if (!mint) return ctx.reply(say.needMint(l));
    const prompt =
      `I want to add a DevFridge verification badge to my token website.\n\n` +
      `Token mint: ${mint}\n` +
      `Badge URL: ${SCANNER_URL}/api/badge?mint=${mint}&theme=dark\n` +
      `Scanner link: ${SCANNER_URL}/t/${mint}\n\n` +
      `The badge is a live SVG image. It shows whether my token supply\n` +
      `is timelocked in the DevFridge vault on Solana, updating every 60s.\n\n` +
      `Please integrate this badge into my [YOUR STACK] website.\n` +
      `Add it to [WHERE: hero / footer / about page].\n` +
      `Make it link to the scanner URL.\n\n` +
      `My current site code: [PASTE YOUR CODE]`;
    await ctx.reply(
      `🤖 AI Integration Prompt for this mint\n\nCopy this and give it to ChatGPT, Claude, Grok, or Cursor:\n\n<pre>${esc(prompt)}</pre>`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("register", async (ctx) => {
    const l = langOf(ctx);
    const pda = parseMint(typeof ctx.match === "string" ? ctx.match : "");
    if (!pda) {
      await ctx.reply(
        l === "it"
          ? "Uso: /register &lt;vault_pda&gt; — la PDA del lock Fridge."
          : "Usage: /register &lt;vault_pda&gt; — the Fridge lock PDA.",
        { parse_mode: "HTML" }
      );
      return;
    }
    try {
      const acc = await rpc<{ value?: { data?: [string, string] } | null }>("getAccountInfo", [
        pda,
        { encoding: "base64" },
      ]);
      const b64 = acc.value?.data?.[0];
      if (!b64) {
        await ctx.reply(say.spoiled(l) + "\nPDA not found on-chain.");
        return;
      }
      const lock = decodeLock(pda, Uint8Array.from(Buffer.from(b64, "base64")));
      if (!lock) {
        await ctx.reply(
          l === "it" ? "Quella PDA non è un lock Fridge." : "That PDA is not a Fridge lock."
        );
        return;
      }
      addAlert({
        telegramId: ctx.from?.id || 0,
        vaultPda: pda,
        mint: lock.mint,
        depositor: lock.depositor,
        registeredAt: Date.now(),
        alertsSent: [],
      });
      await ctx.reply(
        `${say.alDente(l)}\nRegistered ${shortKey(pda)} for expiry DMs.\nMint: ${shortKey(lock.mint)}\nUnlocks: ${fmtUnlock(lock.unlockAt)}`
      );
    } catch {
      await ctx.reply(say.offline(l));
    }
  });

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith("/") && !text.startsWith("/start")) {
      await ctx.reply(say.unknown(langOf(ctx)));
      return;
    }
    await next();
  });
}
