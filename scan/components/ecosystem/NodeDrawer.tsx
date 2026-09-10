"use client";

import type { EcoNode } from "@/lib/ecosystem";
import { PROGRAM_ID } from "@/lib/ecosystem";
import CopyButton from "./CopyButton";
import styles from "./ecosystem.module.css";

export default function NodeDrawer({ node }: { node: EcoNode | null }) {
  if (!node) {
    return (
      <aside className={styles.drawer}>
        <p className={styles.kicker}>Drawer</p>
        <h2 className="text-xl font-bold">Pick a magnet.</h2>
        <p className="text-sm text-mute">
          Every product here has a job, a door, and a thing it is not. Start with the Fridge.
        </p>
      </aside>
    );
  }
  return (
    <aside className={styles.drawer} id={`node-${node.id}`}>
      <p className={styles.kicker}>{node.kicker}</p>
      <h2 className="text-2xl font-bold">{node.name}</h2>
      <p className="text-sm leading-relaxed text-ink">{node.what}</p>
      <p className="text-sm text-caution">{node.notThis}</p>
      {node.id === "fridge" && (
        <p className={styles.mono}>
          Program {PROGRAM_ID}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {node.id === "fridge" && <CopyButton value={PROGRAM_ID} label="Copy program" />}
        <a className="fridge-key fridge-key-primary" href={node.href}>
          {node.cta}
        </a>
        {node.proofHref && (
          <a className="fridge-key" href={node.proofHref} target="_blank" rel="noreferrer">
            {node.proofLabel || "Proof"}
          </a>
        )}
      </div>
    </aside>
  );
}
