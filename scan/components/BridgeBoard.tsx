"use client";

import { useMemo, useState } from "react";
import type { BridgeRoute } from "@/lib/bridge";
import { routeReadiness } from "@/lib/bridge";

type Direction = "robinhood-solana" | "solana-robinhood";

const short = (address?: string) =>
  address ? `${address.slice(0, 7)}…${address.slice(-5)}` : "Not configured";

export default function BridgeBoard({ route }: { route: BridgeRoute }) {
  const [direction, setDirection] = useState<Direction>("robinhood-solana");
  const [amount, setAmount] = useState("");
  const readiness = useMemo(() => routeReadiness(route), [route]);
  const from = direction === "robinhood-solana" ? "Robinhood Chain" : "Solana";
  const to = direction === "robinhood-solana" ? "Solana" : "Robinhood Chain";

  return (
    <main className="bridge-shell min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a className="text-[10px] font-bold tracking-[0.24em] text-ice" href="https://devfridge.cool">
              DEVFRIDGE / BRIDGE
            </a>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">Cross the cold chain.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute sm:text-base">
              Canonical token routes secured by LayerZero OFT, bounded flow and explicit on-chain controls.
              No synthetic liquidity pool and no hidden custodian.
            </p>
          </div>
          <span className={`bridge-status ${readiness.ready ? "is-live" : "is-locked"}`}>
            {readiness.ready ? "Route live" : "Mainnet locked"}
          </span>
        </header>

        <div className="mt-9 grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
          <section className="ice-card overflow-hidden p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-ice">CANONICAL ROUTE</p>
                <h2 className="mt-1 text-xl font-bold">{route.name}</h2>
              </div>
              <div className="rounded-full border border-ice/30 bg-ice/10 px-4 py-2 font-mono text-sm text-ice">
                {route.symbol}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <ChainCard label="From" name={from} canonical={from === "Robinhood Chain"} />
              <button
                type="button"
                aria-label="Reverse bridge direction"
                className="bridge-swap"
                onClick={() => setDirection((d) => d === "robinhood-solana" ? "solana-robinhood" : "robinhood-solana")}
              >
                ⇄
              </button>
              <ChainCard label="To" name={to} canonical={to === "Robinhood Chain"} />
            </div>

            <label className="mt-6 block text-xs font-bold uppercase tracking-[0.15em] text-mute" htmlFor="bridge-amount">
              Amount
            </label>
            <div className="bridge-amount mt-2">
              <input
                id="bridge-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              />
              <span>{route.symbol}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-mute">
              <Metric label="Bridge model" value="Lock / mint" />
              <Metric label="Daily capacity" value={route.dailyLimit ? `${route.dailyLimit} ${route.symbol}` : "Pending"} />
            </div>

            <button className="bridge-action mt-6" type="button" disabled={!readiness.ready || !amount}>
              {readiness.ready ? (amount ? `Connect ${from} wallet` : "Enter amount") : "Route not activated"}
            </button>
            {!readiness.ready && (
              <p className="mt-3 text-center text-xs leading-relaxed text-caution">
                Transfers are intentionally disabled until every deployment and safety parameter is verified.
              </p>
            )}
          </section>

          <aside className="grid gap-5">
            <section className="ice-card p-5 sm:p-6">
              <p className="text-[10px] font-bold tracking-[0.2em] text-ice">SAFETY CONSOLE</p>
              <div className="mt-5 grid gap-3">
                <SafetyRow name="Canonical supply" value="Robinhood Chain" state="on" />
                <SafetyRow name="Rate limiter" value={route.dailyLimit ? "Configured" : "Awaiting limit"} state={route.dailyLimit ? "on" : "wait"} />
                <SafetyRow name="Multisig control" value="Required" state="on" />
                <SafetyRow name="Emergency pause" value="Contract level" state="on" />
                <SafetyRow name="LayerZero peers" value={route.solanaOftStore ? "Bound" : "Not bound"} state={route.solanaOftStore ? "on" : "wait"} />
              </div>
            </section>

            <section className="ice-card p-5 sm:p-6">
              <p className="text-[10px] font-bold tracking-[0.2em] text-ice">ROUTE REGISTRY</p>
              <dl className="mt-4 grid gap-4 text-sm">
                <RegistryRow label="Robinhood token" value={short(route.robinhoodToken)} href={`https://explorer.robinhood.com/address/${route.robinhoodToken}`} />
                <RegistryRow label="EVM OFT Adapter" value={short(route.evmAdapter)} />
                <RegistryRow label="Solana mint" value={short(route.solanaMint)} />
                <RegistryRow label="Solana OFT Store" value={short(route.solanaOftStore)} />
              </dl>
              {!readiness.ready && (
                <div className="mt-5 rounded-2xl border border-caution/25 bg-caution/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-caution">Activation checklist</p>
                  <p className="mt-2 text-xs leading-relaxed text-mute">{readiness.missing.join(" · ")}</p>
                </div>
              )}
            </section>
          </aside>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <ProtocolCard number="01" title="Canonical first" text="The original supply stays on its declared home chain. The adapter escrows it before the remote wrapper can be minted." />
          <ProtocolCard number="02" title="Bounded exposure" text="Per-route limits cap how much value can move during each window, reducing the blast radius of an incident." />
          <ProtocolCard number="03" title="Human circuit breaker" text="A multisig controls peer changes and limits, while an emergency pause can stop cross-chain debit and credit." />
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-line py-7 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>Never share a seed phrase. Verify every contract before signing.</span>
          <div className="flex gap-4">
            <a className="text-ice hover:underline" href="https://docs.layerzero.network/v2/developers/solana/oft/overview" target="_blank" rel="noreferrer">LayerZero OFT docs ↗</a>
            <a className="text-ice hover:underline" href="https://connect.devfridge.cool" target="_blank" rel="noreferrer">Official links ↗</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function ChainCard({ label, name, canonical }: { label: string; name: string; canonical: boolean }) {
  return <div className="bridge-chain"><span>{label}</span><strong>{name}</strong><small>{canonical ? "Canonical" : "OFT wrapper"}</small></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-navy/50 p-3"><span>{label}</span><strong className="mt-1 block text-ink">{value}</strong></div>;
}

function SafetyRow({ name, value, state }: { name: string; value: string; state: "on" | "wait" }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-navy/40 px-4 py-3 text-sm"><span className="font-semibold">{name}</span><span className={state === "on" ? "text-safe" : "text-caution"}>{value}</span></div>;
}

function RegistryRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const rendered = <dd className="font-mono text-xs text-ink">{value}</dd>;
  return <div className="flex items-center justify-between gap-4 border-b border-line pb-3"><dt className="text-mute">{label}</dt>{href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-ice">{rendered}</a> : rendered}</div>;
}

function ProtocolCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="ice-card p-5"><span className="font-mono text-xs text-ice">{number}</span><h3 className="mt-3 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-mute">{text}</p></article>;
}
