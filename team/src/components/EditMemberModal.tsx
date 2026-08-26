import { useState } from "react";
import type { TeamMember } from "../lib/api";
import { TIERS, type TierNumber } from "../config/tiers";

type Props = {
  member: TeamMember;
  onSave: (wallet: string, role: string, tier: number, displayName: string | null) => Promise<void>;
  onClose: () => void;
};

export function EditMemberModal({ member, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(member.displayName || "");
  const [tier, setTier] = useState<TierNumber>(member.tier);
  const [role, setRole] = useState(member.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      await onSave(
        member.wallet,
        role.trim() || TIERS[tier].label,
        tier,
        displayName.trim() || null
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Member</h3>
        <p className="member-wallet" style={{ marginBottom: 16 }}>{member.wallet}</p>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Tier</label>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value) as TierNumber)}>
            {([1, 2, 3, 4, 5] as TierNumber[]).map((t) => (
              <option key={t} value={t}>
                T{t} — {TIERS[t].label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Role Title</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        {error && <div className="error-bar" style={{ marginTop: 12 }}>{error}</div>}

        <div className="modal-buttons">
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Signing..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
