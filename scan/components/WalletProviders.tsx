"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const FALLBACK_RPC = "https://scan.devfridge.cool/api/solana";

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const [endpoint, setEndpoint] = useState(FALLBACK_RPC);
  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/solana`);
  }, []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );
  const Conn = ConnectionProvider as unknown as ComponentType<{
    endpoint: string;
    config?: { commitment: "confirmed" };
    children?: ReactNode;
  }>;
  const Wall = WalletProvider as unknown as ComponentType<{
    wallets: unknown[];
    autoConnect?: boolean;
    children?: ReactNode;
  }>;
  const Modal = WalletModalProvider as unknown as ComponentType<{
    children?: ReactNode;
  }>;
  return (
    <Conn endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <Wall wallets={wallets} autoConnect>
        <Modal>{children}</Modal>
      </Wall>
    </Conn>
  );
}
