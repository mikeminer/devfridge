import { useState } from "react";
import { TIERS, type TierNumber } from "../config/tiers";

type Props = {
  onSubmit: (wallet: string, role: string, tier: number, displayName: string | null) => Promise<void>;
};

export function AddMemberForm({ onSubmit }: Props) {
  const [wallet, setWallet] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tier, setTier] = useState<TierNumber>(4);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        displayName.trim() || null
      );
      setWallet("");
      setDisplayName("");
      setRole("");
      setTier(4);
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
      <div className="form-group full">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing..." : "Add Member"}
        </button>
      </div>
      {error && <div className="full error-bar">{error}</div>}
    </form>
  );
}
