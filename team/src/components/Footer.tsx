import { TIERS, type TierNumber } from "../config/tiers";

export function Footer() {
  return (
    <>
      <div className="info-section">
        <h3>How It Works</h3>
        <p>
          Every team member's role is backed by a $PASTA timelock in the{" "}
          <a href="https://devfridge.cool" target="_blank" rel="noopener" style={{ color: "var(--ice)" }}>
            DevFridge vault
          </a>
          . Locks are enforced on-chain by the Fridge program on Solana — no withdrawal
          is possible before the unlock date. This page verifies each lock in real-time
          via the{" "}
          <a href="https://sdk.devfridge.cool" target="_blank" rel="noopener" style={{ color: "var(--ice)" }}>
            DevFridge SDK
          </a>
          .
        </p>
        <table className="tier-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Role</th>
              <th>Min $PASTA</th>
              <th>Min Lock</th>
            </tr>
          </thead>
          <tbody>
            {([1, 2, 3, 4] as TierNumber[]).map((t) => (
              <tr key={t}>
                <td style={{ color: TIERS[t].color }}>{t}</td>
                <td>{TIERS[t].label}</td>
                <td>{TIERS[t].minAmountDisplay}</td>
                <td>{TIERS[t].minDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="footer">
        <p>
          <a href="https://devfridge.cool" target="_blank" rel="noopener">DevFridge</a>
          {" · "}
          <a href="https://scan.devfridge.cool" target="_blank" rel="noopener">Scanner</a>
          {" · "}
          <a href="https://sdk.devfridge.cool" target="_blank" rel="noopener">SDK</a>
          {" · "}
          <a href="https://docs.devfridge.cool" target="_blank" rel="noopener">Docs</a>
        </p>
        <p style={{ marginTop: "6px" }}>
          Verified on Solana · Powered by $PASTA timelocks
        </p>
      </footer>
    </>
  );
}
