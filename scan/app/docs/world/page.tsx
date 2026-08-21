import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("world");

export default function WorldDoc() {
  return (
    <DocsShell kicker="WORLD" title="Fridge metaverse">
      <p>
        <a href="https://world.devfridge.cool">world.devfridge.cool</a> is a shooter set inside the
        Fridge. You connect the wallet that locked tokens. Your faction is the <strong>live</strong>{" "}
        lock with the highest USD value. If you locked several mints, only that top lock counts.
      </p>
      <ul>
        <li>No live Fridge lock → you cannot enter as a combatant.</li>
        <li>Same mint = same faction. You cannot kill teammates.</li>
        <li>Other factions can be eliminated. They respawn in the ice box.</li>
      </ul>
      <p>
        <a className="fridge-key fridge-key-primary" href="https://world.devfridge.cool">
          Enter the Fridge
        </a>
      </p>
    </DocsShell>
  );
}
