import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("world");

export default function WorldDoc() {
  return (
    <DocsShell kicker="WORLD" title="Fridge metaverse">
      <p>
        <a href="https://world.devfridge.cool">world.devfridge.cool</a> is a shooter inside the
        Fridge. Two teams only:
      </p>
      <ul>
        <li>
          <strong>Pastalovers</strong> — wallet whose highest-USD <em>live</em> lock is $PASTA.
        </li>
        <li>
          <strong>The Shelf</strong> — wallet whose highest-USD live lock is any other Token-2022.
        </li>
      </ul>
      <p>
        If you locked both $PASTA and another mint, the lock with the larger USD value picks the
        team. No live lock → you cannot fight. Teammates cannot kill each other.
      </p>
      <p>
        Characters are Mixamo rigs from the official{" "}
        <a href="https://threejs.org/examples/">three.js examples</a> (Soldier / Xbot). Shelf props
        use the Khronos Duck sample. Ice walls use MeshPhysicalMaterial transmission.
      </p>
      <p>
        <a className="fridge-key fridge-key-primary" href="https://world.devfridge.cool">
          Enter the Fridge
        </a>
      </p>
    </DocsShell>
  );
}
