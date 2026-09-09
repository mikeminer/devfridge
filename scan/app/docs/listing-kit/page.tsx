import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import { PASTA_MINT, PROGRAM_ID } from "@/lib/constants";

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
        <li><a href="https://sdk.devfridge.cool">SDK</a></li>
      </ul>

      <h2>On-chain identifiers</h2>
      <p>Fridge program: <code className="break-all">{PROGRAM_ID}</code></p>
      <p>DevFridge $PASTA · Solana mint: <code className="break-all">{PASTA_MINT}</code></p>
      <p><strong>Not affiliated with any other token using the PASTA ticker.</strong></p>
      <p>
        Lead token listings, promotions, and screenshots with the full mint, not the ticker alone.
        Verify the mint and burn authority using the <a href="https://docs.devfridge.cool/program">program guide</a>.
      </p>
      <h2>Integration message</h2>
      <p>
        DevFridge $PASTA (Solana mint: {PASTA_MINT}). Lock Token-2022 supply at devfridge.cool,
        then scan the mint to verify a live Fridge vault. Get Featured costs 0.1 SOL / 24h,
        0.18 SOL / 48h, or 0.5 SOL / 7d, plus network fees; paid placement never changes risk grades.
        Add @frigopastabot for /scan, /fridge, and /badge. Use /register with the lock account PDA,
        not the token mint, for expiry DMs. Embed a live badge from scan.devfridge.cool/badge.
        Feature payments and the 2% claim fee fund $PASTA burns. DevFridge World’s Cold Storage
        merge game is deployed as a pre-launch build; the public countdown runs until 1 October 2026.
        A meme requires at least 500,000 of its supported character token in active DevFridge locks.
        There are no per-run payments or prizes. See the <a href="https://docs.devfridge.cool/world">World game guide</a>.
        Official contacts only at connect.devfridge.cool.
      </p>

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
