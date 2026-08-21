export const DOCS_ORIGIN = "https://docs.devfridge.cool";

export type DocLink = {
  href: string;
  slug: string;
  title: string;
  nav: string;
  description: string;
};

export const DOC_PAGES: DocLink[] = [
  {
    href: "/",
    slug: "",
    title: "DevFridge docs",
    nav: "Overview",
    description:
      "Lock Solana Token-2022 supply on-chain, scan for a live Fridge, and feature a memecoin by buying and burning $PASTA.",
  },
  {
    href: "/world",
    slug: "world",
    title: "Fridge world",
    nav: "World",
    description:
      "Shooter inside the Fridge. Your faction is the live lock with the highest USD value. Same mint cannot kill teammates.",
  },
  {
    href: "/feature",
    slug: "feature",
    title: "Feature a Solana memecoin",
    nav: "Get featured",
    description:
      "Pay 0.1, 0.18, or 0.5 SOL to feature a fridged Solana memecoin on scan.devfridge.cool. The program buys $PASTA and burns it.",
  },
  {
    href: "/fridge",
    slug: "fridge",
    title: "Lock token supply (Fridge)",
    nav: "Fridge lock",
    description:
      "How DevFridge time-locks Token-2022 supply on Solana so a scan can prove the vault is live.",
  },
  {
    href: "/boost",
    slug: "boost",
    title: "Boost buyback and $PASTA burn",
    nav: "Buy & burn",
    description:
      "Feature payments go to a program vault. A crank wraps SOL, Jupiter-buys $PASTA on PumpSwap, and burns it.",
  },
  {
    href: "/scan",
    slug: "scan",
    title: "Trust scanner",
    nav: "Scanner",
    description:
      "scan.devfridge.cool checks mint, freeze, holders, and whether the mint has a live DevFridge lock.",
  },
  {
    href: "/badge",
    slug: "badge",
    title: "Fridge badge",
    nav: "Badge",
    description: "Embed a live Fridge badge that links to the token scan page.",
  },
  {
    href: "/tokenomics",
    slug: "tokenomics",
    title: "$PASTA tokenomics",
    nav: "Tokenomics",
    description:
      "On-chain $PASTA burns: 2% Fridge claim fee and Get Featured SOL packages that buy and burn $PASTA.",
  },
  {
    href: "/program",
    slug: "program",
    title: "Program IDs and fees",
    nav: "On-chain",
    description: "Fridge program ID, $PASTA mint, boost tiers, and official contacts.",
  },
  {
    href: "/faq",
    slug: "faq",
    title: "FAQ",
    nav: "FAQ",
    description: "Answers for token devs who want to lock supply or feature a Solana memecoin.",
  },
];

export function docUrl(path: string): string {
  if (!path || path === "/") return DOCS_ORIGIN;
  return `${DOCS_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function docMeta(slug: string) {
  const page = DOC_PAGES.find((p) => p.slug === slug) || DOC_PAGES[0];
  const url = docUrl(page.href);
  return {
    title: `${page.title} — docs.devfridge.cool`,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "DevFridge docs",
      type: "website" as const,
      images: [{ url: "https://devfridge.cool/brand/logo-mark.jpg" }],
    },
    twitter: {
      card: "summary" as const,
      title: page.title,
      description: page.description,
    },
  };
}
