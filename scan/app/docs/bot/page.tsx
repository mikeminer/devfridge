import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("bot");

export default function BotDoc() {
  return (
    <DocsShell kicker="TELEGRAM BOT" title="@frigopastabot">
      <p>
        <a href="https://bot.devfridge.cool">bot.devfridge.cool</a> is the
        landing page.{" "}
        <a href="https://t.me/frigopastabot">t.me/frigopastabot</a> opens the
        bot directly in Telegram.
      </p>
      <p>
        FrigoPasta is the official DevFridge Telegram bot. It is{" "}
        <strong>completely free</strong> — no premium tiers, no token gates, no
        hidden fees. It works in private chats, groups, and channels.
      </p>

      <h2>Add to your group</h2>
      <ol>
        <li>
          Open{" "}
          <a href="https://t.me/frigopastabot?startgroup=true">
            t.me/frigopastabot?startgroup=true
          </a>{" "}
          — Telegram will ask which group to add it to.
        </li>
        <li>
          Select your group and confirm. The bot does not need admin rights. It
          only reads messages that start with <code>/</code>.
        </li>
        <li>
          Type <code>/help</code> in the group. Every member can now use all
          commands.
        </li>
      </ol>
      <p>
        To use it in a <strong>channel</strong>, add @frigopastabot as a channel
        admin. This enables broadcast alerts for boosts, burns, and $PASTA price
        moves.
      </p>

      <h2>Commands — $PASTA</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><code>/pasta</code></td><td>Live price, market cap, 24h volume, burned supply, holder count.</td></tr>
          <tr><td><code>/burn</code></td><td>Total $PASTA burned and recent burn history (requires Helius for history).</td></tr>
          <tr><td><code>/buy</code></td><td>Direct swap links on Jupiter, DexScreener, and Birdeye.</td></tr>
          <tr><td><code>/holders</code></td><td>Top 10 holder distribution with concentration grade (safe / caution / danger).</td></tr>
          <tr><td><code>/vault</code></td><td>TRUST ME CAPITAL vault on Hyperliquid — leader address, APR, deposit link.</td></tr>
          <tr><td><code>/roadmap</code></td><td>Current ecosystem roadmap.</td></tr>
          <tr><td><code>/about</code></td><td>What is DevFridge and $PASTA — quick explainer.</td></tr>
        </tbody>
      </table>

      <h2>Commands — Fridge and Scanner</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><code>/scan &lt;mint&gt;</code></td><td>Full trust report: authorities, holder concentration, market data, and Fridge lock status. Same data as scan.devfridge.cool.</td></tr>
          <tr><td><code>/fridge &lt;mint&gt;</code></td><td>Quick fridge check — fridged, expired, or not fridged. Shows locked amount and unlock date.</td></tr>
          <tr><td><code>/badge &lt;mint&gt;</code></td><td>Returns an HTML embed snippet for a live Fridge badge. Copy-paste into any website.</td></tr>
          <tr><td><code>/aiprompt &lt;mint&gt;</code></td><td>Copy-paste prompt to integrate the badge using ChatGPT, Claude, Grok, or Cursor.</td></tr>
          <tr><td><code>/recent</code></td><td>Last 10 tokens scanned on the platform.</td></tr>
          <tr><td><code>/boosted</code></td><td>Currently boosted tokens with tier and time remaining.</td></tr>
          <tr><td><code>/boost</code></td><td>Boost tiers and pricing — how to feature a token on the scanner.</td></tr>
          <tr><td><code>/lock</code></td><td>Step-by-step guide to locking tokens in the Fridge.</td></tr>
          <tr><td><code>/register &lt;pda&gt;</code></td><td>Register a Fridge lock PDA for expiry DM alerts. The bot will DM you before the lock expires.</td></tr>
        </tbody>
      </table>

      <h2>How /scan works</h2>
      <p>
        When a user sends <code>/scan</code> followed by a Solana mint address,
        the bot calls the same API that powers scan.devfridge.cool. The response
        includes:
      </p>
      <ul>
        <li><strong>Fridge status</strong> — fridged (with locked amount, unlock date, depositor, PDA), expired, or not fridged.</li>
        <li><strong>Security checks</strong> — mint authority, freeze authority, top holder concentration, and other risk signals with safe / caution / danger grades.</li>
        <li><strong>Market data</strong> — price, market cap, 24h volume, holder count, token age, and platform.</li>
      </ul>
      <p>
        The report is posted inline so the entire group can see it. Two buttons
        link to the full web report and a direct &quot;Fridge it&quot; action.
      </p>
      <p>
        You can also reply to a message containing a mint address and type{" "}
        <code>/scan</code> — the bot extracts the mint from the replied message.
      </p>

      <h2>How /register works</h2>
      <p>
        Token devs who have locked supply in the Fridge can register for expiry
        alerts. Send <code>/register</code> followed by the vault PDA (the
        on-chain lock account address). The bot verifies it on-chain and stores
        your Telegram ID. You will receive DMs as the unlock date approaches.
      </p>
      <p>
        Alerts are sent daily and then hourly in the final 24 hours before
        unlock. This ensures devs never miss a claim window or forget to
        re-lock.
      </p>

      <h2>Language support</h2>
      <p>
        The bot detects Italian and English automatically from the message text
        and Telegram language setting. Status messages, error replies, and
        flavor text adapt to the detected language.
      </p>

      <h2>Rate limiting</h2>
      <p>
        To prevent spam and protect the Solana RPC, each user is limited to one{" "}
        <code>/scan</code> or <code>/fridge</code> call every 10 seconds. Other
        commands have no cooldown. This keeps the bot responsive in large groups.
      </p>

      <h2>Privacy and permissions</h2>
      <ul>
        <li>The bot does <strong>not</strong> need admin rights in groups.</li>
        <li>It only processes messages that start with <code>/</code> — it never reads regular chat.</li>
        <li>No wallet connection is required. The bot is read-only and cannot execute transactions.</li>
        <li>No data is sold or shared. Registered alert PDAs and Telegram IDs are stored locally on the bot server.</li>
      </ul>

      <h2>Pros</h2>
      <ul>
        <li>Instant trust reports without leaving Telegram.</li>
        <li>Same scanner data as scan.devfridge.cool — live on-chain.</li>
        <li>Works in any group, channel, or private chat.</li>
        <li>Bilingual — responds in English and Italian.</li>
        <li>Expiry DM alerts so devs never miss an unlock.</li>
        <li>No sign-up, no wallet connection, no permissions needed.</li>
        <li>Badge and AI prompt generation in one command.</li>
        <li>10-second cooldown prevents spam in public groups.</li>
      </ul>

      <h2>Limitations</h2>
      <ul>
        <li>Token pricing depends on Jupiter and DexScreener — very new tokens may show no price yet.</li>
        <li>Burn history requires Helius RPC — without it only the total burned amount is shown.</li>
        <li>Rate-limited to one scan per 10 seconds per user to protect the RPC.</li>
        <li>Cannot execute on-chain transactions — it is read-only and informational.</li>
        <li>Telegram-only — no Discord or Slack version at this time.</li>
      </ul>

      <h2>Links</h2>
      <ul>
        <li><a href="https://t.me/frigopastabot">t.me/frigopastabot</a> — open the bot</li>
        <li><a href="https://t.me/frigopastabot?startgroup=true">Add to your group</a></li>
        <li><a href="https://bot.devfridge.cool">bot.devfridge.cool</a> — landing page</li>
        <li><a href="https://connect.devfridge.cool">connect.devfridge.cool</a> — all official contacts</li>
      </ul>
    </DocsShell>
  );
}
