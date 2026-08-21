"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { parseMint } from "@/lib/format";

function boostConnection(): Connection {
  const endpoint =
    typeof window === "undefined" ? "/api/solana" : `${window.location.origin}/api/solana`;
  return new Connection(endpoint, "confirmed");
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default function BoostSubscribe({
  fixedMint,
  compact,
}: {
  fixedMint?: string;
  compact?: boolean;
}) {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mint, setMint] = useState(fixedMint ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [needFridge, setNeedFridge] = useState(false);

  async function boost(tier: BoostTier) {
    setStatus("");
    setNeedFridge(false);
    const m = parseMint(fixedMint || mint);
    if (!m) {
      setStatus("Enter a valid mint address first.");
      return;
    }
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    setBusy(true);
    try {
      const fridge = await fetch(`/api/fridge?mint=${m}`).then((r) => r.json());
      if (fridge.status !== "fridged") {
        setNeedFridge(true);
        setStatus("Only fridged tokens can be featured.");
        setBusy(false);
        return;
      }
      if (!signTransaction) {
        throw new Error("This wallet cannot sign locally. Use Phantom or Solflare.");
      }

      const pendingKey = `devfridge-boost-sig:${m}:${tier}:${publicKey.toBase58()}`;
      let sig = "";
      try {
        sig = sessionStorage.getItem(pendingKey) || "";
      } catch {
        sig = "";
      }

      const rpc = boostConnection();
      if (sig) {
        const st = await rpc.getSignatureStatus(sig, { searchTransactionHistory: true });
        if (!st.value) {
          try {
            sessionStorage.removeItem(pendingKey);
          } catch {
            /* ignore */
          }
          sig = "";
        }
      }
      if (!sig) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          setStatus(
            attempt === 1
              ? "Building on-chain buy & burn…"
              : "Blockhash expired — rebuilding. Sign again (you were not charged)."
          );
          const builtRes = await fetch("/api/boost/build", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mint: m, tier, payer: publicKey.toBase58() }),
          });
          const built = await builtRes.json();
          if (!builtRes.ok) throw new Error(built.error || "Could not build boost");
          setStatus("Sign now — the tx expires in about a minute.");
          const tx = VersionedTransaction.deserialize(b64ToBytes(built.transaction));
          const signed = await signTransaction(tx);
          try {
            sig = await rpc.sendRawTransaction(signed.serialize(), {
              skipPreflight: false,
              preflightCommitment: "processed",
              maxRetries: 8,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (attempt < 2 && /block height|blockhash|expired/i.test(msg)) continue;
            throw err;
          }
          try {
            sessionStorage.setItem(pendingKey, sig);
          } catch {
            /* ignore */
          }
          setStatus("Confirming on Solana…");
          const started = Date.now();
          let landed = false;
          while (Date.now() - started < 45_000) {
            const st = await rpc.getSignatureStatus(sig, { searchTransactionHistory: true });
            if (st.value?.err) {
              try {
                sessionStorage.removeItem(pendingKey);
              } catch {
                /* ignore */
              }
              throw new Error(`Boost failed on-chain: ${JSON.stringify(st.value.err)}`);
            }
            if (
              st.value?.confirmationStatus === "confirmed" ||
              st.value?.confirmationStatus === "finalized"
            ) {
              landed = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (landed) break;
          try {
            sessionStorage.removeItem(pendingKey);
          } catch {
            /* ignore */
          }
          if (attempt < 2) continue;
          throw new Error(
            `Boost transaction not confirmed yet. Check https://solscan.io/tx/${sig}`
          );
        }
      } else {
        setStatus("Found a pending boost signature. Indexing it…");
      }

      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, signature: sig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Boost record failed");
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* ignore */
      }
      const hours = BOOST_TIERS[tier].hours;
      const last = hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
      setStatus(`Featured for ${last}. $PASTA bought and burned in the Fridge program.`);
      window.dispatchEvent(new Event("devfridge:boosted"));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (/insufficient|debit|no record of a prior credit|0x1/i.test(raw)) {
        setStatus(
          `Not enough SOL in the connected wallet. Keep about ${(BOOST_TIERS[tier].sol + 0.05).toFixed(2)} SOL free: ${BOOST_TIERS[tier].sol} for the package plus rent and fees. ${raw}`
        );
      } else if (/block height exceeded|blockhash/i.test(raw)) {
        setStatus(
          "The transaction expired before it landed (Phantom took too long). You were not charged. Click Buy & burn again and approve quickly."
        );
      } else {
        setStatus(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="feature" className="ice-card p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">GET FEATURED</p>
      <h2 className="mt-1 text-xl font-bold sm:text-2xl">Feature your fridged token</h2>
      <p className="mt-2 text-sm text-mute">
        One signature. The Fridge program wraps your SOL, Jupiter-buys $PASTA as the burn PDA, and
        burns it in the same transaction — you never receive that $PASTA. Keep a little extra SOL
        for rent and fees (about 0.15 SOL total for 24h). Live Fridge lock required.
      </p>

      {!fixedMint && (
        <input
          className="ice-input mt-4 font-mono text-sm"
          placeholder="Mint or pump.fun / Dexscreener URL"
          value={mint}
          onChange={(e) => setMint(e.target.value.trim())}
          onPaste={(e) => {
            const parsed = parseMint(e.clipboardData.getData("text"));
            if (parsed) {
              e.preventDefault();
              setMint(parsed);
            }
          }}
        />
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(Object.keys(BOOST_TIERS) as BoostTier[]).map((tier) => (
          <button
            key={tier}
            type="button"
            disabled={busy}
            className={`fridge-plan fridge-plan-${tier}`}
            onClick={() => void boost(tier)}
          >
            <span className="fridge-plan-kicker">{compact ? "Slot" : "Featured slot"}</span>
            <span className="fridge-plan-label">{BOOST_TIERS[tier].label}</span>
            <span className="fridge-plan-price">{BOOST_TIERS[tier].sol} SOL</span>
            <span className="fridge-plan-go">{busy ? "Working…" : "Buy & burn"}</span>
          </button>
        ))}
      </div>

      {needFridge && (
        <a
          className="fridge-key fridge-key-primary mt-4"
          href={
            parseMint(fixedMint || mint)
              ? `https://devfridge.cool/?mint=${parseMint(fixedMint || mint)}`
              : "https://devfridge.cool/"
          }
        >
          Fridge it first
        </a>
      )}
      {status && <p className="mt-3 text-sm text-mute">{status}</p>}
    </section>
  );
}
