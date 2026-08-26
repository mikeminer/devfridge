import { useState } from "react";
import type { TeamMemberWithVerification } from "../hooks/useTeamMembers";
import type { TeamMember } from "../lib/api";
import type { TierNumber } from "../config/tiers";
import { TIERS } from "../config/tiers";
import { AddMemberForm } from "./AddMemberForm";
import { EditMemberModal } from "./EditMemberModal";

type Props = {
  members: TeamMemberWithVerification[];
  onAdd: (wallet: string, role: string, tier: number, displayName: string | null) => Promise<void>;
  onEdit: (wallet: string, role: string, tier: number, displayName: string | null) => Promise<void>;
  onRemove: (wallet: string) => Promise<void>;
};

function shortKey(key: string): string {
  return key.slice(0, 6) + "\u2026" + key.slice(-4);
}

export function AdminPanel({ members, onAdd, onEdit, onRemove }: Props) {
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  async function handleRemove(wallet: string) {
    setRemoving(wallet);
    setRemoveError("");
    try {
      await onRemove(wallet);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="admin-panel">
      <h2>Team Administration</h2>

      <h3 style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 12px" }}>
        Add New Member
      </h3>
      <AddMemberForm onSubmit={onAdd} />

      {members.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", margin: "24px 0 12px" }}>
            Current Roster ({members.length})
          </h3>
          {removeError && <div className="error-bar">{removeError}</div>}
          <table className="admin-roster">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Role</th>
                <th>Tier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.wallet}>
                  <td>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                      {shortKey(m.wallet)}
                    </span>
                    {m.displayName && (
                      <span style={{ marginLeft: 6, color: "var(--muted)", fontSize: 12 }}>
                        ({m.displayName})
                      </span>
                    )}
                  </td>
                  <td style={{ color: TIERS[m.tier as TierNumber].color }}>
                    {m.role}
                  </td>
                  <td>T{m.tier}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditing(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemove(m.wallet)}
                        disabled={removing === m.wallet}
                      >
                        {removing === m.wallet ? "..." : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {editing && (
        <EditMemberModal
          member={editing}
          onSave={onEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
