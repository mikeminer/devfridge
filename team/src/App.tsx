import { Header } from "./components/Header";
import { TeamGrid } from "./components/TeamGrid";
import { AdminGuard } from "./components/AdminGuard";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
import { WalletCheck } from "./components/WalletCheck";
import { usePhantom } from "./hooks/usePhantom";
import { useTeamMembers } from "./hooks/useTeamMembers";
import { useAdmin } from "./hooks/useAdmin";

export function App() {
  const { publicKey, connected, error: walletError, connect, disconnect, signMessage } = usePhantom();
  const { members, loading, error: teamError, reload } = useTeamMembers();
  const { isAdmin, add, remove, edit } = useAdmin({ publicKey, signMessage, onUpdate: reload });

  return (
    <div className="shell">
      <Header
        publicKey={publicKey}
        connected={connected}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {walletError && <div className="error-bar">{walletError}</div>}
      {teamError && <div className="error-bar">{teamError}</div>}

      <section className="visitor-hero" aria-labelledby="visitor-hero-title">
        <p className="visitor-kicker">LIVE PROOF ON SOLANA</p>
        <h2 id="visitor-hero-title">See who is actually committed to DevFridge.</h2>
        <p className="visitor-copy">
          Review public team roles, wallets and time-locked commitments without signing in.
          Every status below is independently checked against Solana.
        </p>
        <WalletCheck />
        <div className="visitor-actions visitor-secondary-actions">
          <a
            className="btn"
            href="https://devfridge.cool/?utm_source=team&utm_medium=website&utm_campaign=verified-team"
            target="_blank"
            rel="noopener"
          >
            Open the vault
          </a>
          <a
            className="visitor-link"
            href="https://connect.devfridge.cool/?utm_source=team&utm_medium=website&utm_campaign=verified-team"
            target="_blank"
            rel="noopener"
          >
            Join or partner with us →
          </a>
        </div>
        <ul className="visitor-proof" aria-label="Trust guarantees">
          <li>No signup required</li>
          <li>No seed phrase requested</li>
          <li>Public on-chain verification</li>
        </ul>
      </section>

      <TeamGrid members={members} loading={loading} />

      <AdminGuard isAdmin={isAdmin} connected={connected}>
        <AdminPanel
          members={members}
          onAdd={add}
          onEdit={edit}
          onRemove={remove}
        />
      </AdminGuard>

      <Footer />
    </div>
  );
}
