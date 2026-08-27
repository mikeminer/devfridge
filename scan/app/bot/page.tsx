import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "FrigoPasta Bot — bot.devfridge.cool" },
  description:
    "Free Telegram bot for Solana token trust reports, $PASTA stats, Fridge lock checks, and community alerts. Add @frigopastabot to any group in seconds.",
  alternates: { canonical: "https://bot.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://bot.devfridge.cool",
    title: "FrigoPasta Bot — free Telegram bot for DevFridge",
    description:
      "Scan tokens, check Fridge locks, track $PASTA burns, and get expiry alerts — all inside Telegram.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg" }],
  },
};

const BOT_URL = "https://t.me/frigopastabot";
const BOT_GROUP_URL = "https://t.me/frigopastabot?startgroup=true";
const DOCS_URL = "https://docs.devfridge.cool/bot";
const CONNECT_URL = "https://connect.devfridge.cool";

const commands = [
  { cmd: "/pasta", desc: "$PASTA price, market cap, volume, burned supply, and holder count" },
  { cmd: "/scan <mint>", desc: "Full trust report — authorities, holders, market, Fridge status" },
  { cmd: "/fridge <mint>", desc: "Quick check — is this token fridged?" },
  { cmd: "/badge <mint>", desc: "Get an embeddable badge snippet for your website" },
  { cmd: "/aiprompt <mint>", desc: "Copy-paste prompt to integrate the badge with ChatGPT / Claude" },
  { cmd: "/burn", desc: "Burn tracker — total burned and recent burn history" },
  { cmd: "/holders", desc: "Top 10 holder distribution and concentration grade" },
  { cmd: "/vault", desc: "TRUST ME CAPITAL vault stats on Hyperliquid" },
  { cmd: "/buy", desc: "Direct swap links for $PASTA on Jupiter, DexScreener, Birdeye" },
  { cmd: "/recent", desc: "Last 10 tokens scanned on the platform" },
  { cmd: "/boosted", desc: "Currently boosted tokens with time remaining" },
  { cmd: "/boost", desc: "How to boost your token on the scanner" },
  { cmd: "/lock", desc: "Step-by-step guide to lock tokens in the Fridge" },
  { cmd: "/register <pda>", desc: "Get DM alerts before your Fridge lock expires" },
  { cmd: "/roadmap", desc: "Current ecosystem roadmap" },
  { cmd: "/about", desc: "What is DevFridge and $PASTA" },
];

const pros = [
  "Instant trust reports without leaving Telegram",
  "Same scanner data as scan.devfridge.cool — live on-chain",
  "Works in any group, channel, or private chat",
  "Bilingual — responds in English and Italian",
  "Expiry DM alerts so devs never miss an unlock",
  "No sign-up, no wallet connection, no permissions needed",
  "Badge and AI prompt generation in one command",
  "10-second cooldown prevents spam in public groups",
];

const cons = [
  "Token pricing depends on Jupiter and DexScreener — very new tokens may show no price yet",
  "Burn history requires Helius RPC — without it only the total burned amount is shown",
  "Rate-limited to one scan per 10 seconds per user to protect the RPC",
  "Cannot execute on-chain transactions — it is read-only and informational",
  "Telegram-only — no Discord or Slack version at this time",
];

export default function BotPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">
        BOT.DEVFRIDGE.COOL
      </p>

      <section className="ice-card border-ice/50 p-6">
        <h1 className="text-3xl font-bold sm:text-4xl">
          @frigopastabot
        </h1>
        <p className="mt-1 text-lg text-mute">
          The free Telegram bot for DevFridge and $PASTA.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink">
          Scan any Solana Token-2022 for trust signals, check if supply is
          fridged, track $PASTA burns, and get DM alerts before a lock
          expires — all inside Telegram. No sign-up. No fees. No wallet
          connection required.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="fridge-key fridge-key-primary" href={BOT_URL} target="_blank" rel="noreferrer">
            Open in Telegram
          </a>
          <a className="fridge-key" href={BOT_GROUP_URL} target="_blank" rel="noreferrer">
            Add to your group
          </a>
          <a className="fridge-key" href={DOCS_URL}>
            Read the docs
          </a>
        </div>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">PRICING</p>
        <h2 className="mt-2 text-2xl font-bold">Free. No catch.</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          @frigopastabot is completely free for every user and every community.
          There are no premium tiers, no token-gated features, and no hidden
          charges. Every command listed below works for everyone, everywhere.
        </p>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">
          ADD TO YOUR COMMUNITY
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          Set up in 30 seconds
        </h2>
        <ol className="mt-4 grid gap-3 text-sm text-ink">
          <li>
            <strong>1. Open the add-to-group link</strong>
            <br />
            <a href={BOT_GROUP_URL} target="_blank" rel="noreferrer" className="text-ice hover:underline">
              t.me/frigopastabot?startgroup=true
            </a>
            <br />
            Telegram will ask you which group to add the bot to.
          </li>
          <li>
            <strong>2. Pick your group and confirm</strong>
            <br />
            The bot does not need admin rights. It only reads messages that
            start with <code>/</code> so it never sees regular chat.
          </li>
          <li>
            <strong>3. Done — type /help</strong>
            <br />
            Every member can now run scans, check locks, and track $PASTA
            directly in the group chat.
          </li>
        </ol>
        <p className="mt-4 text-xs text-mute">
          Want it in a channel instead? Add @frigopastabot as a channel
          admin to enable broadcast alerts for boosts, burns, and price
          moves.
        </p>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">
          ALL COMMANDS
        </p>
        <h2 className="mt-2 text-2xl font-bold">What the bot can do</h2>
        <div className="mt-4 grid gap-2">
          {commands.map((c) => (
            <div key={c.cmd} className="rounded-xl border border-line bg-navy/50 px-4 py-3">
              <code className="text-sm font-semibold text-ice">{c.cmd}</code>
              <p className="mt-1 text-xs text-mute">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">PROS</p>
        <h2 className="mt-2 text-2xl font-bold">Why add it</h2>
        <ul className="mt-4 grid gap-2 text-sm text-ink">
          {pros.map((p) => (
            <li key={p}>+ {p}</li>
          ))}
        </ul>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">LIMITATIONS</p>
        <h2 className="mt-2 text-2xl font-bold">What to know</h2>
        <ul className="mt-4 grid gap-2 text-sm text-ink">
          {cons.map((c) => (
            <li key={c}>- {c}</li>
          ))}
        </ul>
      </section>

      <section className="ice-card mt-5 p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">USE CASES</p>
        <h2 className="mt-2 text-2xl font-bold">Who uses FrigoPasta</h2>
        <div className="mt-4 grid gap-3 text-sm text-ink">
          <div>
            <strong>Memecoin communities</strong>
            <p className="text-mute">
              Members type <code>/scan</code> to check new tokens posted in
              chat. Fridged tokens get a verified badge. Un-fridged tokens get
              a warning. No more guessing.
            </p>
          </div>
          <div>
            <strong>Token developers</strong>
            <p className="text-mute">
              Lock supply, then use <code>/badge</code> to get an embed
              snippet and <code>/register</code> to get DM reminders before
              the lock expires.
            </p>
          </div>
          <div>
            <strong>Alpha groups and callers</strong>
            <p className="text-mute">
              One <code>/scan</code> command replaces a manual check of
              authorities, holders, market data, and fridge status. The
              report is posted inline for the whole group to see.
            </p>
          </div>
          <div>
            <strong>$PASTA holders</strong>
            <p className="text-mute">
              Track price, burns, holder distribution, and the TRUST ME
              CAPITAL vault without leaving Telegram.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-mute">
        <a className="text-ice hover:underline" href="https://devfridge.cool">
          Fridge
        </a>
        {" · "}
        <a className="text-ice hover:underline" href="https://scan.devfridge.cool">
          Scanner
        </a>
        {" · "}
        <a className="text-ice hover:underline" href={DOCS_URL}>
          Bot docs
        </a>
        {" · "}
        <a className="text-ice hover:underline" href={CONNECT_URL}>
          Official contacts
        </a>
        {" · "}
        If it is not listed here, it is not official.
      </footer>
    </main>
  );
}
