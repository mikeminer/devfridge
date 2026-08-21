"use client";

import { useMemo, type ComponentType, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => (typeof window === "undefined" ? "/api/rpc" : `${window.location.origin}/api/rpc`),
    []
  );
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );
  const Conn = ConnectionProvider as unknown as ComponentType<{
    endpoint: string;
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
    <Conn endpoint={endpoint}>
      <Wall wallets={wallets} autoConnect>
        <Modal>{children}</Modal>
      </Wall>
    </Conn>
  );
}
