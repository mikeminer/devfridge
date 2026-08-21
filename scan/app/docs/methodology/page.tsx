import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("methodology");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "DevFridge risk-grade methodology",
  description:
    "How DevFridge derives risk grades from visible Solana token checks and handles missing data.",
  url: "https://docs.devfridge.cool/methodology",
  inLanguage: "en",
  publisher: { "@type": "Organization", name: "DevFridge", url: "https://devfridge.cool" },
};

export default function MethodologyDoc() {
  return (
    <DocsShell kicker="METHODOLOGY" title="How the risk grade works">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p>
        DevFridge turns the visible checks in each report into an A–E risk grade. The grade is a
        compact summary of the current snapshot, not a prediction, audit, endorsement, or guarantee.
      </p>

      <h2>Checks included</h2>
      <ul>
        <li>Whether mint authority is revoked.</li>
        <li>Whether freeze authority is revoked.</li>
        <li>Top-10 holder concentration, excluding identified Fridge vaults when data is available.</li>
        <li>Whether DEX liquidity is present and whether LP status can be verified.</li>
        <li>Whether a live DevFridge lock exists.</li>
        <li>Whether Metaplex metadata is mutable or unavailable.</li>
        <li>Whether Token-2022 extensions require additional review.</li>
      </ul>

      <h2>Grade calculation</h2>
      <p>Each displayed check contributes points: safe 0, unknown 1, caution 2, and danger 4.</p>
      <ul>
        <li>A: 0 points</li>
        <li>B: 1–2 points</li>
        <li>C: 3–4 points</li>
        <li>D: 5–7 points</li>
        <li>E: 8 or more points</li>
      </ul>
      <p>
        Unknown data is never treated as safe. Concentration is caution above 40% and danger above
        70%. These thresholds are product heuristics for triage, not universal standards.
      </p>

      <h2>Data and freshness</h2>
      <p>
        Reports combine Solana RPC data with available Pump.fun, DexScreener, Jupiter, Metaplex,
        and DevFridge program data. Providers can be delayed, incomplete, rate-limited, or wrong.
        Re-scan before relying on a result and verify critical facts directly on-chain.
      </p>

      <h2>Sponsorship independence</h2>
      <p>
        Feature payments affect only a labeled sponsored placement and its expiry. They do not
        change source data, checks, warnings, thresholds, or the risk grade. Recent scans are not
        ordered by payment.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>A revoked authority does not prove that a team or website is trustworthy.</li>
        <li>A lock covers only the amount and expiry shown; it may not cover the entire supply.</li>
        <li>LP lock or burn status is not fully verified for every DEX or liquidity design.</li>
        <li>Holder accounts can be related even when the relationship is not visible on-chain.</li>
        <li>Contract, frontend, governance, oracle, and off-chain risks may exist outside these checks.</li>
      </ul>
    </DocsShell>
  );
}
