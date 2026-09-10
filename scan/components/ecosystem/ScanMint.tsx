"use client";

import { useState } from "react";
import styles from "./ecosystem.module.css";

const PASTA = "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";

export default function ScanMint() {
  const [mint, setMint] = useState("");
  const value = mint.trim() || PASTA;
  return (
    <section className="ice-card p-5">
      <p className={styles.kicker}>Use the product</p>
      <h2 className="mt-1 text-xl font-bold">Scan this mint</h2>
      <p className="mt-2 text-sm text-mute">
        Paste a Solana Token-2022 mint. The kitchen map should send you into Scan, not into a brochure.
      </p>
      <form
        className={`${styles.scanRow} mt-4`}
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `https://scan.devfridge.cool/t/${encodeURIComponent(value)}`;
        }}
      >
        <input
          className="ice-input"
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          placeholder={PASTA}
          spellCheck={false}
          aria-label="Solana mint address"
        />
        <button className="fridge-key fridge-key-primary" type="submit">
          Scan
        </button>
      </form>
      <p className="mt-3 font-mono text-xs text-mute">Ticker ≠ identity. Match the full address.</p>
    </section>
  );
}
