"use client";

import { useState } from "react";
import styles from "./runway.module.css";
import assets from "@/lib/world-onboarding-assets.json";

let loading: Promise<{ openTimelock(): Promise<void> }> | undefined;
function loadTimelock() {
  return loading ??= Promise.all([
    import(/* webpackIgnore: true */ assets.script),
    new Promise<void>((resolve, reject) => {
      if (document.querySelector('link[data-world-timelock="ready"]')) { resolve(); return; }
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = assets.style;
      link.onload = () => { link.dataset.worldTimelock = "ready"; resolve(); };
      link.onerror = () => { link.remove(); reject(Error("Could not load the timelock dialog. Please try again.")); };
      document.head.append(link);
    }),
  ]).then(([module]) => module).catch(error => { loading = undefined; throw error; });
}

export default function PrelaunchOnboarding() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    if (busy) return;
    setBusy(true); setError("");
    try { await (await loadTimelock()).openTimelock(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to open the timelock. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className={styles.prelaunch} aria-label="Pre-launch onboarding">
    <span>PRE-LAUNCH ONBOARDING IS LIVE</span>
    <h2>Your favourite memes. Ready for launch.</h2>
    <p>Choose one or more of your favourite characters and get their official Solana tokens ahead of launch. Prices may rise and make access more expensive, but they can also fall.</p>
    <p>Lock at least <strong>500,000 tokens per character</strong> in DevFridge. Keep each qualifying lock active when you play.</p>
    <button type="button" onClick={open} disabled={busy} aria-haspopup="dialog">{busy ? "Opening timelock…" : "Lock Solana meme to unlock a character"}</button>
    <a href="https://docs.devfridge.cool/world" target="_blank" rel="noopener noreferrer">How character access works ↗</a>
    {error && <p role="alert">{error} <a href="https://devfridge.cool/" target="_blank" rel="noopener noreferrer">Open DevFridge ↗</a></p>}
  </section>;
}
