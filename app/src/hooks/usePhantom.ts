import { useCallback, useMemo, useState } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { resolveRpcEndpoint } from "../lib/constants";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
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
  const connection = useMemo(
    () => new Connection(resolveRpcEndpoint(endpoint, "mainnet"), "confirmed"),
    [endpoint]
  );

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

  const sendTransaction = useCallback(async (tx: Transaction) => {
    const p = getProvider();
    if (!p || !publicKey) throw new Error("Connect Phantom first");
    tx.feePayer = publicKey;
    if (!tx.recentBlockhash) {
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
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
