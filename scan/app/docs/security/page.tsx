import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import { PROGRAM_ID } from "@/lib/constants";

export const metadata: Metadata = docMeta("security");

export default function SecurityDoc() {
  return (
    <DocsShell kicker="SECURITY" title="Security and responsible disclosure">
      <p>
        DevFridge is non-custodial software built around a public Solana program. Users should
        verify addresses, transaction instructions, and current program state before signing.
      </p>

      <h2>Canonical program and source</h2>
      <ul>
        <li>
          Program ID: <code>{PROGRAM_ID}</code>
        </li>
        <li>
          Source: <a href="https://github.com/mikeminer/devfridge">github.com/mikeminer/devfridge</a>
        </li>
        <li>
          Explorer: <a href={`https://solscan.io/account/${PROGRAM_ID}`}>view the program on Solscan</a>
        </li>
        <li>
          Live status: <a href="https://health.devfridge.cool">health.devfridge.cool</a>
        </li>
      </ul>

      <h2>Independent audit status</h2>
      <p>
        No independent security audit is claimed or published at this time. Public source, tests,
        scanner checks, and an operational status page improve transparency but are not substitutes
        for an independent audit. This page will link the report if one is completed.
      </p>

      <h2>Report a vulnerability</h2>
      <p>
        Use only the contacts listed at{" "}
        <a href="https://connect.devfridge.cool">connect.devfridge.cool</a>. Do not disclose an
        exploitable issue publicly before a fix is available, and never send private keys or seed phrases.
      </p>
      <p>Please include affected component, reproduction steps, expected impact, and a safe proof of concept.</p>

      <h2>Security boundaries</h2>
      <ul>
        <li>Scanner results are automated signals, not token certification.</li>
        <li>Wallets remain responsible for showing and approving transaction instructions.</li>
        <li>Third-party RPC, market, metadata, wallet, and DEX providers have separate failure modes.</li>
        <li>Sponsored placements never alter scanner results or risk grades.</li>
      </ul>
    </DocsShell>
  );
}
