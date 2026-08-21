import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { DOC_PAGES, docMeta, DOCS_ORIGIN } from "@/lib/docs";

export const metadata: Metadata = docMeta("");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "DevFridge docs",
  description:
    "Lock Solana Token-2022 supply on-chain and feature a memecoin by buying and burning $PASTA.",
  url: DOCS_ORIGIN,
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  inLanguage: "en",
  publisher: { "@type": "Organization", name: "DevFridge", url: "https://devfridge.cool" },
};

export default function DocsHome() {
  return (
    <DocsShell kicker="DOCS" title="Too many tokens? Fridge them.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p>
        DevFridge is an on-chain Token-2022 time-lock on Solana. The scanner at{" "}
        <a href="https://scan.devfridge.cool">scan.devfridge.cool</a> is the only token scanner that
        checks whether a mint has a live Fridge vault. Token devs can then <strong>Get Featured</strong>:
        one Phantom signature pays SOL, the listing starts immediately, and the Fridge program buys{" "}
        <a href="https://pump.fun/coin/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump">$PASTA</a> and
        burns it.
      </p>

      <h2>Who this is for</h2>
      <p>
        Pump.fun-style Solana memecoin creators who want a verifiable lock and a featured slot that
        is not a DexScreener ad and not a volume bot. Official contacts live only on{" "}
        <a href="https://connect.devfridge.cool">connect.devfridge.cool</a>.
      </p>

      <h2>Market context (cited)</h2>
      <p>
        These figures are from named public reports. They describe the audience, not a Google
        ranking guarantee.
      </p>
      <ul>
        <li>
          Pump.fun held about <strong>75–80%</strong> of graduated Solana launchpad tokens in 2025
          upswings (
          <a href="https://www.tradingview.com/news/cointelegraph:9c3a24b10094b:0-how-pump-fun-captured-80-of-solana-memecoins-and-can-it-last/">
            Cointelegraph / TradingView, Oct 2025
          </a>
          ).
        </li>
        <li>
          An academic snapshot of Q4 2024 found Pump.fun at up to <strong>71.1%</strong> of Solana
          token mints and <strong>40–67%</strong> of DEX transactions (
          <a href="https://arxiv.org/html/2512.11850v3">arXiv 2512.11850</a>).
        </li>
        <li>
          Solana memecoin market cap moved from about <strong>$5.1B to $6.7B</strong> in early 2026;
          Pump.fun DEX volume printed a <strong>$2B</strong> daily ATH (
          <a href="https://finance.yahoo.com/news/pump-fun-dex-volume-hits-132415661.html">
            Yahoo Finance, Jan 2026
          </a>
          ).
        </li>
        <li>
          Galaxy Research (Oct 2025): memecoins were ~<strong>30%</strong> of Solana DEX volume
          (down from ~60% in January); Pump.fun tokens were &gt;85% of launchpad FDMC (
          <a href="https://www.galaxy.com/insights/research/memecoins-pump-fun-solana-kols">
            Galaxy
          </a>
          ).
        </li>
      </ul>

      <h2>What people actually search</h2>
      <p>
        We do not have Keyword Planner volumes. Public threads and product docs show the same jobs
        to be done:
      </p>
      <ul>
        <li>
          “How do I market / promote a pump.fun coin?” — Reddit r/solana; answers cluster on KOLs,
          Telegram ads, and <strong>DexScreener boosts</strong>.
        </li>
        <li>
          “How to trend / boost on DexScreener” — DexScreener’s own{" "}
          <a href="https://docs.dexscreener.com/boosting">boosting docs</a> plus a large YouTube
          tutorial market.
        </li>
        <li>
          “How to list on DexScreener” — DexScreener lists automatically once a pool trades; the
          search is really “how do I get seen.”
        </li>
      </ul>
      <p>
        DevFridge Feature sits next to that demand, not inside DexScreener’s product: a live Fridge
        lock is required, the listing is on scan.devfridge.cool, and the SOL buys and burns $PASTA.
      </p>

      <h2>Guides</h2>
      <ul>
        {DOC_PAGES.filter((p) => p.slug).map((p) => (
          <li key={p.slug}>
            <a href={`${DOCS_ORIGIN}${p.href}`}>{p.nav}</a> — {p.description}
          </li>
        ))}
      </ul>

      <p>
        <a className="fridge-key fridge-key-primary" href="https://scan.devfridge.cool/#feature">
          Feature a fridged token
        </a>
      </p>
    </DocsShell>
  );
}
