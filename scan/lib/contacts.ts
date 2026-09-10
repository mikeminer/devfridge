import { PASTA_MINT, PROGRAM_ID, TREASURY } from "./constants";
import contracts from "@/components/world/runway-contracts.json";
import solana from "./brainrot-solana.json";

export type OfficialLink = {
  label: string;
  href: string;
  hint: string;
  copy?: string;
};

export const CONNECT_ORIGIN = "https://connect.devfridge.cool";

export const OFFICIAL_SITES: OfficialLink[] = [
  {
    label: "AI Investor Relations",
    href: "https://ir.devfridge.cool",
    hint: "Ask about DevFridge in your language, with official sources and founder updates",
  },
  {
    label: "Synapse",
    href: "https://synapse.devfridge.cool",
    hint: "Explore the DevFridge knowledge graph and investor research",
  },
  {
    label: "Marketing",
    href: "https://marketing.devfridge.cool",
    hint: "DevFridge marketing hub",
  },
  {
    label: "Fridge",
    href: "https://devfridge.cool",
    hint: "Lock Token-2022 supply on-chain",
  },
  {
    label: "Trust Me Capital",
    href: "https://capital.devfridge.cool",
    hint: "TMC analytics and Trust Rewards on Robinhood Chain",
  },
  {
    label: "DevFridge Bridge",
    href: "https://bridge.devfridge.cool",
    hint: "Rate-limited LayerZero OFT bridge for verified token routes",
  },
  {
    label: "Scanner",
    href: "https://scan.devfridge.cool",
    hint: "Trust report and Fridge badge",
  },
  {
    label: "Ecosystem",
    href: "https://ecosystem.devfridge.cool",
    hint: "Kitchen map of products, identities, and live evidence",
  },
  {
    label: "World",
    href: "https://world.devfridge.cool",
    hint: "Pastalovers vs The Shelf — lock decides your team",
  },
  {
    label: "Docs",
    href: "https://docs.devfridge.cool",
    hint: "How to fridge, scan, and feature a memecoin",
  },
  {
    label: "Health",
    href: "https://health.devfridge.cool",
    hint: "Live status of Fridge, RPC, and $PASTA",
  },
  {
    label: "Bot",
    href: "https://bot.devfridge.cool",
    hint: "Telegram bot landing page — add @frigopastabot to your group",
  },
  {
    label: "Team",
    href: "https://team.devfridge.cool",
    hint: "Team dashboard and applications",
  },
  {
    label: "Buyback",
    href: "https://buyback.devfridge.cool",
    hint: "HyperEVM USDC → $PASTA on Solana",
  },
  {
    label: "Connect",
    href: CONNECT_ORIGIN,
    hint: "This page — the only official meeting point",
  },
];

export const OFFICIAL_BOT: OfficialLink[] = [
  {
    label: "Official Telegram bot",
    href: "https://t.me/frigopastabot",
    hint: "@frigopastabot — FrigoPasta, the only official chef",
  },
];

export const OFFICIAL_SOCIAL: OfficialLink[] = [
  {
    label: "Zealy quests",
    href: "https://zealy.io/cw/solanapasta/questboard/f46e9c1e-3e22-4443-8157-210cbee1d19a/94837c1a-f43f-47f3-a16c-b1f99d225c89",
    hint: "Official Solana PASTA questboard",
  },
  {
    label: "DeBank",
    href: "https://debank.com/profile/0x5d69c42a3a481d0ccfd88cfa8a2a08e2bf456134",
    hint: "Official DeBank profile",
  },
  {
    label: "Project leader — Telegram",
    href: "https://t.me/anonimocommando",
    hint: "@anonimocommando",
  },
  {
    label: "X",
    href: "https://x.com/anonimocommando",
    hint: "@anonimocommando",
  },
  {
    label: "Discord",
    href: "https://discord.com/invite/9RSrhuUtu",
    hint: "Official DevFridge Discord server",
  },
  {
    label: "Telegram channel",
    href: "https://t.me/pastamemelovers",
    hint: "@pastamemelovers",
  },
  {
    label: "Trust Me Capital Telegram",
    href: "https://t.me/trustmecapitalTG",
    hint: "@trustmecapitalTG — official TMC and Trust Rewards group",
  },
  {
    label: "$PASTA on pump.fun",
    href: `https://pump.fun/coin/${PASTA_MINT}`,
    hint: "Official mint listing",
  },
  {
    label: "Dev on pump.fun",
    href: `https://pump.fun/profile/${TREASURY}`,
    hint: "Official pump.fun profile",
  },
  {
    label: "GitHub",
    href: "https://github.com/mikeminer/devfridge",
    hint: "mikeminer/devfridge",
  },
];

export const OFFICIAL_CICCIA: OfficialLink[] = [
  {
    label: "CICCIA Salsiccia — Solana / pump.fun",
    href: solana.ciccia.marketUrl,
    hint: `Solana Token-2022 · ${solana.ciccia.address}`,
    copy: solana.ciccia.address,
  },
  {
    label: "Join the CICCIA SQUAD",
    href: "https://join.pump.fun/HSag/g3f6x393",
    hint: "Official CICCIA SQUAD community on Pump.fun",
  },
  {
    label: "CICCIA Salsiccia — official mascot",
    href: `https://www.ponsfamily.com/launchpad/${contracts.ciccia}`,
    hint: `Robinhood · ${contracts.ciccia}`,
    copy: contracts.ciccia,
  },
];

export const OFFICIAL_CHAIN: OfficialLink[] = [
  {
    label: "$PASTA mint",
    href: `https://solscan.io/token/${PASTA_MINT}`,
    hint: PASTA_MINT,
    copy: PASTA_MINT,
  },
  {
    label: "Fridge program",
    href: `https://solscan.io/account/${PROGRAM_ID}`,
    hint: PROGRAM_ID,
    copy: PROGRAM_ID,
  },
  {
    label: "Treasury / dev",
    href: `https://solscan.io/account/${TREASURY}`,
    hint: TREASURY,
    copy: TREASURY,
  },
];
