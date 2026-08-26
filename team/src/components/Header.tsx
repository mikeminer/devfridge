import type { PublicKey } from "@solana/web3.js";

type Props = {
  publicKey: PublicKey | null;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

function shortKey(key: string): string {
  return key.slice(0, 4) + "..." + key.slice(-4);
}

export function Header({ publicKey, connected, onConnect, onDisconnect }: Props) {
  return (
    <header className="header">
      <div className="header-brand">
        <div>
          <h1>DevFridge Team</h1>
          <p>On-chain verifiable team page</p>
        </div>
      </div>
      {connected && publicKey ? (
        <button className="btn" onClick={onDisconnect}>
          {shortKey(publicKey.toBase58())}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onConnect}>
          Connect Wallet
        </button>
      )}
    </header>
  );
}
