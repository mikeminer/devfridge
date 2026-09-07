"use client";

import { useMemo, useState } from "react";
import type { BridgeRoute } from "@/lib/bridge";
import { routeReadiness } from "@/lib/bridge";

type Direction = "robinhood-solana" | "solana-robinhood";
type CopyField = "token" | "governor" | "adapter" | "mint" | "store" | null;

const short = (address?: string) =>
  address ? `${address.slice(0, 7)}…${address.slice(-5)}` : "Not deployed";

const addressUrl = (chain: "robinhood" | "solana", address?: string) => {
  if (!address) return undefined;
  return chain === "robinhood"
    ? `https://explorer.robinhood.com/address/${address}`
    : `https://solscan.io/account/${address}`;
};

const normalizeAmount = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  return decimalParts.length ? `${whole}.${decimalParts.join("").slice(0, 9)}` : whole;
};

export default function BridgeBoard({ route }: { route: BridgeRoute }) {
  const [direction, setDirection] = useState<Direction>("robinhood-solana");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState<CopyField>(null);
  const readiness = useMemo(() => routeReadiness(route), [route]);
  const isForward = direction === "robinhood-solana";
  const from = isForward ? "Robinhood Chain" : "Solana";
  const to = isForward ? "Solana" : "Robinhood Chain";
  const amountNumber = Number(amount);
  const amountIsValid = amount !== "" && Number.isFinite(amountNumber) && amountNumber > 0;
  const actionDisabled = !readiness.ready || !amountIsValid;

  const copyAddress = async (field: Exclude<CopyField, null>, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <main className="bridge-shell min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="bridge-header">
          <div>
            <a className="bridge-brand" href="https://devfridge.cool" aria-label="DevFridge home">
              <span aria-hidden="true">DF</span>
              DEVFRIDGE / BRIDGE
            </a>
            <h1>Move value. Keep the supply honest.</h1>
            <p>
              A canonical LayerZero OFT route between Robinhood Chain and Solana. Every transfer is
              constrained by published peers, rate limits and an emergency circuit breaker.
            </p>
          </div>
          <div className={`bridge-status ${readiness.ready ? "is-live" : "is-locked"}`} role="status">
            <span>{readiness.ready ? "Route live" : "Pre-launch"}</span>
            <small>{readiness.ready ? "Transfers enabled" : `${readiness.missing.length} gates remaining`}</small>
          </div>
        </header>

        <div className="bridge-network-strip" aria-label="Bridge route">
          <span>Robinhood Chain <b>4663</b></span>
          <div aria-hidden="true"><i />LayerZero V2<i /></div>
          <span>Solana <b>Mainnet</b></span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,.88fr)]">
          <section className="ice-card bridge-transfer-card">
            <div className="bridge-card-heading">
              <div>
                <p className="bridge-eyebrow">CANONICAL ROUTE</p>
                <h2>{route.name}</h2>
              </div>
              <div className="bridge-token-pill"><span>{route.symbol}</span>1:1 canonical supply</div>
            </div>

            <div className="bridge-direction">
              <ChainCard label="You send from" name={from} detail={isForward ? "Canonical token" : "OFT representation"} tone={isForward ? "canonical" : "wrapped"} />
              <button
                type="button"
                aria-label={`Reverse direction. Currently ${from} to ${to}`}
                className="bridge-swap"
                onClick={() => setDirection((current) => current === "robinhood-solana" ? "solana-robinhood" : "robinhood-solana")}
              >
                <SwapIcon />
              </button>
              <ChainCard label="You receive on" name={to} detail={isForward ? "OFT representation" : "Canonical token"} tone={isForward ? "wrapped" : "canonical"} />
            </div>

            <div className="bridge-input-heading">
              <label htmlFor="bridge-amount">Amount</label>
              <span>Conversion 1 {route.symbol} = 1 {route.symbol}</span>
            </div>
            <div className={`bridge-amount ${amount && !amountIsValid ? "is-invalid" : ""}`}>
              <input id="bridge-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} aria-invalid={amount !== "" && !amountIsValid} onChange={(event) => setAmount(normalizeAmount(event.target.value))} />
              <span>{route.symbol}</span>
            </div>
            <div className="bridge-receive-row">
              <span>Expected on {to}</span>
              <strong>{amountIsValid ? amount : "0.00"} {route.symbol}</strong>
            </div>

            <div className="bridge-metrics">
              <Metric label="Mechanism" value={isForward ? "Lock → mint" : "Burn → unlock"} />
              <Metric label="Route capacity" value={route.dailyLimit ? `${route.dailyLimit} ${route.symbol} / day` : "Not published"} />
              <Metric label="Protocol" value="LayerZero V2 OFT" />
            </div>

            <button className="bridge-action" type="button" disabled={actionDisabled}>
              {readiness.ready ? amountIsValid ? `Connect ${from} wallet` : "Enter an amount" : "Transfers open after verification"}
            </button>
            <p className={`bridge-action-note ${readiness.ready ? "" : "is-caution"}`}>
              {readiness.ready ? "Network gas and LayerZero messaging fees are quoted before you sign." : "No transaction can be created until all contracts, peers and safety limits are published."}
            </p>
          </section>

          <aside className="grid content-start gap-5">
            <section className="ice-card bridge-safety-card">
              <div className="bridge-card-heading compact">
                <div><p className="bridge-eyebrow">VERIFICATION</p><h2>Safety gates</h2></div>
                <span className="bridge-score">{5 - readiness.missing.length}/5</span>
              </div>
              <div className="bridge-gate-progress" aria-hidden="true"><span style={{ width: `${Math.max(0, 5 - readiness.missing.length) * 20}%` }} /></div>
              <div className="bridge-safety-list">
                <SafetyRow name="EVM OFT Adapter" value={route.evmAdapter ? "Published" : "Pending"} state={route.evmAdapter ? "on" : "wait"} />
                <SafetyRow name="Solana OFT mint" value={route.solanaMint ? "Published" : "Pending"} state={route.solanaMint ? "on" : "wait"} />
                <SafetyRow name="Solana OFT Store" value={route.solanaOftStore ? "Published" : "Pending"} state={route.solanaOftStore ? "on" : "wait"} />
                <SafetyRow name="Daily rate limit" value={route.dailyLimit ? "Published" : "Pending"} state={route.dailyLimit ? "on" : "wait"} />
                <SafetyRow name="Mainnet approval" value={route.enabled ? "Approved" : "Pending"} state={route.enabled ? "on" : "wait"} />
              </div>
              {!readiness.ready && (
                <div className="bridge-gates"><p>Required before activation</p><ul>{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul></div>
              )}
            </section>

            <section className="ice-card bridge-journey-card">
              <p className="bridge-eyebrow">WHAT HAPPENS ON-CHAIN</p>
              <ol>
                <JourneyStep number="1" title="Verify" text="Contracts, chain and destination are shown before connection." />
                <JourneyStep number="2" title={isForward ? "Lock" : "Burn"} text={isForward ? "Canonical TMC enters the adapter escrow." : "The Solana OFT representation is burned."} />
                <JourneyStep number="3" title="Attest" text="Independent DVNs verify the LayerZero message." />
                <JourneyStep number="4" title={isForward ? "Mint" : "Unlock"} text={`${route.symbol} is delivered on ${to}.`} />
              </ol>
            </section>
          </aside>
        </div>

        <section className="ice-card bridge-registry-card">
          <div className="bridge-registry-intro">
            <p className="bridge-eyebrow">PUBLIC ROUTE REGISTRY</p>
            <h2>Trust addresses, not labels.</h2>
            <p>Compare every address here with the wallet prompt before signing. Missing deployment fields remain visibly unavailable.</p>
          </div>
          <dl className="bridge-registry-grid">
            <RegistryRow label="Robinhood token" value={route.robinhoodToken} href={addressUrl("robinhood", route.robinhoodToken)} copied={copied === "token"} onCopy={() => copyAddress("token", route.robinhoodToken)} />
            <RegistryRow label="Robinhood governor" value={route.robinhoodGovernor} href={addressUrl("robinhood", route.robinhoodGovernor)} copied={copied === "governor"} onCopy={() => copyAddress("governor", route.robinhoodGovernor)} />
            <RegistryRow label="EVM OFT Adapter" value={route.evmAdapter} href={addressUrl("robinhood", route.evmAdapter)} copied={copied === "adapter"} onCopy={() => copyAddress("adapter", route.evmAdapter)} />
            <RegistryRow label="Solana OFT mint" value={route.solanaMint} href={addressUrl("solana", route.solanaMint)} copied={copied === "mint"} onCopy={() => copyAddress("mint", route.solanaMint)} />
            <RegistryRow label="Solana OFT Store" value={route.solanaOftStore} href={addressUrl("solana", route.solanaOftStore)} copied={copied === "store"} onCopy={() => copyAddress("store", route.solanaOftStore)} />
            <RegistryRow label="LayerZero endpoint IDs" value="30416 ↔ 30168" />
          </dl>
        </section>

        <section className="bridge-legacy-note">
          <div aria-hidden="true">!</div>
          <p><strong>The legacy Solana token is not bridgeable.</strong> <span className="font-mono">{short(route.solanaLegacyMint)}</span> has revoked mint authority and an independent fixed supply. It must never be used as the OFT mint.</p>
          <a href={addressUrl("solana", route.solanaLegacyMint)} target="_blank" rel="noreferrer">Inspect legacy mint ↗</a>
        </section>

        <footer className="bridge-footer">
          <p>Never share a seed phrase. DevFridge will never ask you to transfer funds for “verification”.</p>
          <nav aria-label="Bridge resources">
            <a href="https://docs.layerzero.network/v2/developers/solana/oft/overview" target="_blank" rel="noreferrer">OFT documentation ↗</a>
            <a href="https://connect.devfridge.cool" target="_blank" rel="noreferrer">Verified DevFridge links ↗</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function SwapIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChainCard({ label, name, detail, tone }: { label: string; name: string; detail: string; tone: "canonical" | "wrapped" }) {
  return <div className={`bridge-chain ${tone}`}><span>{label}</span><strong>{name}</strong><small>{detail}</small></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function SafetyRow({ name, value, state }: { name: string; value: string; state: "on" | "wait" }) {
  return <div><span className={`bridge-gate-icon ${state}`} aria-hidden="true">{state === "on" ? "✓" : "·"}</span><span>{name}</span><strong className={state}>{value}</strong></div>;
}

function JourneyStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <li><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></li>;
}

function RegistryRow({ label, value, href, copied, onCopy }: { label: string; value?: string; href?: string; copied?: boolean; onCopy?: () => void }) {
  return (
    <div className={!value ? "is-missing" : ""}>
      <dt>{label}</dt>
      <dd title={value}>{short(value)}</dd>
      <span className="bridge-registry-actions">
        {value && onCopy && <button type="button" onClick={onCopy} aria-label={`Copy ${label}`}>{copied ? "Copied" : "Copy"}</button>}
        {value && href && <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${label} in explorer`}>↗</a>}
      </span>
    </div>
  );
}
