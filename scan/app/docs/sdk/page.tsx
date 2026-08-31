import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

const sdkDescription =
  "Gate access to your site with on-chain Fridge timelocks via the DevFridge SDK. Users lock tokens to subscribe — longer locks mean fewer renewals.";

export const metadata: Metadata = {
  ...docMeta("sdk"),
  description: sdkDescription,
  applicationName: "DevFridge docs",
  authors: [{ name: "DevFridge", url: "https://devfridge.cool" }],
  category: "technology",
  creator: "DevFridge",
  keywords: [
    "DevFridge SDK",
    "Fridge timelock SDK",
    "on-chain subscription",
    "Solana token gated access",
    "Token-2022 timelock",
  ],
  publisher: "DevFridge",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    ...docMeta("sdk").openGraph,
    description: sdkDescription,
  },
  twitter: {
    ...docMeta("sdk").twitter,
    description: sdkDescription,
  },
};

export default function SdkDoc() {
  return (
    <DocsShell kicker="SDK" title="Gate access with Fridge timelocks">
      <p>
        <a href="https://sdk.devfridge.cool">sdk.devfridge.cool</a> contains
        the complete API reference, code samples, React examples, server-side
        examples, and AI integration prompts.
      </p>
      <p>
        The DevFridge SDK lets a site use on-chain Fridge timelocks as a
        subscription gate instead of recurring payments. A user locks tokens to
        subscribe; longer locks mean fewer renewal transactions.
      </p>
      <p>
        It is for any project that wants gated access without building billing
        infrastructure. Plans can use any token mint, not just{" "}
        <a href="https://pump.fun/coin/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump">
          $PASTA
        </a>
        .
      </p>

      <h2>How it works</h2>
      <ol>
        <li>
          The developer configures plans with <code>minLockDays</code>,{" "}
          <code>renewalThresholdDays</code>, and <code>minLockAmount</code>.
        </li>
        <li>
          The user locks tokens on{" "}
          <a href="https://devfridge.cool">devfridge.cool</a>.
        </li>
        <li>
          The SDK checks qualifying locks through{" "}
          <code>scan.devfridge.cool/api/sdk/check</code>.
        </li>
        <li>
          The response returns <code>active</code>, <code>needsRenewal</code>,
          and <code>daysRemaining</code> so your app can grant access, prompt a
          renewal, or show the gate.
        </li>
      </ol>

      <h2>Quick start</h2>
      <pre>
        <code>{`<script src="https://sdk.devfridge.cool/sdk/devfridge-sdk.js"></script>`}</code>
      </pre>
      <pre>
        <code>{`const fridge = new DevFridgeSDK({
  tokenMint: "YOUR_TOKEN_MINT_ADDRESS",
  plans: {
    pro: {
      minLockDays: 60,
      renewalThresholdDays: 29,
      minLockAmount: 10_000_000_000_000,
    },
  },
});

async function checkSubscription(walletAddress) {
  const status = await fridge.checkSubscription(walletAddress);

  if (status.active && !status.needsRenewal) {
    showContent();
    return;
  }

  if (status.active && status.needsRenewal) {
    showContent();
    showRenewalBanner(status.daysRemaining);
    return;
  }

  showSubscriptionGate();
}`}</code>
      </pre>

      <h2>Related pages</h2>
      <ul>
        <li>
          <a href="https://docs.devfridge.cool/fridge">Fridge lock</a> — the
          on-chain timelock program reused by SDK subscriptions.
        </li>
        <li>
          <a href="https://docs.devfridge.cool/badge">Badge</a> — the same live
          Fridge badge used across the ecosystem.
        </li>
      </ul>
    </DocsShell>
  );
}
