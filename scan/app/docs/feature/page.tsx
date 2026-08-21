import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta, DOCS_ORIGIN } from "@/lib/docs";

export const metadata: Metadata = docMeta("feature");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I feature a Solana memecoin on DevFridge?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lock Token-2022 supply on devfridge.cool, open the mint on scan.devfridge.cool, connect Phantom, and pay 0.1, 0.18, or 0.5 SOL. The token is featured immediately. The program later buys $PASTA and burns it.",
      },
    },
    {
      "@type": "Question",
      name: "Is this a DexScreener boost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. DexScreener boosts raise a trending score on DexScreener. DevFridge Feature is an on-chain listing on scan.devfridge.cool that requires a live Fridge lock and burns $PASTA.",
      },
    },
  ],
};

export default function FeatureDoc() {
  return (
    <DocsShell kicker="GET FEATURED" title="Feature a Solana memecoin">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p>
        Use this when you launched on pump.fun (or any Token-2022 mint) and want a <em>verifiable</em>{" "}
        featured slot instead of a DexScreener ad or a volume bot.
      </p>

      <h2>Requirements</h2>
      <ol>
        <li>
          A live Fridge lock on <a href="https://devfridge.cool">devfridge.cool</a> — unlock time
          still in the future.
        </li>
        <li>Phantom or Solflare with the package SOL plus a small fee cushion (~0.02 SOL).</li>
        <li>
          The mint page on <a href="https://scan.devfridge.cool">scan.devfridge.cool</a>.
        </li>
      </ol>

      <h2>Packages</h2>
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>SOL</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>24h Boost</td>
            <td>0.1</td>
            <td>24 hours</td>
          </tr>
          <tr>
            <td>48h Boost</td>
            <td>0.18</td>
            <td>48 hours</td>
          </tr>
          <tr>
            <td>7d Boost</td>
            <td>0.5</td>
            <td>7 days</td>
          </tr>
        </tbody>
      </table>

      <h2>What happens in the wallet</h2>
      <p>
        One signature. You pay the package SOL into the Fridge program vault and the on-chain Boost
        account starts the timer. You never receive the bought $PASTA, so you cannot sell it.
      </p>
      <p>
        After the listing is live, the program wraps that SOL, Jupiter-swaps it to $PASTA on the
        PumpSwap pool, and burns it. Details:{" "}
        <a href={`${DOCS_ORIGIN}/boost`}>buy &amp; burn</a>.
      </p>

      <h2>Not the same as DexScreener Boost</h2>
      <p>
        DexScreener{" "}
        <a href="https://docs.dexscreener.com/boosting">Boost packs</a> raise a trending score on
        their site. They do not lock your supply and they do not burn $PASTA. DevFridge Feature is
        only for mints with a live Fridge vault and only lists on scan.devfridge.cool.
      </p>

      <p>
        <a className="fridge-key fridge-key-primary" href="https://scan.devfridge.cool/#feature">
          Open Get Featured
        </a>
      </p>
    </DocsShell>
  );
}
