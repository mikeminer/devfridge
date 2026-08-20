import { PASTA_MINT, PROGRAM_ID, TREASURY } from "./constants";

export type OfficialLink = {
  label: string;
  href: string;
  hint: string;
  copy?: string;
};

export const CONNECT_ORIGIN = "https://connect.devfridge.cool";

export const OFFICIAL_SITES: OfficialLink[] = [
  {
    label: "Fridge",
    href: "https://devfridge.cool",
    hint: "Lock Token-2022 supply on-chain",
  },
  {
    label: "Scanner",
    href: "https://scan.devfridge.cool",
    hint: "Trust report and Fridge badge",
  },
  {
    label: "Health",
    href: "https://health.devfridge.cool",
    hint: "Live status of Fridge, RPC, and $PASTA",
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
    label: "X",
    href: "https://x.com/anonimocommando",
    hint: "@anonimocommando",
  },
  {
    label: "Telegram channel",
    href: "https://t.me/pastamemelovers",
    hint: "@pastamemelovers",
  },
  {
    label: "Telegram group",
    href: "https://t.me/+RbLG3dqqM5tiZmRk",
    hint: "Public kitchen — invite only from this page",
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
