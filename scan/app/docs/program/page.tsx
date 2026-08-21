import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import { PASTA_MINT, PROGRAM_ID, TREASURY } from "@/lib/constants";

export const metadata: Metadata = docMeta("program");

export default function ProgramDoc() {
  return (
    <DocsShell kicker="ON-CHAIN" title="Program IDs and fees">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fridge program</td>
            <td>
              <a href={`https://solscan.io/account/${PROGRAM_ID}`}>
                <code>{PROGRAM_ID}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>$PASTA mint</td>
            <td>
              <a href={`https://solscan.io/token/${PASTA_MINT}`}>
                <code>{PASTA_MINT}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>Treasury / dev</td>
            <td>
              <a href={`https://solscan.io/account/${TREASURY}`}>
                <code>{TREASURY}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>Claim fee</td>
            <td>2% buyback-and-burn $PASTA</td>
          </tr>
          <tr>
            <td>Feature</td>
            <td>0.1 / 0.18 / 0.5 SOL → $PASTA burn</td>
          </tr>
        </tbody>
      </table>
      <p>
        Source: <a href="https://github.com/mikeminer/devfridge">github.com/mikeminer/devfridge</a>.
        Official socials and the bot:{" "}
        <a href="https://connect.devfridge.cool">connect.devfridge.cool</a>.
      </p>
    </DocsShell>
  );
}
