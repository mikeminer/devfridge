import { TIERS, type TierNumber } from "../config/tiers";

export function Footer() {
  const linkStyle = { color: "var(--ice)" };

  return (
    <>
      <div className="info-section">
        <h3>What is team.devfridge.cool?</h3>
        <p>
          The first <strong>on-chain verifiable team page</strong> in crypto. Every team
          member's role is backed by a $PASTA timelock commitment in the{" "}
          <a href="https://devfridge.cool" target="_blank" rel="noopener" style={linkStyle}>
            DevFridge vault
          </a>{" "}
          — publicly verifiable on Solana.
        </p>

        <h3 style={{ marginTop: 28 }}>How Verification Works</h3>
        <ol className="logic-list">
          <li>
            <strong>Role Assignment</strong> — The CEO assigns a role (e.g. "Moderator") to a
            wallet address via the admin panel, signing the action with their Phantom wallet.
          </li>
          <li>
            <strong>Timelock Commitment</strong> — The assigned member must lock a minimum
            amount of $PASTA for a minimum duration in the{" "}
            <a href="https://devfridge.cool" target="_blank" rel="noopener" style={linkStyle}>
              DevFridge vault
            </a>
            . The minimums depend on the role tier.
          </li>
          <li>
            <strong>On-Chain Verification</strong> — This page queries the Solana blockchain
            in real-time via the{" "}
            <a href="https://sdk.devfridge.cool" target="_blank" rel="noopener" style={linkStyle}>
              DevFridge SDK
            </a>{" "}
            to verify each member's lock meets their tier requirements.
          </li>
          <li>
            <strong>Status Display</strong> — Each member card shows a live verification badge:
            <ul style={{ marginTop: 6, paddingLeft: 20 }}>
              <li><strong>Verified</strong> — active lock meets or exceeds tier requirements</li>
              <li><strong>Expired</strong> — lock has expired, member needs to renew</li>
              <li><strong>Insufficient</strong> — lock exists but doesn't meet the tier minimum</li>
              <li><strong>No Lock</strong> — no qualifying $PASTA lock found</li>
            </ul>
          </li>
        </ol>

        <h3 style={{ marginTop: 28 }}>Role Tiers</h3>
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
            {([1, 2, 3, 4, 5] as TierNumber[]).map((t) => (
              <tr key={t}>
                <td style={{ color: TIERS[t].color }}>{t}</td>
                <td>{TIERS[t].label}</td>
                <td>{TIERS[t].minAmountDisplay}</td>
                <td>{TIERS[t].minDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: 28 }}>Role Management</h3>
        <ul className="logic-list">
          <li><strong>Assign</strong> — CEO connects wallet, adds member wallet + role, signs with Phantom. Member appears on the page.</li>
          <li><strong>Change</strong> — CEO edits the member's tier or role title, signs. Card updates.</li>
          <li><strong>Remove</strong> — CEO clicks remove, signs. Member disappears.</li>
          <li><strong>Auto-expire</strong> — If a member's lock expires, their card automatically shows "Expired" — no manual action needed.</li>
          <li><strong>Renewal</strong> — Members can renew their timelock at{" "}
            <a href="https://devfridge.cool" target="_blank" rel="noopener" style={linkStyle}>devfridge.cool</a>{" "}
            before expiry to maintain verified status.
          </li>
        </ul>

        <h3 style={{ marginTop: 28 }}>Trust Model</h3>
        <ul className="logic-list">
          <li>
            <strong>On-chain (trustless)</strong> — The $PASTA timelock is enforced by the
            Fridge smart contract on Solana. No one can withdraw before the unlock date.
            Anyone can verify the lock exists.
          </li>
          <li>
            <strong>Off-chain (CEO-controlled)</strong> — Role labels (who is "CEO", who is
            "Moderator") are assigned by the admin wallet. The team page shows <em>who the
            CEO trusts</em>, backed by <em>provable financial commitment</em>.
          </li>
        </ul>

        <h3 style={{ marginTop: 28 }}>Verify Yourself</h3>
        <p>Query any team member's lock directly:</p>
        <code className="verify-endpoint">
          GET https://scan.devfridge.cool/api/sdk/check?wallet=WALLET&amp;mint=39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump
        </code>
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
