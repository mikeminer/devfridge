"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { CRANK_AUTHORITY } from "@/lib/constants";

function connection(): Connection {
  const endpoint = `${window.location.origin}/api/solana`;
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

export default function TreasuryCrank() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [vaultSol, setVaultSol] = useState<string>("…");
  const [status, setStatus] = useState("");
  const address = publicKey?.toBase58() || "";
  const isTreasury = address === CRANK_AUTHORITY;

  useEffect(() => {
    let stop = false;
    fetch("/api/boost/crank")
      .then((r) => r.json())
      .then((body) => {
        if (stop) return;
        const sol = Number(body.vaultSol);
        setVaultSol(Number.isFinite(sol) ? sol.toFixed(6) : "unknown");
      })
      .catch(() => {
        if (!stop) setVaultSol("unknown");
      });
    return () => {
      stop = true;
    };
  }, []);

  async function signCrank() {
    setStatus("");
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    if (!isTreasury) {
      setStatus("Connect the treasury wallet pappardelle.sns in Phantom.");
      return;
    }
    if (!signTransaction) {
      setStatus("This wallet cannot sign. Open the page in Phantom.");
      return;
    }
    setBusy(true);
    try {
      setStatus("Quoting at most 0.5 SOL…");
      const builtRes = await fetch("/api/boost/crank/build", { method: "POST" });
      const built = await builtRes.json();
      if (!builtRes.ok || !built.ok) throw new Error(built.error || "Could not build the crank");
      if (built.skipped) {
        setStatus(built.reason || "Nothing to swap.");
        return;
      }
      const amount = Number(built.amount) / 1e9;
      if (!Number.isFinite(amount) || amount <= 0 || amount > 0.5) {
        throw new Error("Refusing a swap outside 0 to 0.5 SOL.");
      }
      const tx = VersionedTransaction.deserialize(b64ToBytes(built.transaction));
      const message = tx.message as {
        staticAccountKeys?: { toBase58(): string }[];
        accountKeys?: { toBase58(): string }[];
      };
      const signer = (message.staticAccountKeys?.[0] || message.accountKeys?.[0])?.toBase58();
      if (signer !== CRANK_AUTHORITY) throw new Error("Crank signer is not the treasury.");
      setStatus(`Approve ${amount.toFixed(6)} SOL in Phantom. The SOL comes from the boost vault.`);
      const signed = await signTransaction(tx);
      const sent = await fetch("/api/boost/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transaction: bytesToB64(signed.serialize()) }),
      });
      const sentJson = await sent.json();
      if (!sent.ok || !sentJson.signature) throw new Error(sentJson.error || "Send failed");
      const sig = String(sentJson.signature);
      setStatus("Confirming on Solana…");
      const rpc = connection();
      const started = Date.now();
      let landed = false;
      while (Date.now() - started < 45_000) {
        const st = await rpc.getSignatureStatus(sig, { searchTransactionHistory: true });
        if (st.value?.err) throw new Error(`Crank failed on-chain: ${JSON.stringify(st.value.err)}`);
        if (st.value?.confirmationStatus === "confirmed" || st.value?.confirmationStatus === "finalized") {
          landed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      setStatus(
        landed
          ? `Burn submitted. ${amount.toFixed(6)} SOL swapped. https://solscan.io/tx/${sig}`
          : `Submitted, waiting for confirmation. https://solscan.io/tx/${sig}`
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Crank failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ice-card mx-auto mt-8 max-w-xl p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">TREASURY CRANK</p>
      <h1 className="mt-1 text-2xl font-bold">Sign the $PASTA buyback</h1>
      <p className="mt-2 text-sm text-mute">
        Phantom must be pappardelle.sns. One signature swaps at most 0.5 SOL already in the boost
        vault, buys $PASTA, and burns it. The swap does not come from your wallet. You pay the
        network fee.
      </p>
      <p className="mt-4 text-sm">
        Vault: <span className="font-bold">{vaultSol} SOL</span>
      </p>
      <p className="mt-2 break-all text-xs text-mute">
        {connected ? address : "Wallet not connected"}
        {connected && !isTreasury ? " — this is not the treasury." : ""}
      </p>
      <button
        type="button"
        className="fridge-key fridge-key-primary mt-5"
        disabled={busy}
        onClick={() => void signCrank()}
      >
        {busy ? "Waiting for Phantom…" : connected ? "Sign buyback" : "Connect Phantom"}
      </button>
      {status ? <p className="mt-4 break-all text-sm">{status}</p> : null}
    </section>
  );
}
