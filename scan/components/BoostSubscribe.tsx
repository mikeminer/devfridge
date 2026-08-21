"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { BOOST_TIERS, TREASURY, type BoostTier } from "@/lib/constants";
import { parseMint } from "@/lib/format";

function boostConnection(): Connection {
  const endpoint =
    typeof window === "undefined" ? "/api/solana" : `${window.location.origin}/api/solana`;
  return new Connection(endpoint, "confirmed");
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
      const rpc = boostConnection();
      const lamports = Math.round(BOOST_TIERS[tier].sol * 1_000_000_000);
      const latest = await rpc.getLatestBlockhash("confirmed");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY),
          lamports,
        }),
        new TransactionInstruction({
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          keys: [],
          data: Buffer.from(`devfridge-boost:${tier}:${m}`),
        })
      );
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const signed = await signTransaction(tx);
      const sig = await rpc.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      await rpc.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, signature: sig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Boost record failed");
      setStatus(`Featured for ${BOOST_TIERS[tier].label}. SOL goes to $PASTA buyback/burn.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="feature" className="ice-card p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">GET FEATURED</p>
      <h2 className="mt-1 text-xl font-bold sm:text-2xl">Feature your fridged token</h2>
      <p className="mt-2 text-sm text-mute">
        Pay SOL to appear in the Boosted feed. Only tokens with a live Fridge lock can subscribe.
        Fees buy and burn $PASTA.
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
            <span className="fridge-plan-go">Lock in</span>
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
