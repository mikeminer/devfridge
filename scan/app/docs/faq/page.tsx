import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta, DOCS_ORIGIN } from "@/lib/docs";

export const metadata: Metadata = docMeta("faq");

const faqs = [
  {
    q: "Can I feature a token that is not fridged?",
    a: "No. Get Featured requires a live Fridge lock that has not reached unlock_at.",
  },
  {
    q: "Does Feature pay DexScreener or pump.fun?",
    a: "No. SOL goes to the Fridge program vault, then buys and burns $PASTA. The listing is on scan.devfridge.cool.",
  },
  {
    q: "Why did the UI say the boost account was missing after I paid?",
    a: "The on-chain payment can confirm before the scanner RPC sees the Boost account. If Solscan shows the tx succeeded, the listing is live. Refresh the homepage Boosted tab.",
  },
  {
    q: "Do I ever hold the bought $PASTA?",
    a: "No. Jupiter buys into the burn PDA and the program burns it in the crank.",
  },
  {
    q: "Where are official links?",
    a: "Only connect.devfridge.cool. Do not trust DMs that are not listed there.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqDoc() {
  return (
    <DocsShell kicker="FAQ" title="Feature and Fridge questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqs.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <p>
        More detail: <a href={`${DOCS_ORIGIN}/feature`}>feature a memecoin</a>,{" "}
        <a href={`${DOCS_ORIGIN}/boost`}>buy &amp; burn</a>.
      </p>
    </DocsShell>
  );
}
