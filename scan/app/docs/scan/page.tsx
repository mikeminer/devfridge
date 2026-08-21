import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("scan");

export default function ScanDoc() {
  return (
    <DocsShell kicker="SCANNER" title="Solana token risk scanner">
      <p>
        Paste a mint, pump.fun URL, or DexScreener URL at{" "}
        <a href="https://scan.devfridge.cool">scan.devfridge.cool</a>. The report covers:
      </p>
      <ul>
        <li>Identity (name, ticker, logo from Pump / DexScreener / Jupiter)</li>
        <li>Mint and freeze authority</li>
        <li>Live Fridge locks (amount, unlock time, depositor)</li>
        <li>Market snapshot when a pool exists</li>
      </ul>
      <p>
        Each mint has a stable URL: <code>https://scan.devfridge.cool/t/&lt;mint&gt;</code>. That is
        the link the Fridge badge uses.
      </p>
      <h2>What the report does not claim</h2>
      <p>
        A scan is an automated snapshot of observable data. It does not prove that a token, team,
        market, website, or future transaction is safe. Missing data is shown as unknown rather
        than treated as safe.
      </p>
      <p>
        Sponsored placement never changes a check or risk grade. Read the{" "}
        <a href="https://docs.devfridge.cool/methodology">full methodology</a>.
      </p>
    </DocsShell>
  );
}
