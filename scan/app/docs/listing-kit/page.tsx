import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import { PROGRAM_ID } from "@/lib/constants";

export const metadata: Metadata = docMeta("listing-kit");

export default function ListingKitDoc() {
  return (
    <DocsShell kicker="PARTNERS" title="DevFridge listing kit">
      <p>
        Use the facts and links below for ecosystem directories, integrations, partner reviews,
        podcasts, and community demos. A directory listing does not imply endorsement by Solana or
        the directory operator.
      </p>

      <h2>Project name and categories</h2>
      <p><strong>DevFridge Scan</strong></p>
      <p>Security · Analytics · Developer Tools · Solana · Token-2022</p>

      <h2>Short description</h2>
      <p>
        Solana token risk scanner that checks authorities, holder concentration, market signals,
        and live on-chain DevFridge Token-2022 timelocks.
      </p>

      <h2>Full description</h2>
      <p>
        DevFridge Scan analyzes Solana token mints, mint and freeze authorities, holder
        concentration, market signals, Token-2022 extensions, and live DevFridge timelocks. Every
        scan has a shareable URL, and projects can embed a free badge linked to fresh on-chain data.
        Paid placements are labeled and never modify checks, warnings, or risk grades.
      </p>

      <h2>Verified links</h2>
      <ul>
        <li><a href="https://scan.devfridge.cool">Product</a></li>
        <li><a href="https://docs.devfridge.cool">Documentation</a></li>
        <li><a href="https://docs.devfridge.cool/methodology">Methodology</a></li>
        <li><a href="https://docs.devfridge.cool/security">Security status</a></li>
        <li><a href="https://github.com/mikeminer/devfridge">Source repository</a></li>
        <li><a href="https://health.devfridge.cool">Operational status</a></li>
        <li><a href="https://connect.devfridge.cool">Official contacts</a></li>
        <li><a href="https://scan.devfridge.cool/badge">Badge generator</a></li>
      </ul>

      <h2>On-chain identifier</h2>
      <p><code>{PROGRAM_ID}</code></p>

      <h2>Assets</h2>
      <ul>
        <li><a href="https://devfridge.cool/brand/logo-mark.jpg">Square logo</a></li>
        <li><a href="https://devfridge.cool/brand/logo-lockup.jpg">Landscape logo</a></li>
      </ul>

      <h2>Review note</h2>
      <p>
        The source is public, but no independent security audit is currently claimed. Scanner
        output is informational and does not certify a token as safe.
      </p>
    </DocsShell>
  );
}
