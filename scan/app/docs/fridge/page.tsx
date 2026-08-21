import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("fridge");

export default function FridgeDoc() {
  return (
    <DocsShell kicker="FRIDGE" title="Lock Token-2022 supply on Solana">
      <p>
        A Fridge lock is a program-owned Token-2022 vault. The depositor chooses an unlock time.
        Nobody can withdraw before <code>unlock_at</code>, including the original wallet.
      </p>
      <h2>How to lock</h2>
      <ol>
        <li>
          Open <a href="https://devfridge.cool">devfridge.cool</a> and connect Phantom.
        </li>
        <li>Paste the mint (pump.fun and DexScreener URLs work).</li>
        <li>Pick amount and unlock date, then confirm the lock transaction.</li>
      </ol>
      <h2>What the scanner shows</h2>
      <p>
        <a href="https://scan.devfridge.cool">scan.devfridge.cool</a> reads Fridge program accounts
        for that mint. If at least one vault still has <code>unlock_at</code> in the future, the
        report is <strong>Fridged</strong>. That is the only way to unlock Get Featured.
      </p>
      <h2>Claim</h2>
      <p>
        After unlock, the depositor claims. A 2% redemption fee Jupiter-buys $PASTA and burns it
        (or burns $PASTA directly if the locked mint is $PASTA).
      </p>
      <p>
        <a className="fridge-key fridge-key-primary" href="https://devfridge.cool">
          Fridge a mint
        </a>
      </p>
    </DocsShell>
  );
}
