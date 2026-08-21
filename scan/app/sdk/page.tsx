import type { Metadata } from "next";
import SdkShell from "@/components/SdkShell";
import { sdkMeta, SDK_ORIGIN } from "@/lib/sdk";

export const metadata: Metadata = sdkMeta("");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "DevFridge SDK — subscription gating via on-chain timelocks",
  description:
    "Integrate Fridge timelocks as subscription gates. Users lock Token-2022 supply to access your service.",
  url: SDK_ORIGIN,
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  inLanguage: "en",
  publisher: { "@type": "Organization", name: "DevFridge", url: "https://devfridge.cool" },
};

export default function SdkHome() {
  return (
    <SdkShell kicker="SDK" title="Subscription gating via on-chain timelocks">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Overview ── */}
      <p>
        The DevFridge SDK lets any site gate access behind a{" "}
        <a href="https://docs.devfridge.cool/fridge">Fridge timelock</a>. Instead of recurring
        payments, users lock your project&rsquo;s token on{" "}
        <a href="https://devfridge.cool">devfridge.cool</a>. As long as the lock is active and
        above the renewal threshold, the subscription is valid.
      </p>
      <p>
        When remaining days drop below the threshold (e.g. 29 days for a monthly plan), the user
        must create a <strong>new</strong> lock. Longer locks = fewer renewals, incentivizing
        long-term commitment and reducing sell pressure.
      </p>

      {/* ── How it works ── */}
      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Developer</strong> configures plans with{" "}
          <code>minLockDays</code> and <code>renewalThresholdDays</code>.
        </li>
        <li>
          <strong>User</strong> connects wallet and locks tokens on{" "}
          <a href="https://devfridge.cool">devfridge.cool</a>.
        </li>
        <li>
          <strong>SDK</strong> checks the on-chain lock via{" "}
          <code>scan.devfridge.cool/api/sdk/check</code> and returns subscription status.
        </li>
        <li>
          When <code>daysRemaining &lt;= renewalThresholdDays</code>, the SDK flags{" "}
          <code>needsRenewal: true</code> and provides a renewal URL.
        </li>
        <li>
          Users who lock for longer periods skip multiple renewal cycles entirely.
        </li>
      </ol>

      <h3>Example: monthly plan</h3>
      <table>
        <thead>
          <tr>
            <th>Config</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>minLockDays</code></td>
            <td>60</td>
          </tr>
          <tr>
            <td><code>renewalThresholdDays</code></td>
            <td>29</td>
          </tr>
          <tr>
            <td>Active subscription window</td>
            <td>Day 60 &rarr; Day 30 (31 days of access)</td>
          </tr>
          <tr>
            <td>Renewal triggered at</td>
            <td>&le; 29 days remaining</td>
          </tr>
          <tr>
            <td>User locks for 180 days?</td>
            <td>Active for 151 days before renewal prompt</td>
          </tr>
        </tbody>
      </table>

      {/* ── Quick start ── */}
      <h2>Quick start</h2>
      <h3>1. Add the script</h3>
      <pre>
        <code>{`<script src="https://sdk.devfridge.cool/sdk/devfridge-sdk.js"></script>`}</code>
      </pre>
      <p>Or install via npm / import:</p>
      <pre>
        <code>{`// ESM import from your bundle
import { DevFridgeSDK } from "https://sdk.devfridge.cool/sdk/devfridge-sdk.js";`}</code>
      </pre>

      <h3>2. Configure plans</h3>
      <pre>
        <code>{`const fridge = new DevFridgeSDK({
  tokenMint: "YOUR_TOKEN_MINT_ADDRESS",
  plans: {
    weekly:  { minLockDays: 14, renewalThresholdDays: 7 },
    monthly: { minLockDays: 60, renewalThresholdDays: 29 },
  }
});`}</code>
      </pre>

      <h3>3. Check subscription</h3>
      <pre>
        <code>{`const status = await fridge.checkSubscription(walletAddress);

if (status.active && !status.needsRenewal) {
  // Full access
  showContent();
} else if (status.active && status.needsRenewal) {
  // Access granted but prompt renewal
  showContent();
  showRenewalBanner(status.renewalUrl);
} else {
  // No active lock — gate access
  showPaywall(fridge.getLockUrl(60));
}`}</code>
      </pre>

      {/* ── Configuration ── */}
      <h2>Configuration</h2>
      <pre>
        <code>{`new DevFridgeSDK({
  // Required
  tokenMint: string,       // Your token's SPL mint address
  plans: {                 // At least one plan
    [name: string]: {
      minLockDays: number,          // Minimum lock duration to qualify
      renewalThresholdDays: number, // When to flag needsRenewal
    }
  },

  // Optional
  scannerUrl: string,  // Default: "https://scan.devfridge.cool"
  fridgeUrl: string,   // Default: "https://devfridge.cool"
  cacheTTL: number,    // Response cache in ms (default: 60000)
})`}</code>
      </pre>

      <h3>Plan guidelines</h3>
      <table>
        <thead>
          <tr>
            <th>Plan type</th>
            <th>Suggested <code>minLockDays</code></th>
            <th>Suggested <code>renewalThresholdDays</code></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Weekly</td>
            <td>14</td>
            <td>7</td>
          </tr>
          <tr>
            <td>Monthly</td>
            <td>60</td>
            <td>29</td>
          </tr>
          <tr>
            <td>Quarterly</td>
            <td>120</td>
            <td>29</td>
          </tr>
          <tr>
            <td>Annual</td>
            <td>400</td>
            <td>29</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>renewalThresholdDays</code> must be strictly less than{" "}
        <code>minLockDays</code>. The values are fully customizable &mdash; the table above is a
        starting point.
      </p>

      {/* ── API Reference ── */}
      <h2>API reference</h2>

      <h3>
        <code>checkSubscription(walletAddress)</code>
      </h3>
      <p>Returns a Promise resolving to:</p>
      <pre>
        <code>{`{
  active: boolean,          // true if lock exists and daysRemaining > 0
  plan: string | null,      // Matched plan name or null
  daysRemaining: number,    // Days until best lock expires
  needsRenewal: boolean,    // true when daysRemaining <= threshold
  renewalUrl: string | null,// URL to devfridge.cool (when renewal needed)
  wallet: string,           // The checked wallet
  locks: Lock[],            // All locks (active + expired)
  activeLocks: Lock[],      // Only active locks
  bestLock: Lock | null,    // Lock with furthest unlockAt
}`}</code>
      </pre>

      <h3>
        <code>getLockUrl(days?)</code>
      </h3>
      <p>
        Returns a URL to <code>devfridge.cool</code> pre-filled with the token mint. Pass{" "}
        <code>days</code> to suggest a lock duration.
      </p>

      <h3>
        <code>getScanUrl()</code>
      </h3>
      <p>
        Returns the scan page URL:{" "}
        <code>scan.devfridge.cool/t/&lt;mint&gt;</code>
      </p>

      <h3>
        <code>getBadgeUrl(opts?)</code>
      </h3>
      <p>
        Returns the badge image URL. Options: <code>theme</code> (<code>&quot;dark&quot;</code> |{" "}
        <code>&quot;light&quot;</code>), <code>style</code> (<code>&quot;full&quot;</code> |{" "}
        <code>&quot;compact&quot;</code>).
      </p>

      <h3>
        <code>getBadgeHtml(opts?)</code>
      </h3>
      <p>
        Returns an <code>&lt;a&gt;&lt;img&gt;</code> HTML string linking to the scan page with a
        live badge image. Embed directly into your page.
      </p>

      <h3>
        <code>startPolling(walletAddress, callback, intervalMs?)</code>
      </h3>
      <p>
        Polls subscription status every <code>intervalMs</code> (default 60s). Calls{" "}
        <code>callback(status)</code> only when the status changes. Returns a <code>stop()</code>{" "}
        function.
      </p>

      {/* ── REST API ── */}
      <h2>REST API</h2>
      <p>
        The SDK calls this endpoint. You can also call it directly for server-side checks.
      </p>
      <pre>
        <code>{`GET https://scan.devfridge.cool/api/sdk/check?wallet=<WALLET>&mint=<MINT>`}</code>
      </pre>
      <p>Response:</p>
      <pre>
        <code>{`{
  "wallet": "...",
  "mint": "...",
  "locks": [...],           // All locks for this wallet+mint
  "activeLocks": [...],     // Only locks with unlockAt > now
  "bestLock": { ... },      // Lock with furthest unlockAt
  "daysRemaining": 45,      // Days until bestLock expires
  "ts": 1724234567          // Server unix timestamp
}`}</code>
      </pre>
      <p>
        CORS is enabled (<code>access-control-allow-origin: *</code>). Rate limit: 100
        requests/minute per IP.
      </p>

      {/* ── Badge integration ── */}
      <h2>Badge integration</h2>
      <p>
        Show real-time lock status on your site with the{" "}
        <a href="https://docs.devfridge.cool/badge">Fridge badge</a>:
      </p>
      <pre>
        <code>{`// Get embeddable HTML
const html = fridge.getBadgeHtml({ theme: "dark", style: "compact" });
document.getElementById("badge-container").innerHTML = html;

// Or use the URL directly
const url = fridge.getBadgeUrl({ theme: "light", style: "full" });
// → https://scan.devfridge.cool/api/badge?mint=...&theme=light&style=full`}</code>
      </pre>
      <p>
        The badge updates automatically (60s cache). It shows <strong>FRIDGED</strong>,{" "}
        <strong>EXPIRED</strong>, or <strong>OPEN</strong> status, the locked amount, and unlock
        time.
      </p>

      {/* ── Examples ── */}
      <h2>Full examples</h2>

      <h3>Vanilla JavaScript</h3>
      <pre>
        <code>{`<!DOCTYPE html>
<html>
<head>
  <script src="https://sdk.devfridge.cool/sdk/devfridge-sdk.js"></script>
</head>
<body>
  <div id="app">Connect wallet to continue</div>
  <div id="badge"></div>

  <script>
    const fridge = new DevFridgeSDK({
      tokenMint: "YOUR_MINT_HERE",
      plans: {
        monthly: { minLockDays: 60, renewalThresholdDays: 29 }
      }
    });

    // Show badge
    document.getElementById("badge").innerHTML =
      fridge.getBadgeHtml({ theme: "dark" });

    async function onWalletConnect(walletAddress) {
      const status = await fridge.checkSubscription(walletAddress);

      if (!status.active) {
        document.getElementById("app").innerHTML =
          '<h2>Lock tokens to subscribe</h2>' +
          '<p>Lock for at least 60 days to get monthly access.</p>' +
          '<a href="' + fridge.getLockUrl(60) + '">Lock on DevFridge</a>';
        return;
      }

      if (status.needsRenewal) {
        document.getElementById("app").innerHTML =
          '<h2>Welcome back!</h2>' +
          '<p>Your ' + status.plan + ' plan has ' +
          status.daysRemaining + ' days left.</p>' +
          '<p>Please <a href="' + status.renewalUrl +
          '">renew your lock</a> to maintain access.</p>' +
          '<div id="content"><!-- premium content --></div>';
        return;
      }

      document.getElementById("app").innerHTML =
        '<h2>Welcome!</h2>' +
        '<p>Plan: ' + status.plan + ' &mdash; ' +
        status.daysRemaining + ' days remaining</p>' +
        '<div id="content"><!-- premium content --></div>';
    }
  </script>
</body>
</html>`}</code>
      </pre>

      <h3>React</h3>
      <pre>
        <code>{`import { useEffect, useState } from "react";
import { DevFridgeSDK } from "https://sdk.devfridge.cool/sdk/devfridge-sdk.js";

const fridge = new DevFridgeSDK({
  tokenMint: "YOUR_MINT_HERE",
  plans: {
    weekly:  { minLockDays: 14, renewalThresholdDays: 7 },
    monthly: { minLockDays: 60, renewalThresholdDays: 29 },
  }
});

function useSubscription(walletAddress) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    const stop = fridge.startPolling(walletAddress, (s) => {
      setStatus(s);
      setLoading(false);
    });
    return stop;
  }, [walletAddress]);

  return { status, loading };
}

function App({ walletAddress }) {
  const { status, loading } = useSubscription(walletAddress);

  if (loading) return <p>Checking subscription...</p>;
  if (!status || !status.active) {
    return (
      <div>
        <h2>Subscribe</h2>
        <p>Lock tokens for at least 60 days to access this site.</p>
        <a href={fridge.getLockUrl(60)}>Lock on DevFridge</a>
        <div dangerouslySetInnerHTML={{
          __html: fridge.getBadgeHtml()
        }} />
      </div>
    );
  }

  return (
    <div>
      {status.needsRenewal && (
        <div className="renewal-banner">
          {status.daysRemaining} days left.
          <a href={status.renewalUrl}>Renew lock</a>
        </div>
      )}
      <h2>Premium content</h2>
      <p>Plan: {status.plan} — {status.daysRemaining} days remaining</p>
      {/* Your gated content here */}
    </div>
  );
}`}</code>
      </pre>

      <h3>Server-side check (Node.js)</h3>
      <pre>
        <code>{`// Server-side subscription verification
async function verifySubscription(wallet, mint, minDays = 60, threshold = 29) {
  const res = await fetch(
    \`https://scan.devfridge.cool/api/sdk/check?wallet=\${wallet}&mint=\${mint}\`
  );
  const data = await res.json();
  if (!data.bestLock || data.daysRemaining <= 0) {
    return { valid: false, reason: "no_active_lock" };
  }
  const totalDays = Math.floor(
    (data.bestLock.unlockAt - data.bestLock.createdAt) / 86400
  );
  if (totalDays < minDays) {
    return { valid: false, reason: "lock_too_short" };
  }
  return {
    valid: true,
    daysRemaining: data.daysRemaining,
    needsRenewal: data.daysRemaining <= threshold,
  };
}`}</code>
      </pre>

      {/* ── AI Prompts ── */}
      <h2>AI integration prompts</h2>
      <p>
        Copy-paste these prompts to your AI assistant (Claude, ChatGPT, etc.) to integrate
        DevFridge subscription gating into your project.
      </p>

      <h3>Prompt 1 &mdash; Basic setup</h3>
      <pre>
        <code>{`Integrate DevFridge SDK subscription gating into my site.

SDK script: https://sdk.devfridge.cool/sdk/devfridge-sdk.js
API docs: https://sdk.devfridge.cool

My token mint: [PASTE YOUR MINT HERE]

I want a monthly plan:
- minLockDays: 60 (user must lock for at least 60 days)
- renewalThresholdDays: 29 (prompt renewal at 29 days remaining)

Steps:
1. Add the SDK script tag to my HTML
2. After wallet connect, call fridge.checkSubscription(walletAddress)
3. If status.active && !status.needsRenewal → show content
4. If status.active && status.needsRenewal → show content + renewal banner with status.renewalUrl
5. If !status.active → show paywall with link to fridge.getLockUrl(60)
6. Add the Fridge badge with fridge.getBadgeHtml() so users can see lock status`}</code>
      </pre>

      <h3>Prompt 2 &mdash; React integration</h3>
      <pre>
        <code>{`Add DevFridge subscription gating to my React app.

SDK: https://sdk.devfridge.cool/sdk/devfridge-sdk.js
Token mint: [PASTE YOUR MINT HERE]

Create a useSubscription(walletAddress) hook that:
1. Instantiates DevFridgeSDK with my token mint and plans
2. Uses fridge.startPolling() in a useEffect to get real-time status
3. Returns { status, loading }

Create a <SubscriptionGate> component that:
- Shows a loading spinner while checking
- If not subscribed: shows a paywall with a link to fridge.getLockUrl()
- If subscribed but needs renewal: shows content + a renewal banner
- If subscribed: shows the children (gated content)
- Always shows the Fridge badge via fridge.getBadgeHtml()

Plans config:
  weekly:  { minLockDays: 14, renewalThresholdDays: 7 }
  monthly: { minLockDays: 60, renewalThresholdDays: 29 }`}</code>
      </pre>

      <h3>Prompt 3 &mdash; Server-side verification</h3>
      <pre>
        <code>{`Add server-side DevFridge subscription verification to my API.

Endpoint to call: GET https://scan.devfridge.cool/api/sdk/check?wallet=WALLET&mint=MINT

For each authenticated request:
1. Get the user's wallet address from their session
2. Call the SDK check endpoint with their wallet and my token mint: [PASTE MINT]
3. Verify: daysRemaining > 0 AND original lock duration >= 60 days
4. If valid, proceed with the request
5. If not valid, return 403 with a message to lock tokens

The original lock duration = (bestLock.unlockAt - bestLock.createdAt) / 86400

Cache the result for 5 minutes per wallet to avoid excessive API calls.
Never trust client-side subscription checks alone for sensitive operations.`}</code>
      </pre>

      <h3>Prompt 4 &mdash; Custom plan configuration</h3>
      <pre>
        <code>{`Configure DevFridge SDK subscription plans for my project.

SDK docs: https://sdk.devfridge.cool
Token mint: [PASTE YOUR MINT HERE]

I want these subscription tiers:
- [DESCRIBE YOUR TIERS, e.g.:
  "Basic: 2 weeks access, Pro: 1 month access, VIP: 3 months access"]

Rules:
- minLockDays = how long the user must lock tokens (should be roughly
  2x the access period so there's always a buffer before renewal)
- renewalThresholdDays = when to prompt for a new lock
  (must be < minLockDays)
- Longer locks mean the user doesn't need to renew as often
- A 180-day lock on a monthly plan (minLockDays: 60) gives ~151 days
  of access before the renewal prompt at 29 days remaining

Set up the DevFridgeSDK with these plans and create the UI to show
which plan the user qualifies for based on their lock duration.`}</code>
      </pre>

      {/* ── Concepts ── */}
      <h2>Key concepts</h2>

      <h3>Why not auto-renew?</h3>
      <p>
        Traditional subscriptions require recurring on-chain transactions or off-chain billing
        infrastructure. With Fridge locks, the user makes <strong>one</strong> lock transaction.
        Longer locks automatically extend access without any renewal. A user who locks for
        180 days on a monthly plan gets ~5 months of uninterrupted access from a single
        transaction.
      </p>

      <h3>Incentive alignment</h3>
      <p>
        Longer locks reduce sell pressure on the token, benefit the community, and give the user
        fewer renewal steps. The 2% claim fee on unlock also buys and burns{" "}
        <a href="https://docs.devfridge.cool/tokenomics">$PASTA</a>, adding deflationary
        pressure.
      </p>

      <h3>Security</h3>
      <p>
        Locks are enforced by the{" "}
        <a href="https://docs.devfridge.cool/program">Fridge on-chain program</a>{" "}
        (<code>9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6</code>). Nobody can withdraw
        before <code>unlock_at</code>, including the depositor. The SDK reads lock state via RPC
        &mdash; there is no centralized database that can be tampered with.
      </p>
      <p>
        For sensitive operations, always verify subscription server-side using the REST API
        rather than trusting client-side checks alone.
      </p>

      <p>
        <a className="fridge-key fridge-key-primary" href="https://devfridge.cool">
          Try locking on DevFridge
        </a>
      </p>
    </SdkShell>
  );
}
