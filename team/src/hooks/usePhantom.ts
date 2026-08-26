import { useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display: string) => Promise<{ signature: Uint8Array }>;
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

export function usePhantom() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [error, setError] = useState("");

  const connect = useCallback(async () => {
    setError("");
    const p = getProvider();
    if (!p) {
      setError("Install Phantom wallet and reload.");
      return;
    }
    try {
      const res = await p.connect();
      setPublicKey(new PublicKey(res.publicKey.toString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const p = getProvider();
    if (p?.disconnect) await p.disconnect();
    setPublicKey(null);
  }, []);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    const p = getProvider();
    if (!p?.signMessage) throw new Error("Phantom signMessage not available");
    const { signature } = await p.signMessage(message, "utf8");
    return signature;
  }, []);

  return {
    publicKey,
    connected: Boolean(publicKey),
    installed: Boolean(getProvider()),
    error,
    connect,
    disconnect,
    signMessage,
  };
}
