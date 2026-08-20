"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { BOOST_TIERS, TREASURY, type BoostTier } from "@/lib/constants";
import { isMintAddress } from "@/lib/format";

export default function BoostSubscribe({
  fixedMint,
  compact,
}: {
  fixedMint?: string;
  compact?: boolean;
}) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [mint, setMint] = useState(fixedMint ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [needFridge, setNeedFridge] = useState(false);

  async function boost(tier: BoostTier) {
    setStatus("");
    setNeedFridge(false);
    const m = (fixedMint || mint).trim();
    if (!isMintAddress(m)) {
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
      const lamports = Math.round(BOOST_TIERS[tier].sol * 1_000_000_000);
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
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
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
          placeholder="Your Token-2022 mint address"
          value={mint}
          onChange={(e) => setMint(e.target.value.trim())}
        />
      )}

      <div className={`mt-4 grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`}>
        {(Object.keys(BOOST_TIERS) as BoostTier[]).map((tier) => (
          <button
            key={tier}
            type="button"
            disabled={busy}
            className="rounded-xl border border-line px-4 py-3 text-left hover:border-ice disabled:opacity-50"
            onClick={() => void boost(tier)}
          >
            <span className="block text-lg">{BOOST_TIERS[tier].fire}</span>
            <span className="font-semibold">{BOOST_TIERS[tier].label}</span>
            <span className="mt-1 block text-ice">{BOOST_TIERS[tier].sol} SOL</span>
          </button>
        ))}
      </div>

      {needFridge && (
        <a
          className="mt-4 inline-flex rounded-xl bg-ice px-4 py-2 text-sm font-semibold text-navy"
          href={
            isMintAddress(fixedMint || mint)
              ? `https://devfridge.cool/?mint=${fixedMint || mint}`
              : "https://devfridge.cool/"
          }
        >
          Fridge it on devfridge.cool first
        </a>
      )}
      {status && <p className="mt-3 text-sm text-mute">{status}</p>}
    </section>
  );
}
