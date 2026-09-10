"use client";

import { useEffect, useState } from "react";
import { WORLD_OPENS_AT } from "@/lib/ecosystem";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}

export default function WorldCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const open = new Date(WORLD_OPENS_AT).getTime();
  const remain = open - (now ?? open);
  const opened = remain <= 0;
  const t = parts(remain);
  return (
    <section className="ice-card p-5">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">WORLD · COLD STORAGE</p>
      <h2 className="mt-1 text-xl font-bold">
        {opened ? "The fridge is open." : "Ten memes. One fridge. 1 Oct 2026."}
      </h2>
      <p className="mt-2 text-sm text-mute">
        Unlock a character with 500,000 of its Solana Token-2022 mint in active Fridge locks. Merge
        puzzle, kitchen walkaround, score photos. No per-run payment. No prizes. Robinhood locks do
        not unlock this build.
      </p>
      {!opened && now != null && (
        <p className="mt-4 font-mono text-lg text-ice">
          {t.d}d {String(t.h).padStart(2, "0")}h {String(t.m).padStart(2, "0")}m{" "}
          {String(t.sec).padStart(2, "0")}s
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="fridge-key fridge-key-primary" href="https://world.devfridge.cool">
          world.devfridge.cool
        </a>
        <a className="fridge-key" href="https://docs.devfridge.cool/world">
          Game guide
        </a>
      </div>
    </section>
  );
}
