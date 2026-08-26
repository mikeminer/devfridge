import { useState } from "react";
import type { TeamMember, Socials } from "../lib/api";
import { TIERS, type TierNumber } from "../config/tiers";

const SOCIAL_FIELDS: { key: keyof Socials; label: string; placeholder: string }[] = [
  { key: "x", label: "X (Twitter)", placeholder: "handle (without @)" },
  { key: "github", label: "GitHub", placeholder: "username" },
  { key: "telegram", label: "Telegram", placeholder: "username" },
  { key: "discord", label: "Discord", placeholder: "username" },
  { key: "farcaster", label: "Farcaster", placeholder: "username" },
  { key: "pumpfun", label: "PumpFun", placeholder: "username" },
];

type Props = {
  member: TeamMember;
  onSave: (wallet: string, role: string, tier: number, displayName: string | null, socials?: Socials | null) => Promise<void>;
  onClose: () => void;
};

export function EditMemberModal({ member, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(member.displayName || "");
  const [tier, setTier] = useState<TierNumber>(member.tier);
  const [role, setRole] = useState(member.role);
  const [socials, setSocials] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (member.socials) {
      for (const { key } of SOCIAL_FIELDS) {
        if (member.socials[key]) init[key] = member.socials[key]!;
      }
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateSocial(key: string, value: string) {
    setSocials((prev) => ({ ...prev, [key]: value }));
  }

  function buildSocials(): Socials | null {
    const result: Socials = {};
    let hasAny = false;
    for (const { key } of SOCIAL_FIELDS) {
      const val = socials[key]?.trim();
      if (val) {
        result[key] = val;
        hasAny = true;
      }
    }
    return hasAny ? result : null;
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      await onSave(
        member.wallet,
        role.trim() || TIERS[tier].label,
        tier,
        displayName.trim() || null,
        buildSocials()
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

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Role Title</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
          <div className="form-group" style={{ marginBottom: 12 }} key={key}>
            <label>{label}</label>
            <input
              type="text"
              value={socials[key] || ""}
              onChange={(e) => updateSocial(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}

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
