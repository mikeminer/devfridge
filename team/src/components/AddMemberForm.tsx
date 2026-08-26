import { useState } from "react";
import { TIERS, type TierNumber } from "../config/tiers";
import type { Socials } from "../lib/api";

const SOCIAL_FIELDS: { key: keyof Socials; label: string; placeholder: string }[] = [
  { key: "x", label: "X (Twitter)", placeholder: "handle (without @)" },
  { key: "github", label: "GitHub", placeholder: "username" },
  { key: "telegram", label: "Telegram", placeholder: "username" },
  { key: "discord", label: "Discord", placeholder: "username" },
  { key: "farcaster", label: "Farcaster", placeholder: "username" },
  { key: "pumpfun", label: "PumpFun", placeholder: "username" },
];

type Props = {
  onSubmit: (wallet: string, role: string, tier: number, displayName: string | null, socials?: Socials | null) => Promise<void>;
};

export function AddMemberForm({ onSubmit }: Props) {
  const [wallet, setWallet] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tier, setTier] = useState<TierNumber>(4);
  const [role, setRole] = useState("");
  const [socials, setSocials] = useState<Record<string, string>>({});
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;

    setLoading(true);
    setError("");
    try {
      await onSubmit(
        wallet.trim(),
        role.trim() || TIERS[tier].label,
        tier,
        displayName.trim() || null,
        buildSocials()
      );
      setWallet("");
      setDisplayName("");
      setRole("");
      setTier(4);
      setSocials({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="form-group full">
        <label>Wallet Address</label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Base58 Solana wallet address"
          required
        />
      </div>
      <div className="form-group">
        <label>Display Name (optional)</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. alice"
        />
      </div>
      <div className="form-group">
        <label>Tier</label>
        <select value={tier} onChange={(e) => setTier(Number(e.target.value) as TierNumber)}>
          {([1, 2, 3, 4, 5] as TierNumber[]).map((t) => (
            <option key={t} value={t}>
              T{t} — {TIERS[t].label} ({TIERS[t].minAmountDisplay} / {TIERS[t].minDays}d)
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Custom Role Title (optional)</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder={TIERS[tier].label}
        />
      </div>
      {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
        <div className="form-group" key={key}>
          <label>{label} (optional)</label>
          <input
            type="text"
            value={socials[key] || ""}
            onChange={(e) => updateSocial(key, e.target.value)}
            placeholder={placeholder}
          />
        </div>
      ))}
      <div className="form-group full">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing..." : "Add Member"}
        </button>
      </div>
      {error && <div className="full error-bar">{error}</div>}
    </form>
  );
}
