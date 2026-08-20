"use client";

import { useEffect, useState } from "react";
import { PASTA_MINT } from "@/lib/constants";

export default function PastaWidget() {
  const [price, setPrice] = useState<number | null>(null);
  const [burned, setBurned] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/pasta")
      .then((r) => r.json())
      .then((d) => {
        setPrice(typeof d.price === "number" ? d.price : null);
        setBurned(d.burned ?? null);
      })
      .catch(() => undefined);
  }, []);

  return (
    <aside className="ice-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">POWERED BY $PASTA BUYBACKS</p>
        <p className="text-sm text-mute">
          {price != null ? `$${price < 0.01 ? price.toExponential(2) : price.toPrecision(4)}` : "Price…"}
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
