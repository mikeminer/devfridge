"use client";

import { useEffect, useState } from "react";
import { PASTA_MINT } from "@/lib/constants";

function fmtUsd(n: number): string {
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toPrecision(3)}`;
  return `$${n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export default function PastaWidget() {
  const [price, setPrice] = useState<number | null>(null);
  const [burned, setBurned] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await fetch(`/api/pasta?t=${Date.now()}`, { cache: "no-store" });
        const d = await r.json();
        if (stop) return;
        const n = Number(d.price);
        setPrice(Number.isFinite(n) && n > 0 ? n : null);
        setBurned(typeof d.burned === "string" && d.burned ? d.burned : null);
      } catch {
        /* keep last */
      } finally {
        if (!stop) setReady(true);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <aside className="ice-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">POWERED BY $PASTA BUYBACKS</p>
        <p className="text-sm text-mute">
          {!ready ? "Price…" : price != null ? fmtUsd(price) : "Price n/a"}
          {burned ? ` · burned ${burned}` : ""}
        </p>
      </div>
      <a
        className="fridge-chip"
        href={`https://pump.fun/coin/${PASTA_MINT}`}
        target="_blank"
        rel="noreferrer"
      >
        $PASTA ↗
      </a>
    </aside>
  );
}
