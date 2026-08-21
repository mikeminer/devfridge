import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("boost");

export default function BoostDoc() {
  return (
    <DocsShell kicker="BUY & BURN" title="How Feature SOL becomes a $PASTA burn">
      <p>
        Feature is two on-chain steps so Phantom only signs a small payment. The swap never lands in
        the buyer’s wallet.
      </p>
      <h2>1. Boost instruction</h2>
      <p>
        <code>boost(tier)</code> transfers 0.1 / 0.18 / 0.5 SOL into the program vault PDA{" "}
        <code>boost_vault</code> and writes a Boost account seeded <code>["boost", mint]</code>. The
        listing timer starts in that transaction.
      </p>
      <h2>2. Crank buyback</h2>
      <p>
        <code>crank_buyback</code> is permissionless. It wraps vault SOL to WSOL owned by the burn
        PDA, Jupiter-swaps to $PASTA on PumpSwap, and Token-2022-burns the output.
      </p>
      <ul>
        <li>
          $PASTA mint:{" "}
          <code>39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump</code>
        </li>
        <li>
          Pool (DexScreener):{" "}
          <a href="https://dexscreener.com/solana/5o5jbdwzd3zke3jc8tb81d3bph7bwxftvwllroz1eql5">
            5o5JB…EqL5
          </a>
        </li>
        <li>
          Burn PDA seed: <code>["burn"]</code>
        </li>
      </ul>
      <p>
        If the listing is live and the vault still holds SOL, the burn may lag the Feature
        signature by a short crank. The featured timer does not wait on the swap.
      </p>
    </DocsShell>
  );
}
