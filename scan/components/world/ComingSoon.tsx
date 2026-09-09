"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./runway.module.css";
import { LAUNCH_X_URL } from "@/lib/world-share";
import NewsletterSignup from "./NewsletterSignup";

const MemeRunway = dynamic(() => import("./MemeRunway"), { ssr: false });

const TARGET = new Date("2026-09-30T22:00:00.000Z").getTime();

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
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, sec: 0 });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.body.classList.add("world-soon");
    const updateCountdown = () => {
      const ms = TARGET - Date.now();
      if (ms <= 0) {
        setOpen(false);
        setLeft({ d: 0, h: 0, m: 0, sec: 0 });
        return false;
      }
      setLeft(parts(ms));
      return true;
    };

    updateCountdown();
    const id = window.setInterval(() => {
      if (!updateCountdown()) window.clearInterval(id);
    }, 1000);
    return () => {
      document.body.classList.remove("world-soon");
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!open) document.body.classList.remove("world-soon");
  }, [open]);

  if (!open) {
    return (
      <main className={styles.page}>
        <iframe
          title="Cold Storage — DevFridge game"
          src={`/world/game/index.html${window.location.search}${window.location.hash}`}
          allow="clipboard-write; fullscreen"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </main>
    );
  }

  const cells = [
    { n: left.d, l: "Days" },
    { n: left.h, l: "Hours" },
    { n: left.m, l: "Minutes" },
    { n: left.sec, l: "Seconds" },
  ];

  return (
    <main className={`${styles.page} ${styles.countdownPage}`}>
      <MemeRunway />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(158,240,255,0.16),transparent_36%),radial-gradient(circle_at_15%_85%,rgba(255,82,176,0.12),transparent_32%),radial-gradient(circle_at_88%_78%,rgba(246,196,92,0.12),transparent_34%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <section className={styles.panel}>
        <img
          src="https://devfridge.cool/brand/logo-mark.jpg"
          alt="DevFridge"
          className="h-12 w-12 rounded-2xl object-cover ring-1 ring-ice/30"
        />
        <p className={`${styles.siteLabel} mt-5 text-xs font-bold tracking-[0.15em] text-ice`}>WORLD.DEVFRIDGE.COOL</p>
        <h1 className={`${styles.launchTitle} mt-3 text-4xl font-bold tracking-tight`}>Pick your brainrot.<br />Start the chaos.</h1>
        <p className={`${styles.launchDescription} mt-4 text-base leading-6 text-mute`}>
          Ten Italian brainrots. One chaotic kitchen. DevFridge World opens on{" "}
          <time dateTime="2026-10-01T00:00:00+02:00" className="font-semibold text-white">
            1 October 2026
          </time>
          .
        </p>
        <p className={`${styles.launchNetworks} mt-3 text-sm text-ice`}>Tokens currently deployed on Robinhood / Pons and Solana / pump.fun.</p>
        <p className={`${styles.countdownLabel} mt-5 text-xs font-bold uppercase tracking-[0.15em] text-ice/80`}>
          Countdown to launch
        </p>
        <div className={`${styles.countdownGrid} mt-3 grid grid-cols-4 gap-2`}>
          {cells.map((c) => (
            <div key={c.l} className="rounded-xl border border-ice/15 bg-white/[0.035] px-1 py-3 text-center">
              <p className="font-mono text-2xl font-bold text-ice">
                {String(c.n).padStart(2, "0")}
              </p>
              <p className="mt-1 text-xs text-mute">
                {c.l}
              </p>
            </div>
          ))}
        </div>
        <NewsletterSignup />
        <div className={styles.launchShare}>
          <a className={styles.xPrimary} href={LAUNCH_X_URL} target="_blank" rel="noopener noreferrer">Share the countdown on X ↗</a>
          <a className={styles.pickJump} href="#pick-your-brainrot">Pick your character ↓</a>
          <p>Give your friends a head start on choosing their meme.</p>
        </div>
        <nav className={`${styles.launchLinks} mt-6 flex flex-wrap gap-2`} aria-label="DevFridge links">
          <a className="fridge-key" href="https://team.devfridge.cool">
            Team
          </a>
          <a className="fridge-key" href="https://capital.devfridge.cool">
            Capital
          </a>
          <a className="fridge-key" href="https://docs.devfridge.cool/world" target="_blank" rel="noopener noreferrer">Game guide ↗</a>
        </nav>
      </section>
    </main>
  );
}
