import { useCallback, useMemo, useState } from "react";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { isHttpEndpoint, resolveRpcEndpoint } from "../lib/constants";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (
    tx: Transaction | VersionedTransaction
  ) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (
    tx: Transaction | VersionedTransaction
  ) => Promise<{ signature: string }>;
};

function getProvider(): PhantomProvider | null {
  const w = window as Window & {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solana?.isPhantom) return w.solana;
  return null;
}

export function usePhantom(endpoint: string) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [error, setError] = useState("");
  const connection = useMemo(() => {
    const url = isHttpEndpoint(endpoint)
      ? endpoint.replace(/\/+$/, "")
      : resolveRpcEndpoint("", "mainnet");
    return new Connection(url, "confirmed");
  }, [endpoint]);

  const connect = useCallback(async () => {
    setError("");
    const p = getProvider();
    if (!p) {
      setError("Apri Phantom in Chrome e ricarica.");
      return;
    }
    try {
      const res = await p.connect();
      setPublicKey(new PublicKey(res.publicKey.toString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const sendTransaction = useCallback(async (
    tx: Transaction | VersionedTransaction,
    extraSigners: Keypair[] = []
  ) => {
    const p = getProvider();
    if (!p || !publicKey) throw new Error("Connect Phantom first");
    const sendOpts = {
      skipPreflight: false,
      maxRetries: 8,
      preflightCommitment: "confirmed" as const,
    };

    if (tx instanceof Transaction) {
      tx.feePayer = publicKey;
      if (!tx.recentBlockhash) {
        const latest = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = latest.blockhash;
        tx.lastValidBlockHeight = latest.lastValidBlockHeight;
      }
      if (extraSigners.length) tx.partialSign(...extraSigners);
    }

    // Always submit on DevFridge's selected cluster RPC. Phantom's
    // signAndSendTransaction uses the wallet's network, which is often
    // still Mainnet when the site is on Devnet/Testnet.
    if (p.signTransaction) {
      const signed = await p.signTransaction(tx);
      if (signed instanceof Transaction) {
        const out = Transaction.from(
          signed.serialize({ requireAllSignatures: false, verifySignatures: false })
        );
        if (extraSigners.length) out.partialSign(...extraSigners);
        return connection.sendRawTransaction(out.serialize(), sendOpts);
      }
      return connection.sendRawTransaction(
        (signed as VersionedTransaction).serialize(),
        sendOpts
      );
    }

    const { signature } = await p.signAndSendTransaction(tx);
    return signature;
  }, [connection, publicKey]);

  return {
    publicKey,
    connected: Boolean(publicKey),
    installed: Boolean(getProvider()),
    error,
    connect,
    sendTransaction,
    connection,
  };
}
