import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("world");

export default function WorldDoc() {
  return (
    <DocsShell kicker="WORLD" title="The Meme World — opening 1 October 2026">
      <p>
        <a href="https://world.devfridge.cool">world.devfridge.cool</a> is scheduled to open on{" "}
        <strong>1 October 2026</strong>. The public site currently shows the launch countdown;
        gameplay is not yet publicly available.
      </p>
      <h2>Planned lock-based gameplay</h2>
      <p>
        The Fridge shooter design uses two teams. These rules describe planned gameplay,
        not an access benefit available before launch:
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
        Under this design, if a wallet has live locks for both $PASTA and another mint, the
        lock with the larger USD value picks its team. Each participating wallet needs its own
        live lock; a developer locking supply does not grant every holder access. Teammates
        cannot kill each other. Check the launch site for confirmed availability and final rules.
      </p>
      <p>
        Characters are Mixamo rigs from the official{" "}
        <a href="https://threejs.org/examples/">three.js examples</a> (Soldier / Xbot). Shelf props
        use the Khronos Duck sample. Ice walls use MeshPhysicalMaterial transmission.
      </p>
      <p>
        <a className="fridge-key fridge-key-primary" href="https://world.devfridge.cool">
          View launch countdown
        </a>
      </p>
    </DocsShell>
  );
}
