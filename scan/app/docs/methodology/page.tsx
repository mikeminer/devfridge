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
        <li>Top-10 on-chain owner concentration, excluding verified bonding-curve and supported AMM reserves and attributing Fridge vault balances to depositors.</li>
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

      <h2>Holder concentration</h2>
      <p>
        Scan reads the complete mint-filtered token account set, checks that balances sum to mint
        supply, and groups accounts by their on-chain owner. It does not estimate ownership from
        the largest 20 token accounts. Missing or inconsistent data produces an unknown check.
      </p>
      <p>
        Pump.fun bonding-curve vaults, PumpSwap pools (including secondary pools and either side of
        arbitrary quote pairs), and Raydium AMM V4/CPMM/CLMM, Orca Whirlpool and Meteora DLMM vaults are verified against their
        program-owned state and token authority before exclusion. Both SPL Token and Token-2022
        accounts are supported. Actual vault balances are used, never virtual reserves. Fridge balances remain assigned
        to each depositant: a timelock changes when tokens can be claimed, not who owns the claim.
        The report separately shows concentration outside Fridge, all Fridge balances, active
        time-locks and excluded pool reserves. Expired but unclaimed vaults still belong to the
        depositant. Every percentage uses total mint supply, including pool and locked balances,
        as its denominator; the grade uses the combined owner balance, including Fridge.
      </p>
      <p>
        Account enumeration has no fixed 100,000-account cutoff; full reads get up to 30 seconds.
        If a provider times out, truncates the result or supply cannot be reconciled, the check is
        unknown. Balances and reserve classifications have separate RPC slots in the API.
        Reserve classification does not prove LP tokens are burned or locked. Unmapped shared Raydium
        custody remains included and is disclosed; if including or excluding it changes the grade,
        the grade is unknown.
      </p>
      <p>
        On-chain owners are not necessarily separate people. Other protocol reserves and custodial
        accounts may remain included, and one person can control several wallets. Transfer-fee
        withholding or concurrent supply changes can prevent reconciliation and yield unknown.
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
