import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("tokenomics");

export default function TokenomicsDoc() {
  return (
    <DocsShell kicker="$PASTA" title="Tokenomics (on-chain, live)">
      <p>
        $PASTA (<code>39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump</code>) is the Fridge burn
        token. You do not need $PASTA to lock. Usage of the Fridge is what buys and burns it.
      </p>

      <h2>What is on the Fridge program today</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Trigger</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Claim fee</td>
            <td>Take tokens out after unlock</td>
            <td>2% of the vault: burn $PASTA, or Jupiter-buy $PASTA then burn</td>
          </tr>
          <tr>
            <td>Get Featured</td>
            <td>0.1 / 0.18 / 0.5 SOL, live lock required</td>
            <td>SOL to program vault → Jupiter-buy $PASTA → burn</td>
          </tr>
        </tbody>
      </table>

      <h2>Access rules</h2>
      <ul>
        <li>Any wallet can lock a Token-2022 mint (including $PASTA) into its own vault PDA.</li>
        <li>Locks are not mixed in one pot. Each depositor + mint + lock id has a separate vault.</li>
        <li>A live timelock is required for the TRUST badge and to buy a featured slot.</li>
        <li>Not every mint can Get Featured — only mints with an active Fridge lock.</li>
      </ul>

      <h2>What is not Fridge-program tokenomics</h2>
      <p>
        Trust Me Capital (Hyperliquid vault) and any extra buybacks from trading P&amp;L are
        separate from the Fridge program. They are not the 2% claim fee and not Feature SOL.
      </p>
    </DocsShell>
  );
}
