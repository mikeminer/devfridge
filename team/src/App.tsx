import { Header } from "./components/Header";
import { TeamGrid } from "./components/TeamGrid";
import { AdminGuard } from "./components/AdminGuard";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
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
