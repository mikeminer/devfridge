import type { Metadata } from "next";
import AlDente from "@/components/ecosystem/AlDente";
import IntegrityFooter from "@/components/ecosystem/IntegrityFooter";
import { ECO_ORIGIN, PASTA_MINT } from "@/lib/ecosystem";
import CopyButton from "@/components/ecosystem/CopyButton";
import styles from "@/components/ecosystem/ecosystem.module.css";

export const metadata: Metadata = {
  title: "$PASTA in the kitchen",
  description: `DevFridge $PASTA is productive infrastructure, not a cash-flow claim. Solana mint ${PASTA_MINT}. Ticker ≠ identity.`,
  alternates: { canonical: `${ECO_ORIGIN}/pasta` },
};

export default function PastaPage() {
  return (
    <div className={`${styles.shell} mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-12`}>
      <p className={styles.kicker}>$PASTA · SOLANA</p>
      <AlDente />
      <section className="ice-card p-5">
        <p className="text-[10px] font-bold tracking-[0.16em] text-ice">CANONICAL MINT</p>
        <p className="mt-2 font-mono text-sm text-ice">{PASTA_MINT}</p>
        <p className="mt-2 text-sm text-mute">
          Not affiliated with any other token using the PASTA ticker. The tape lives on pasta.devfridge.cool.
          Price does not headline this kitchen.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton value={PASTA_MINT} label="Copy mint" />
          <a className="fridge-key" href={`https://solscan.io/token/${PASTA_MINT}`}>
            Solscan
          </a>
          <a className="fridge-key" href={`https://pump.fun/coin/${PASTA_MINT}`}>
            pump.fun
          </a>
        </div>
      </section>
      <IntegrityFooter />
    </div>
  );
}
