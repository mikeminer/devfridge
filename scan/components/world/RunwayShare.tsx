"use client";

import { useState } from "react";
import styles from "./runway.module.css";

const TAGS = ["Solana", "Memecoins", "ItalianBrainrot", "Pons", "PumpFun", "Robinhood", "RobinhoodChain"];

export default function RunwayShare({ id, name, address }: { id: string; name: string; address: string }) {
  const [status, setStatus] = useState("");
  const url = `https://world.devfridge.cool/?character=${encodeURIComponent(id)}`;
  const text = `${name} on the brainrot runway!\nCA: ${address}\nPons: https://www.ponsfamily.com/launchpad/${address}\npump.fun: https://pump.fun/coin/${address}\n${TAGS.map(tag => `#${tag}`).join(" ")}`;
  const fullPost = `${text}\n${url}`;
  const links = [
    ["X", `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url })}`],
    ["Telegram", `https://t.me/share/url?${new URLSearchParams({ url, text })}`],
    ["WhatsApp", `https://wa.me/?${new URLSearchParams({ text: fullPost })}`],
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(fullPost); setStatus("Post copied — paste it into your favorite social app."); }
    catch { setStatus("Copy unavailable. Select the post below and copy it manually."); }
  };
  return <section className={styles.sharing} aria-label={`Share ${name}`}>
    <div className={styles.shareButtons}>
      {links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share ${name} on ${label} in a new tab`}>{label}</a>)}
      <button type="button" onClick={copy}>Copy post</button>
      <details className={styles.shareDetails}>
        <summary>Hashtags &amp; post</summary>
        <div className={styles.sharePreview}>
          <strong>Share {name}</strong>
          <p className={styles.hashtags}>{TAGS.map(tag => <span key={tag}>#{tag}</span>)}</p>
          <textarea aria-label={`Share post for ${name}`} readOnly value={fullPost} onFocus={event => event.currentTarget.select()} rows={7} />
          <p>Choose a network above or copy the post to share.</p>
        </div>
      </details>
    </div>
    {status && <p className={styles.status} role="status">{status}</p>}
  </section>;
}
