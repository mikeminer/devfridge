"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
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

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

type Plan = {
  instructions: Array<{
    programId: string;
    keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
    data: string;
  }>;
  error?: string;
};

async function waitForBoostedMint(mint: string): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const res = await fetch("/api/feed/boosted", { cache: "no-store" });
      const json = (await res.json()) as { tokens?: { mint?: string }[] };
      if ((json.tokens || []).some((t) => t.mint === mint)) return true;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function compileLegacy(plan: Plan, payer: PublicKey, blockhash: string): Transaction {
  const tx = new Transaction();
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  for (const ix of plan.instructions) {
    tx.add(
      new TransactionInstruction({
        programId: new PublicKey(ix.programId),
        keys: ix.keys.map((k) => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(b64ToBytes(ix.data)),
      })
    );
  }
  return tx;
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
      setStatus("Building feature payment…");
      const builtRes = await fetch("/api/boost/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, payer: publicKey.toBase58() }),
      });
      const plan = (await builtRes.json()) as Plan;
      if (!builtRes.ok || !plan.instructions) {
        throw new Error(plan.error || "Could not build boost");
      }

      let sig = "";
      for (let attempt = 1; attempt <= 3; attempt++) {
        setStatus(
          attempt === 1
            ? "Sign now — approve Phantom immediately."
            : "Blockhash expired. Sign again (you were not charged)."
        );
        const latest = await rpc.getLatestBlockhash("confirmed");
        const tx = compileLegacy(plan, publicKey, latest.blockhash);
        const signed = await signTransaction(tx);
        const still = await rpc.isBlockhashValid(latest.blockhash, { commitment: "processed" });
        if (!still.value) {
          if (attempt < 3) continue;
          throw new Error(
            "Blockhash expired while Phantom was open. You were not charged — click Feature and approve immediately."
          );
        }
        const wire = bytesToB64(signed.serialize());
        const sent = await fetch("/api/boost/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transaction: wire }),
        });
        const sentJson = await sent.json();
        if (!sent.ok) {
          const msg = String(sentJson.error || "send failed");
          if (attempt < 3 && /blockhash|block height|expired|0x1/i.test(msg)) continue;
          throw new Error(msg);
        }
        sig = sentJson.signature;
        setStatus("Confirming on Solana…");
        const started = Date.now();
        let landed = false;
        while (Date.now() - started < 45_000) {
          const st = await rpc.getSignatureStatus(sig, { searchTransactionHistory: true });
          if (st.value?.err) {
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
        if (attempt < 3) continue;
        throw new Error(`Boost not confirmed yet. Check https://solscan.io/tx/${sig}`);
      }

      setStatus("Indexing the featured listing…");
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, signature: sig }),
      });
      const json = await res.json();
      const hours = BOOST_TIERS[tier].hours;
      const last = hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
      const featured = `Featured for ${last}. The program will buy and burn $PASTA from its vault.`;
      if (!res.ok) {
        const live = await waitForBoostedMint(m);
        if (!live) throw new Error(json.error || "Boost record failed");
      }
      setStatus(featured);
      window.dispatchEvent(new Event("devfridge:boosted"));
      void fetch("/api/boost/crank", { method: "POST" }).catch(() => {});
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (/insufficient|debit|no record of a prior credit|0x1/i.test(raw)) {
        setStatus(
          `Not enough SOL in the connected wallet. Keep about ${(BOOST_TIERS[tier].sol + 0.02).toFixed(2)} SOL free: ${BOOST_TIERS[tier].sol} for the package plus rent and fees.`
        );
      } else if (/block height exceeded|blockhash/i.test(raw)) {
        setStatus(
          "The transaction expired before it landed. You were not charged. Click Feature again and approve Phantom immediately."
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
        One signature: you pay SOL and the token is featured immediately. The Fridge program later
        wraps that SOL, Jupiter-buys $PASTA, and burns it — that $PASTA never hits your wallet. Live
        Fridge lock required.
      </p>
      <p className="mt-2 text-xs text-mute">
        This is a labeled sponsored placement. Payment never changes scanner checks or risk grades.
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
            <span className="fridge-plan-go">{busy ? "Working…" : "Feature"}</span>
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
