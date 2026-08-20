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

export default function BoostModal({ mint }: { mint: string }) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function boost(tier: BoostTier) {
    setStatus("");
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    setBusy(true);
    try {
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
          data: Buffer.from(`devfridge-boost:${tier}:${mint}`),
        })
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint, tier, signature: sig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Boost record failed");
      setStatus(`Boosted ${BOOST_TIERS[tier].label}. SOL goes to $PASTA buyback/burn.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="rounded-xl border border-ice px-4 py-2 text-sm font-semibold text-ice"
        onClick={() => setOpen(true)}
      >
        Boost this token
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/80 p-4">
          <div className="ice-card w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Boost visibility</h3>
              <button type="button" className="text-mute" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-mute">
              Fees land in the DevFridge treasury and are used to buy and burn $PASTA.
            </p>
            <div className="mt-4 grid gap-2">
              {(Object.keys(BOOST_TIERS) as BoostTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-line px-4 py-3 text-left hover:border-ice disabled:opacity-50"
                  onClick={() => void boost(tier)}
                >
                  <span className="font-semibold">
                    {BOOST_TIERS[tier].fire} {BOOST_TIERS[tier].label}
                  </span>
                  <span className="ml-2 text-ice">{BOOST_TIERS[tier].sol} SOL</span>
                </button>
              ))}
            </div>
            {status && <p className="mt-3 text-sm text-mute">{status}</p>}
          </div>
        </div>
      )}
    </>
  );
}
