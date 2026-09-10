import type { Metadata } from "next";
import { NODES, PROGRAM_ID, nodeById } from "@/lib/ecosystem";
import CopyButton from "@/components/ecosystem/CopyButton";
import styles from "@/components/ecosystem/ecosystem.module.css";

export const metadata: Metadata = {
  title: "Ecosystem embed",
  robots: { index: false, follow: false },
};

export default function EmbedPage({
  searchParams,
}: {
  searchParams?: { node?: string };
}) {
  const node = nodeById(searchParams?.node || "fridge") || NODES[0];
  return (
    <div className={styles.embed}>
      <article className="ice-card mx-auto max-w-lg p-5">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">DEVFRIDGE · {node.kicker.toUpperCase()}</p>
        <h1 className="mt-2 text-2xl font-bold">{node.name}</h1>
        <p className="mt-2 text-sm text-ink">{node.what}</p>
        <p className="mt-2 text-sm text-caution">{node.notThis}</p>
        {node.id === "fridge" && (
          <p className="mt-3 break-all font-mono text-xs text-ice">{PROGRAM_ID}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {node.id === "fridge" && <CopyButton value={PROGRAM_ID} />}
          <a className="fridge-key fridge-key-primary" href={node.href} target="_blank" rel="noreferrer">
            {node.cta}
          </a>
          <a className="fridge-key" href="https://ecosystem.devfridge.cool" target="_blank" rel="noreferrer">
            Full kitchen
          </a>
        </div>
      </article>
    </div>
  );
}
