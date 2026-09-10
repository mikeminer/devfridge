import { PASTA_MINT, PROGRAM_ID, TREASURY } from "./constants";

export const ECO_ORIGIN = "https://ecosystem.devfridge.cool";
export const SYNAPSE_BRIEF = "https://synapse.devfridge.cool/brief.json";
export const SYNAPSE_LLMS = "https://synapse.devfridge.cool/llms.txt";
export const CONNECT_ORIGIN = "https://connect.devfridge.cool";
export const WORLD_OPENS_AT = "2026-09-30T22:00:00.000Z"; // 1 Oct 2026 00:00 Europe/Rome
export const WORLD_SCORE_CONTRACT = "0xc1DB49694E0DB50778c333350C8A553fDE221989";
export const TMC_RH = "0x5c845330b41D9Bef68B46DC254353A770f44dee8";
export const TMC_SOLANA = "EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump";
export const TMC_TIMEVAULT = "0x5151151f0e6F7CE6927c475531B28667e39EA8b3";
export const HL_VAULT = "0xf8815770e046d32f606385700f3bc96ffbb4e879";
export const BURN_EXAMPLE_TX =
  "8ed3v9zmo2G9hZwVrQrUmpaiXFFcoopr18X4XVu9cmYRttYW2eEmCn6W4iKAoB7r5fCbw3U6sUMZtTAgTW8rBnv";
export const ROBINHOOD_CHAIN_ID = 4663;

export type EcoRoom = "solana" | "robinhood" | "pass";
export type EcoAudience =
  | "all"
  | "dev"
  | "buyer"
  | "pasta"
  | "tg"
  | "builder"
  | "evm"
  | "locker"
  | "collector";

export type EcoNode = {
  id: string;
  name: string;
  kicker: string;
  room: EcoRoom;
  what: string;
  notThis: string;
  href: string;
  cta: string;
  proofHref?: string;
  proofLabel?: string;
  audiences: EcoAudience[];
};

export type EcoAsset = {
  id: string;
  name: string;
  solanaSymbol: string;
  rhSymbol: string;
  solana: string;
  robinhood: string;
  chant: string;
  collision?: boolean;
  cultural: boolean;
  kind: "pasta" | "tmc" | "character";
};

export type EcoAudienceDef = {
  id: EcoAudience;
  label: string;
  job: string;
  cta: string;
  href: string;
};

export function ecoHref(host: string | null | undefined, slug = ""): string {
  const h = host || "";
  const onEco = h.startsWith("ecosystem.");
  const path = slug.replace(/^\//, "");
  if (onEco) return path ? `/${path}` : "/";
  return path ? `/ecosystem/${path}` : "/ecosystem";
}

export const AUDIENCES: EcoAudienceDef[] = [
  { id: "all", label: "Whole kitchen", job: "See how the products connect.", cta: "Open the map", href: "/" },
  {
    id: "dev",
    label: "Token dev",
    job: "Get seen without looking like a rug.",
    cta: "Fridge, then feature",
    href: "https://scan.devfridge.cool/#feature",
  },
  {
    id: "buyer",
    label: "Buyer",
    job: "Check a mint before you size in.",
    cta: "Scan a mint",
    href: "https://scan.devfridge.cool",
  },
  {
    id: "pasta",
    label: "$PASTA holder",
    job: "Usage burns $PASTA. A lock opens the kitchen.",
    cta: "Lock $PASTA",
    href: "https://devfridge.cool",
  },
  {
    id: "tg",
    label: "TG admin",
    job: "Free trust reports inside Telegram.",
    cta: "Add @frigopastabot",
    href: "https://t.me/frigopastabot",
  },
  {
    id: "builder",
    label: "Builder",
    job: "Gate access with a timelock, not a subscription.",
    cta: "Read the SDK",
    href: "https://sdk.devfridge.cool",
  },
  {
    id: "evm",
    label: "EVM trader",
    job: "A desk that publishes its book.",
    cta: "Open the vault",
    href: "https://capital.devfridge.cool",
  },
  {
    id: "locker",
    label: "$TMC locker",
    job: "Lock in the TimeVault. Points stay on the account.",
    cta: "Trust Rewards",
    href: "https://capital.devfridge.cool/rewards",
  },
  {
    id: "collector",
    label: "Meme collector",
    job: "Ten cursed kitchen creatures. Cultural tokens, not vault equity.",
    cta: "Meet the cast",
    href: "/cast",
  },
];

export const NODES: EcoNode[] = [
  {
    id: "fridge",
    name: "Fridge",
    kicker: "Cold room",
    room: "solana",
    what: "Time-locks Token-2022 supply in per-depositor vault PDAs. Only the depositor can claim after unlock.",
    notThis: "A token lock does not prove an LP lock.",
    href: "https://devfridge.cool",
    cta: "Lock supply",
    proofHref: `https://solscan.io/account/${PROGRAM_ID}`,
    proofLabel: "Program ID",
    audiences: ["dev", "pasta", "builder", "collector"],
  },
  {
    id: "scan",
    name: "Scanner",
    kicker: "Signals",
    room: "solana",
    what: "Shareable report: authorities, holders, market, live Fridge vaults.",
    notThis: "A scan is automated signals, not an audit or a guarantee.",
    href: "https://scan.devfridge.cool",
    cta: "Scan a mint",
    proofHref: "https://docs.devfridge.cool/methodology",
    proofLabel: "Methodology",
    audiences: ["dev", "buyer"],
  },
  {
    id: "feature",
    name: "Get Featured",
    kicker: "Paid slot",
    room: "solana",
    what: "One signature pays SOL. The listing starts. A crank buys $PASTA and burns it. 0.1 / 24h · 0.18 / 48h · 0.5 / 7d plus network fees.",
    notThis: "Paid placements are labeled and never change checks, warnings, or risk grades. Burns are a product mechanic, not a price floor.",
    href: "https://scan.devfridge.cool/#feature",
    cta: "Feature a lock",
    proofHref: `https://solscan.io/tx/${BURN_EXAMPLE_TX}`,
    proofLabel: "Example burn tx",
    audiences: ["dev"],
  },
  {
    id: "badge",
    name: "Badge",
    kicker: "Embed",
    room: "solana",
    what: "Live Fridge badge that links to the scan page.",
    notThis: "A badge is not a safety certificate.",
    href: "https://scan.devfridge.cool/badge",
    cta: "Make a badge",
    audiences: ["dev", "tg"],
  },
  {
    id: "bot",
    name: "FrigoPasta",
    kicker: "Telegram",
    room: "solana",
    what: "Free trust reports, lock checks, badges, expiry alerts. The only official chef.",
    notThis: "Nobody from DevFridge DMs first. The bot never asks for a seed.",
    href: "https://t.me/frigopastabot",
    cta: "Open @frigopastabot",
    proofHref: "https://bot.devfridge.cool",
    proofLabel: "Bot landing",
    audiences: ["tg", "buyer"],
  },
  {
    id: "sdk",
    name: "SDK",
    kicker: "Membership",
    room: "solana",
    what: "Gate a site with Fridge timelocks instead of a recurring subscription. Pilot status: proposed.",
    notThis: "No paying SDK customers or signed partnerships are claimed here.",
    href: "https://sdk.devfridge.cool",
    cta: "Read the SDK",
    proofHref: "https://docs.devfridge.cool/sdk",
    proofLabel: "Docs",
    audiences: ["builder"],
  },
  {
    id: "vault",
    name: "Trust Me Capital",
    kicker: "Hyperliquid",
    room: "robinhood",
    what: "Public vault analytics. Deposits stay on Hyperliquid. When the recorded book is green, the team buys $TMC on Pons.",
    notThis: "$TMC is not a share of the vault. Past performance is not a promise.",
    href: "https://capital.devfridge.cool",
    cta: "Open the book",
    proofHref: `https://app.hyperliquid.xyz/vaults/${HL_VAULT}`,
    proofLabel: "Vault page",
    audiences: ["evm"],
  },
  {
    id: "tmc",
    name: "$TMC",
    kicker: "Pons · 4663",
    room: "robinhood",
    what: "Community coin on Robinhood Chain. Buybacks happen only when recorded vault performance is green, with no promised size.",
    notThis: "Not vault equity, not a claim on deposits, not the Solana $TMC mint.",
    href: "https://capital.devfridge.cool/token",
    cta: "See $TMC",
    proofHref: `https://robinhoodchain.blockscout.com/token/${TMC_RH}`,
    proofLabel: "Contract",
    audiences: ["evm", "locker"],
  },
  {
    id: "rewards",
    name: "Trust Rewards",
    kicker: "TimeVault",
    room: "robinhood",
    what: "Lock $TMC for account-bound points. Member 10K/30d · Select 50K/90d · Gold 100K/180d · Black 250K/365d. Verify on-chain before relying.",
    notThis: "Points cannot be transferred. This is membership, not vault yield.",
    href: "https://capital.devfridge.cool/rewards",
    cta: "Open Trust Rewards",
    proofHref: `https://robinhoodchain.blockscout.com/address/${TMC_TIMEVAULT}`,
    proofLabel: "TimeVault",
    audiences: ["locker"],
  },
  {
    id: "kitchen",
    name: "Kitchen desk",
    kicker: "Gated",
    room: "robinhood",
    what: "Holder desk at meme.devfridge.cool. Enter with a team wallet, an active $PASTA lock, or 20,000,000 $TMC on Robinhood Chain.",
    notThis: "Holding $TMC is not a share of the vault.",
    href: "https://meme.devfridge.cool",
    cta: "Open the kitchen",
    audiences: ["pasta", "locker", "evm"],
  },
  {
    id: "world",
    name: "World",
    kicker: "Cold Storage",
    room: "pass",
    what: "Browser merge puzzle. Unlock a meme with 500,000 of its Solana character token in active Fridge locks. Public countdown until 1 Oct 2026, 00:00 Europe/Rome. No per-run payment, no prizes.",
    notThis: "Not a team shooter. Robinhood locks do not unlock this build. Scores are local, not token payouts.",
    href: "https://world.devfridge.cool",
    cta: "Pick a brainrot",
    proofHref: "https://docs.devfridge.cool/world",
    proofLabel: "Game guide",
    audiences: ["collector", "pasta"],
  },
  {
    id: "bridge",
    name: "Bridge",
    kicker: "Verified routes",
    room: "pass",
    what: "Rate-limited LayerZero OFT bridge for verified routes only.",
    notThis: "Same ticker on two chains is not a bridged or redeemable asset.",
    href: "https://bridge.devfridge.cool",
    cta: "Check routes",
    audiences: ["locker", "collector"],
  },
  {
    id: "synapse",
    name: "Synapse",
    kicker: "Evidence",
    room: "pass",
    what: "Dated, source-linked research brief. Missing data is unknown, not zero.",
    notThis: "Daily snapshot, not a live quote and not a valuation.",
    href: "https://synapse.devfridge.cool",
    cta: "Read the brief",
    proofHref: SYNAPSE_LLMS,
    proofLabel: "llms.txt",
    audiences: ["buyer", "builder"],
  },
  {
    id: "connect",
    name: "Connect",
    kicker: "Official door",
    room: "pass",
    what: "The only official meeting point and contact list.",
    notThis: "Any other “official” account is treated as an impersonator.",
    href: CONNECT_ORIGIN,
    cta: "Meet us here",
    audiences: ["all", "dev", "buyer", "pasta", "tg", "builder", "evm", "locker", "collector"],
  },
  {
    id: "health",
    name: "Health",
    kicker: "Cold room gauges",
    room: "pass",
    what: "Live probes for Fridge, RPC, Scanner, and $PASTA feeds.",
    notThis: "A green LED is not an audit.",
    href: "https://health.devfridge.cool",
    cta: "See status",
    audiences: ["dev", "builder"],
  },
  {
    id: "docs",
    name: "Docs",
    kicker: "How it works",
    room: "pass",
    what: "Fridge, scan, feature, badge, bot, SDK, World, security, listing kit.",
    notThis: "Docs describe the current product. Re-check before publishing numbers.",
    href: "https://docs.devfridge.cool",
    cta: "Open docs",
    audiences: ["dev", "builder"],
  },
  {
    id: "team",
    name: "Team",
    kicker: "Roster",
    room: "pass",
    what: "Applications and roster. Listing requires a verified $PASTA commitment, not real-world identity.",
    notThis: "A lock is commitment evidence, not KYC.",
    href: "https://team.devfridge.cool",
    cta: "Apply",
    audiences: ["builder", "pasta"],
  },
];

export const ASSETS: EcoAsset[] = [
  {
    id: "pasta",
    name: "DevFridge PASTA",
    solanaSymbol: "PASTA",
    rhSymbol: "PASTA",
    solana: PASTA_MINT,
    robinhood: "",
    chant: "Too many tokens? Fridge them.",
    cultural: false,
    kind: "pasta",
  },
  {
    id: "tmc",
    name: "Trust Me Capital",
    solanaSymbol: "TMC",
    rhSymbol: "TMC",
    solana: TMC_SOLANA,
    robinhood: TMC_RH,
    chant: "Trade the book. Buy back the coin.",
    cultural: false,
    kind: "tmc",
  },
  {
    id: "rugarugo",
    name: "Rugarugo",
    solanaSymbol: "RUGARUGO",
    rhSymbol: "RUGARUGO",
    solana: "An91P3ZkntqPoQJrYbLdZkbwbdMfCCVzLt8HVA2Mpump",
    robinhood: "0x12B8Cba33606a4F7B85ee30620784c5a1015E816",
    chant: "Ruga-ruga. Ragù goes rogue.",
    cultural: true,
    kind: "character",
  },
  {
    id: "aperitivo",
    name: "Aperitivo",
    solanaSymbol: "APE",
    rhSymbol: "APE",
    solana: "B31GwpFQco9R4HX1GrfyXgdmLArBN9pBBinqRn8Jpump",
    robinhood: "0x6AF70B8487CD47dEf373c4A9eB58F990A3eDba37",
    chant: "Sip. Scream. Spritz. Repeat.",
    collision: true,
    cultural: true,
    kind: "character",
  },
  {
    id: "friedfomo",
    name: "FriedFomo",
    solanaSymbol: "FIFO",
    rhSymbol: "FIFO",
    solana: "3Pg4b7wtcYTGacRzyRFGLBG4s6eeJ2d5jxK2jjz4pump",
    robinhood: "0x2AAa6d9e59734bb37EBc123Fe5dF797853F43AaC",
    chant: "Fi-fi. Fo-fo. Your brain is fritto.",
    cultural: true,
    kind: "character",
  },
  {
    id: "fudfusilli",
    name: "FudFusilli",
    solanaSymbol: "FUSILLI",
    rhSymbol: "FUSILLI",
    solana: "4ZbHvh5xPMB3vTbURzQfDPPH6iy5KNXg7pTdySNtpump",
    robinhood: "0xF7aca11cDB86115eEDce7da43C5326A12408201e",
    chant: "Twist the pasta. Confuse reality.",
    cultural: true,
    kind: "character",
  },
  {
    id: "lambocello",
    name: "Lambocello",
    solanaSymbol: "LAMBOCELLO",
    rhSymbol: "LAMBOCELLO",
    solana: "HAUTWMn41Qg1RvtwLFC3SEK7JSc19gns2vJL7TgRpump",
    robinhood: "0x8CfF8a877Ec7f5A63840143e9a1AF2c024A7e87E",
    chant: "Wen Lambo? When life gives you limoncello.",
    cultural: true,
    kind: "character",
  },
  {
    id: "gmgnocco",
    name: "GmGnocco",
    solanaSymbol: "GMGN",
    rhSymbol: "GMGN",
    solana: "8RBcBZkdM8U4eoAi1MsftW7RcXYryobawfPz3Nuupump",
    robinhood: "0x0713636AAe9DC16921F3f862fba52AF6DB5d1db3",
    chant: "GM. GN. GM. GN. Send espresso.",
    collision: true,
    cultural: true,
    kind: "character",
  },
  {
    id: "sersugo",
    name: "SerSugo",
    solanaSymbol: "SESU",
    rhSymbol: "SESU",
    solana: "AHZMcoqA53trX8JcuoCRsQqWpeSk415cE4p7AsrZpump",
    robinhood: "0x2A4e9362AB5fDcAb06A4A56B76dcBb286ea7D0FE",
    chant: "Yes, ser. The sauce has chosen you.",
    cultural: true,
    kind: "character",
  },
  {
    id: "moonzarella",
    name: "MoonZarella",
    solanaSymbol: "MOONZARELL",
    rhSymbol: "MOONZARELLA",
    solana: "6ZbWBzH9TyQdGhhxjJ573M9p59SVfRaX25FCFY3spump",
    robinhood: "0x29A13F8219d1D54424F1F9f1F90E85448488b2DE",
    chant: "The moon is fresh. The lore is unhinged.",
    cultural: true,
    kind: "character",
  },
  {
    id: "bonkatino",
    name: "Bonkatino",
    solanaSymbol: "BONKATINO",
    rhSymbol: "BONKATINO",
    solana: "HivTCtHY1GbC8ws9jwCh3Km5EH4CGtnTdDeo3SdKpump",
    robinhood: "0xC1c1ecB7596f8bc364E397Aaf987e4F11f88557c",
    chant: "Bonka-bonka. Brain al dente.",
    cultural: true,
    kind: "character",
  },
  {
    id: "ciccia",
    name: "Ciccia Salsiccia",
    solanaSymbol: "CICCIA",
    rhSymbol: "CICCIA",
    solana: "CvjWYRkV7iFftU8PKsa7Lyyz7hhWKTj6nG1rk2mMpump",
    robinhood: "0x575634d01aEeb4421c5EC4E06d861DFb0Da6df7a",
    chant: "The smoked sausage that survives the Italian heat. Ma che caldo!",
    cultural: true,
    kind: "character",
  },
];

export const FLOWS = [
  {
    id: "lock-scan-feature",
    title: "Fridge it, then feature it",
    room: "solana" as EcoRoom,
    steps: ["Lock Token-2022 supply", "Scan proves the vault is live", "Pay SOL → $PASTA burn"],
  },
  {
    id: "book-buyback",
    title: "Trade the book. Buy back the coin.",
    room: "robinhood" as EcoRoom,
    steps: ["Vault trades on Hyperliquid", "Recorded book is green", "Buy $TMC on Pons — no promised size"],
  },
  {
    id: "lock-world",
    title: "Lock a meme. Enter Cold Storage.",
    room: "pass" as EcoRoom,
    steps: ["Lock 500,000 of one Solana character mint", "Unlock that meme", "Merge in the fridge. No prizes."],
  },
];

export const INTEGRITY = [
  "Public source, public program, live status page. No independent audit has been published yet.",
  "A scan is automated signals, not an audit or a guarantee.",
  "Paid placements are labeled and never change checks, warnings, or risk grades.",
  "Usage routes SOL into $PASTA buy-and-burn. That is a product mechanic, not revenue, distributions, or a floor.",
  "$TMC is a community token, not a share of the vault and not a claim on deposits.",
  "Separate assets on separate networks. Only routes verified on bridge.devfridge.cool are bridgeable.",
  "A token lock does not prove an LP lock.",
  "Character tokens are cultural tokens, not vault equity or a promise of financial return.",
  "Not financial advice. Perps and memecoins can lose all capital.",
  "Official contacts only on connect.devfridge.cool. DevFridge never DMs first and never asks for a seed.",
];

export function nodeById(id: string): EcoNode | undefined {
  return NODES.find((n) => n.id === id);
}

export function assetById(id: string): EcoAsset | undefined {
  return ASSETS.find((a) => a.id === id);
}

export function nodesInRoom(room: EcoRoom): EcoNode[] {
  return NODES.filter((n) => n.room === room);
}

export function logoForMint(mint: string): string {
  return `https://scan.devfridge.cool/api/logo?mint=${mint}`;
}

export function pumpUrl(mint: string): string {
  return `https://pump.fun/coin/${mint}`;
}

export function ponsUrl(address: string): string {
  return `https://www.ponsfamily.com/launchpad/${address}`;
}

export function solscanToken(mint: string): string {
  return `https://solscan.io/token/${mint}`;
}

export function blockscoutToken(address: string): string {
  return `https://robinhoodchain.blockscout.com/token/${address}`;
}

export function ecoJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DevFridge ecosystem",
    url: ECO_ORIGIN,
    description:
      "Kitchen map of DevFridge products on Solana and Robinhood Chain. Ticker is not identity. Official contacts only on connect.devfridge.cool.",
    publisher: {
      "@type": "Organization",
      name: "DevFridge",
      url: "https://devfridge.cool",
      identifier: PASTA_MINT,
    },
    hasPart: NODES.map((n) => ({
      "@type": "WebPage",
      name: n.name,
      url: n.href,
      description: n.what,
    })),
  };
}

export const NAV = [
  { slug: "", label: "Kitchen" },
  { slug: "solana", label: "Solana" },
  { slug: "robinhood", label: "Robinhood" },
  { slug: "cast", label: "Cast" },
  { slug: "pasta", label: "$PASTA" },
  { slug: "integrate", label: "Integrate" },
] as const;

export { PASTA_MINT, PROGRAM_ID, TREASURY };
