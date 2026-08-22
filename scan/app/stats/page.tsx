import type { Metadata } from "next";
import { protocolStats } from "@/lib/stats";
import styles from "./stats.module.css";

export const metadata: Metadata = {
  title: "Protocol Stats",
  description:
    "Live on-chain metrics for the DevFridge protocol: active locks, unique mints, $PASTA burned, and boost SOL processed.",
};

export const dynamic = "force-dynamic";

function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function StatsPage() {
  const stats = await protocolStats();
  const burnedNum = stats.pastaBurned ? Number(stats.pastaBurned) : 0;
  const burnedUsd =
    burnedNum && stats.pastaPrice ? (burnedNum * stats.pastaPrice).toFixed(2) : null;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Protocol Stats</h1>
      <p className={styles.subtitle}>
        Live on-chain data pulled directly from the Fridge program. No manual
        updates — these numbers reflect the current state of Solana slot{" "}
        {formatNumber(0)}.
      </p>

      <div className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.label}>Active locks</span>
          <strong className={styles.value}>{formatNumber(stats.activeLocks)}</strong>
          <span className={styles.sub}>
            {formatNumber(stats.lockCount)} total (incl. expired unclaimed)
          </span>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Unique mints locked</span>
          <strong className={styles.value}>{formatNumber(stats.mints)}</strong>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Unique depositors</span>
          <strong className={styles.value}>{formatNumber(stats.depositors)}</strong>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>$PASTA burned</span>
          <strong className={styles.value}>
            {burnedNum ? formatNumber(Math.floor(burnedNum)) : "—"}
          </strong>
          <span className={styles.sub}>
            {burnedUsd ? `~$${burnedUsd} at current price` : ""}
          </span>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Boost vault balance</span>
          <strong className={styles.value}>
            {lamportsToSol(stats.boostVaultLamports)} SOL
          </strong>
          <span className={styles.sub}>Pending $PASTA buyback &amp; burn</span>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>$PASTA price</span>
          <strong className={styles.value}>
            {stats.pastaPrice
              ? `$${stats.pastaPrice.toFixed(8)}`
              : "—"}
          </strong>
          <span className={styles.sub}>via Jupiter</span>
        </article>
      </div>

      <section className={styles.methodology}>
        <h2>How this data is collected</h2>
        <ul>
          <li>
            <strong>Lock counts:</strong> <code>getProgramAccounts</code> filtered
            by the Fridge program ID with <code>dataSize: 105</code> (Lock account
            discriminator).
          </li>
          <li>
            <strong>$PASTA burned:</strong> Token balance of the incinerator
            address (<code>1nc1nerator...111</code>) for the PASTA mint.
          </li>
          <li>
            <strong>Boost vault:</strong> SOL balance of the PDA at seeds{" "}
            <code>[&quot;boost_vault&quot;]</code>.
          </li>
          <li>
            <strong>Price:</strong> Jupiter Price API v2.
          </li>
        </ul>
        <p>
          Data refreshes every 60 seconds. Source code:{" "}
          <a
            href="https://github.com/mikeminer/devfridge/blob/master/scan/lib/stats.ts"
            target="_blank"
            rel="noreferrer"
          >
            scan/lib/stats.ts
          </a>
        </p>
      </section>

      <footer className={styles.footer}>
        <p>
          JSON API:{" "}
          <a href="/api/stats">
            <code>scan.devfridge.cool/api/stats</code>
          </a>
        </p>
      </footer>
    </main>
  );
}
