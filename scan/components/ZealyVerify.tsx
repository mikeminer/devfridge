"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";

export default function ZealyVerify({ mint }: { mint: string }) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [status, setStatus] = useState<"idle" | "signing" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleVerify() {
    if (!connected || !publicKey || !signMessage) {
      setVisible(true);
      return;
    }

    setStatus("signing");
    setMsg("");

    try {
      const message = `DevFridge Zealy verify: fridge-check:${mint}`;
      const encoded = new TextEncoder().encode(message);
      const sig = await signMessage(encoded);
      const sigBase64 = Buffer.from(sig).toString("base64");

      const res = await fetch("/api/zealy/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          mint,
          action: "fridge-check",
          signature: sigBase64,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (res.ok && data.ok) {
        setStatus("ok");
        setMsg("Fridge Check verified for Zealy!");
      } else {
        setStatus("error");
        setMsg(data.error || data.message || "Verification failed");
      }
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Signing cancelled or failed");
    }
  }

  return (
    <section className="ice-card p-5">
      <p className="text-[10px] font-bold tracking-[0.16em] text-mute">ZEALY QUEST</p>
      <p className="mt-1 text-sm text-ink">
        Verify this Fridge Check for your Zealy quest. Connect your wallet and sign to prove ownership.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleVerify}
          disabled={status === "signing"}
          className="fridge-key fridge-key-primary disabled:opacity-50"
        >
          {!connected
            ? "Connect wallet"
            : status === "signing"
              ? "Signing…"
              : status === "ok"
                ? "Verified"
                : "Verify for Zealy"}
        </button>
        {msg && (
          <span className={`text-xs ${status === "ok" ? "text-ice" : "text-caution"}`}>
            {msg}
          </span>
        )}
      </div>
    </section>
  );
}
