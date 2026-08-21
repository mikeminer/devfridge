"use client";

import { useEffect, useState } from "react";
import WorldApp from "./WorldApp";

const TARGET = new Date("2026-08-31T22:00:00.000Z").getTime();

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}

export default function ComingSoon() {
  const [left, setLeft] = useState(() => parts(TARGET - Date.now()));
  const [open, setOpen] = useState(() => Date.now() < TARGET);

  useEffect(() => {
    document.body.classList.add("world-soon");
    const id = window.setInterval(() => {
      const ms = TARGET - Date.now();
      if (ms <= 0) {
        setOpen(false);
        setLeft({ d: 0, h: 0, m: 0, sec: 0 });
        window.clearInterval(id);
        return;
      }
      setLeft(parts(ms));
    }, 1000);
    return () => {
      document.body.classList.remove("world-soon");
      window.clearInterval(id);
    };
  }, []);

  if (!open) {
    document.body.classList.remove("world-soon");
    return <WorldApp />;
  }

  const cells = [
    { n: left.d, l: "Days" },
    { n: left.h, l: "Hours" },
    { n: left.m, l: "Min" },
    { n: left.sec, l: "Sec" },
  ];

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#070b14] px-4">
      <div className="mx-auto max-w-xl text-center">
        <img
          src="https://devfridge.cool/brand/logo-mark.jpg"
          alt=""
          className="mx-auto h-16 w-16 rounded-2xl object-cover ring-1 ring-ice/30"
        />
        <p className="mt-6 text-[10px] font-bold tracking-[0.22em] text-ice">WORLD.DEVFRIDGE.COOL</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-6xl">Coming soon</h1>
        <p className="mt-4 text-sm text-mute">
          Pastalovers vs The Shelf. The Fridge metaverse opens 31 August 2026.
        </p>
        <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-3">
          {cells.map((c) => (
            <div key={c.l} className="ice-card px-2 py-4">
              <p className="font-mono text-3xl font-bold text-ice sm:text-4xl">
                {String(c.n).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-mute">{c.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          <a className="fridge-key" href="https://devfridge.cool">
            Fridge
          </a>
          <a className="fridge-key" href="https://scan.devfridge.cool">
            Scan
          </a>
          <a className="fridge-key" href="https://docs.devfridge.cool/world">
            Docs
          </a>
        </div>
      </div>
    </div>
  );
}
