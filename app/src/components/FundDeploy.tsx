import { useState } from "react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { usePhantom } from "../hooks/usePhantom";
import { confirmSignature } from "../lib/fridge";

const DEPLOYER = new PublicKey("7rXYtcws1sHW5Hhgx79AeMQYGfTtREzyvWq63FVpSyUY");
const PROGRAM_ID = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6";
const LAMPORTS = 2_500_000_000;

export default function FundDeploy() {
  const wallet = usePhantom("mainnet", "https://api.mainnet-beta.solana.com");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function send() {
    if (!wallet.publicKey) {
      setStatus("Connetti Phantom prima.");
      return;
    }
    setBusy(true);
    setStatus("Apri Phantom e conferma 2.5 SOL su mainnet…");
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: DEPLOYER,
          lamports: LAMPORTS,
        })
      );
      const sig = await wallet.sendTransaction(tx);
      await confirmSignature(wallet.connection, sig);
      setStatus("2.5 SOL inviati. Il deploy mainnet parte da solo.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyAddr() {
    await navigator.clipboard.writeText(DEPLOYER.toBase58());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="app kitchen">
      <section className="stock-panel" style={{ maxWidth: 560, margin: "8vh auto" }}>
        <p className="eyebrow">Mainnet deploy</p>
        <h2>Paga il deploy con Phantom</h2>
        <p className="lede">
          Invia 2.5 SOL al wallet di deploy. Programma
          <span className="mono"> {PROGRAM_ID}</span>
        </p>
        {!wallet.installed && (
          <div className="banner warn">Phantom non trovato. Sblocca l'estensione e ricarica.</div>
        )}
        {wallet.connected ? (
          <p className="ok">Connesso {wallet.publicKey?.toBase58().slice(0, 4)}…</p>
        ) : (
          <button className="primary" type="button" onClick={() => void wallet.connect()}>
            Connect Phantom
          </button>
        )}
        <label>Wallet di deploy</label>
        <div className="box mono">{DEPLOYER.toBase58()}</div>
        <button className="ghost" type="button" onClick={() => void copyAddr()}>
          {copied ? "Copiato" : "Copia indirizzo"}
        </button>
        <button className="primary" type="button" disabled={busy || !wallet.connected} onClick={() => void send()}>
          {busy ? "Attendo Phantom…" : "Invia 2.5 SOL (mainnet)"}
        </button>
        {status && <div className="banner warn">{status}</div>}
      </section>
    </div>
  );
}
