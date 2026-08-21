"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
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

type Plan = {
  instructions: Array<{
    programId: string;
    keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
    data: string;
  }>;
  alts: { key: string; data: string }[];
  minPastaOut?: string;
  error?: string;
};

function compilePlan(plan: Plan, payer: PublicKey, blockhash: string): VersionedTransaction {
  const ixs = plan.instructions.map(
    (ix) =>
      new TransactionInstruction({
        programId: new PublicKey(ix.programId),
        keys: ix.keys.map((k) => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: b64ToBytes(ix.data),
      })
  );
  const alts = plan.alts.map(
    (row) =>
      new AddressLookupTableAccount({
        key: new PublicKey(row.key),
        state: AddressLookupTableAccount.deserialize(b64ToBytes(row.data)),
      })
  );
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message(alts);
  return new VersionedTransaction(message);
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
      setStatus("Building on-chain buy & burn…");
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
            ? "Sign now — approve Phantom quickly."
            : "Blockhash expired. Sign again (you were not charged)."
        );
        const { blockhash } = await rpc.getLatestBlockhash("processed");
        const tx = compilePlan(plan, publicKey, blockhash);
        const signed = await signTransaction(tx);
        try {
          sig = await rpc.sendRawTransaction(signed.serialize(), {
            skipPreflight: true,
            maxRetries: 4,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (attempt < 3 && /block height|blockhash|expired/i.test(msg)) continue;
          throw err;
        }
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

      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: m, tier, signature: sig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Boost record failed");
      const hours = BOOST_TIERS[tier].hours;
      const last = hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
      setStatus(`Featured for ${last}. $PASTA bought and burned in the Fridge program.`);
      window.dispatchEvent(new Event("devfridge:boosted"));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (/insufficient|debit|no record of a prior credit|0x1/i.test(raw)) {
        setStatus(
          `Not enough SOL in the connected wallet. Keep about ${(BOOST_TIERS[tier].sol + 0.05).toFixed(2)} SOL free: ${BOOST_TIERS[tier].sol} for the package plus rent and fees.`
        );
      } else if (/block height exceeded|blockhash/i.test(raw)) {
        setStatus(
          "The transaction expired before it landed. You were not charged. Click Buy & burn again and approve Phantom immediately."
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
        burns it in the same transaction — you never receive that $PASTA. Approve Phantom as soon
        as it opens. Live Fridge lock required.
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
