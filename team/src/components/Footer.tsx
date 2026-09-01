import { TIERS, type TierNumber } from "../config/tiers";

const PRODUCTS = [
  {
    name: "Fridge Vault",
    href: "https://devfridge.cool",
    description: "Lock Token-2022 supply on-chain with a public, non-custodial timelock.",
  },
  {
    name: "Token Scanner",
    href: "https://scan.devfridge.cool",
    description: "Review token trust signals, Fridge locks and live on-chain reports.",
  },
  {
    name: "Fridge Badge",
    href: "https://scan.devfridge.cool/badge",
    description: "Generate an embeddable, live badge that links to a token's public trust report.",
  },
  {
    name: "DevFridge OSINT",
    href: "https://osint.devfridge.cool",
    description: "Scan a Solana token or wallet and discover every related DevFridge timelock.",
  },
  {
    name: "DevFridge Agent",
    href: "https://agent.devfridge.cool",
    description: "Run the paid DexScreener research desk with OSINT vetoes and a non-custodial flow.",
  },
  {
    name: "$PASTA Market",
    href: "https://pasta.devfridge.cool",
    description: "Follow the official $PASTA mint, market links and live DexScreener chart.",
  },
  {
    name: "DevFridge Meme",
    href: "https://meme.devfridge.cool",
    description: "Open the DevFridge meme product and community creative experience.",
  },
  {
    name: "Developer SDK",
    href: "https://sdk.devfridge.cool",
    description: "Integrate DevFridge lock checks, badges and scanner data into other products.",
  },
  {
    name: "Documentation",
    href: "https://docs.devfridge.cool",
    description: "Read the guides for the protocol, scanner, SDK, security model and integrations.",
  },
  {
    name: "DevFridge Connect",
    href: "https://connect.devfridge.cool",
    description: "Find every verified DevFridge contact, community channel and official link.",
  },
  {
    name: "Team Directory",
    href: "https://team.devfridge.cool",
    description: "Review team roles and verify every member's public $PASTA commitment on-chain.",
  },
  {
    name: "FrigoPasta Bot",
    href: "https://bot.devfridge.cool",
    description: "Run token scans and Fridge checks directly from Telegram chats and groups.",
  },
  {
    name: "DevFridge World",
    href: "https://world.devfridge.cool",
    description: "Enter the community game where your on-chain lock determines your team.",
  },
  {
    name: "System Health",
    href: "https://health.devfridge.cool",
    description: "Check the live operational status of the Fridge, Solana RPC and $PASTA services.",
  },
] as const;

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

        <h3 style={{ marginTop: 28 }}>What the DevFridge Team Does</h3>
        <div className="team-value-grid">
          <article className="team-value-card">
            <strong>Build the protocol</strong>
            <p>Maintain the non-custodial Token-2022 timelock vault and its public interfaces.</p>
          </article>
          <article className="team-value-card">
            <strong>Make risk visible</strong>
            <p>Improve the Solana token scanner, methodology, status monitoring and security documentation.</p>
          </article>
          <article className="team-value-card">
            <strong>Ship useful tools</strong>
            <p>Develop the SDK, live badges and Telegram bot used to check locks and token signals.</p>
          </article>
          <article className="team-value-card">
            <strong>Support the community</strong>
            <p>Moderate public channels, explain the product, collect feedback and support integrations.</p>
          </article>
        </div>

        <h3 style={{ marginTop: 28 }}>DevFridge Products</h3>
        <p>Explore the products and public resources built and maintained by the DevFridge team.</p>
        <div className="product-grid">
          {PRODUCTS.map((product) => (
            <a
              className="product-card"
              href={product.href}
              key={product.href}
              target="_blank"
              rel="noopener"
            >
              <span className="product-card-heading">
                <strong>{product.name}</strong>
                <span aria-hidden="true">↗</span>
              </span>
              <span>{product.description}</span>
              <small>{product.href.replace("https://", "")}</small>
            </a>
          ))}
        </div>

        <h3 style={{ marginTop: 28 }}>Why Join</h3>
        <ul className="benefit-list">
          <li>
            <strong>A public, verifiable role.</strong> Your name, wallet, role and chosen social
            profiles appear in the official DevFridge directory.
          </li>
          <li>
            <strong>On-chain proof of commitment.</strong> Your status is checked against a real
            Solana timelock instead of relying on a self-declared title.
          </li>
          <li>
            <strong>Visible contribution surface.</strong> Work across the protocol, scanner, SDK,
            bot, documentation, partnerships or community operations.
          </li>
          <li>
            <strong>Clear role tiers.</strong> Each role has a published minimum commitment and
            duration, with status updating automatically when a lock changes or expires.
          </li>
          <li>
            <strong>Direct access to the builder network.</strong> Collaborate with the people
            maintaining DevFridge and help shape practical tools for Solana communities.
          </li>
        </ul>

        <div className="join-panel">
          <div>
            <strong>Want to contribute?</strong>
            <p>
              Choose an area where you can help, contact the CEO through the official directory,
              and agree on a role. Verification begins only after the role is assigned and the
              required timelock is visible on-chain.
            </p>
          </div>
          <a
            className="btn btn-primary"
            href="https://forms.gle/HSaJ2F5Xy6zRXNcL8"
            target="_blank"
            rel="noopener"
          >
            Apply to the DevFridge Team
          </a>
        </div>
        <p className="membership-note">
          Team membership does not guarantee compensation, token returns or investment outcomes.
          Locked tokens remain unavailable until their unlock date. Review the published security
          information before committing funds.
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
          {" · "}
          <a href="https://connect.devfridge.cool" target="_blank" rel="noopener">Connect</a>
        </p>
        <p style={{ marginTop: "6px" }}>
          Verified on Solana · Powered by $PASTA timelocks
        </p>
      </footer>
    </>
  );
}
