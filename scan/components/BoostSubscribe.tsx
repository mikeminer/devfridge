"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { fmtAmount, parseMint } from "@/lib/format";

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

function pendingKey(payer: string, mint: string, tier: string) {
  return `devfridge-boost:${payer}:${mint}:${tier}`;
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

  async function sendAndConfirm(
    rpc: Connection,
    signed: Transaction | VersionedTransaction,
    blockhash?: string,
    lastValidBlockHeight?: number
  ) {
    const sig = await rpc.sendRawTransaction(signed.serialize(), {
      skipPreflight: signed instanceof VersionedTransaction,
      maxRetries: 4,
    });
    if (blockhash && lastValidBlockHeight) {
      await rpc.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    } else {
      await rpc.confirmTransaction(sig, "confirmed");
    }
    return sig;
  }

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
    const payer = publicKey.toBase58();
    const key = pendingKey(payer, m, tier);
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
      let swapSig = "";
      try {
        swapSig = sessionStorage.getItem(key) || "";
      } catch {
        swapSig = "";
      }

      if (!swapSig) {
        setStatus("Sign 1 of 2: Jupiter buys $PASTA with your SOL…");
        const builtRes = await fetch("/api/boost/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mint: m, tier, payer }),
        });
        const built = await builtRes.json();
        if (!builtRes.ok) throw new Error(built.error || "Could not build $PASTA buy");
        const swapTx = VersionedTransaction.deserialize(b64ToBytes(built.transaction));
        const signedSwap = await signTransaction(swapTx);
        swapSig = await sendAndConfirm(rpc, signedSwap, undefined, built.lastValidBlockHeight);
        try {
          sessionStorage.setItem(key, swapSig);
        } catch {
          /* ignore */
        }
      } else {
        setStatus("Swap already landed. Sign 2 of 2 to burn $PASTA…");
      }

      setStatus("Sign 2 of 2: burn $PASTA and list the boost…");
      const burnRes = await fetch("/api/boost/burn-build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, payer, swapSignature: swapSig }),
      });
      const burnBuilt = await burnRes.json();
      if (!burnRes.ok) throw new Error(burnBuilt.error || "Could not build $PASTA burn");
      const burnTx = Transaction.from(b64ToBytes(burnBuilt.transaction));
      const signedBurn = await signTransaction(burnTx);
      const burnSig = await sendAndConfirm(
        rpc,
        signedBurn,
        burnBuilt.blockhash,
        burnBuilt.lastValidBlockHeight
      );

      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mint: m,
          tier,
          signature: burnSig,
          swapSignature: swapSig,
          payer,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Boost record failed");
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      const burned = json.burned
        ? fmtAmount(String(json.burned), 6)
        : fmtAmount(String(burnBuilt.amount || "0"), 6);
      const hours = BOOST_TIERS[tier].hours;
      const last = hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
      setStatus(`Featured for ${last}. Burned ${burned} $PASTA.`);
      window.dispatchEvent(new Event("devfridge:boosted"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const pending = (() => {
        try {
          return Boolean(sessionStorage.getItem(key));
        } catch {
          return false;
        }
      })();
      setStatus(
        pending
          ? `${msg} SOL already bought $PASTA — click Buy & burn again to sign only the burn.`
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="feature" className="ice-card p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">GET FEATURED</p>
      <h2 className="mt-1 text-xl font-bold sm:text-2xl">Feature your fridged token</h2>
      <p className="mt-2 text-sm text-mute">
        Two signatures, on purpose: Jupiter buys $PASTA, then a second tx burns it. That split is
        more reliable than stuffing the burn into Jupiter&apos;s swap. Your token stays in Boosted
        for the whole package (24h, 48h, or 7 days). Live Fridge lock required.
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
