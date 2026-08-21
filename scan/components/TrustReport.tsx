"use client";

import type { TrustReport as Report } from "@/lib/scan";
import FridgeBadge from "./FridgeBadge";
import SecurityGrid from "./SecurityGrid";
import BoostSubscribe from "./BoostSubscribe";
import TokenLogo from "./TokenLogo";

function ageLabel(seconds: number | null) {
  if (seconds == null) return "Unknown age";
  const h = Math.floor(seconds / 3600);
  if (h < 24) return `Launched ${h}h ago`;
  return `Launched ${Math.floor(h / 24)}d ago`;
}

function money(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  return `$${n.toPrecision(4)}`;
}

const PLATFORM = {
  "pump.fun": "🚀 pump.fun",
  stonkfun: "📈 stonkfun",
  custom: "⚙️ Custom",
};

export default function TrustReportView({ report }: { report: Report }) {
  return (
    <div className="grid gap-4">
      <section className="ice-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TokenLogo src={report.identity.image} symbol={report.identity.symbol} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ice">{PLATFORM[report.identity.platform]}</p>
            <h2 className="truncate text-2xl font-bold">
              {report.identity.name}{" "}
              <span className="text-mute">${report.identity.symbol}</span>
            </h2>
            <CopyMint mint={report.mint} />
            <p className="mt-1 text-xs text-mute">{ageLabel(report.identity.ageSeconds)}</p>
          </div>
          {report.fridge.status !== "fridged" && (
            <a className="fridge-key fridge-key-primary" href={report.links.fridge}>
              Fridge it
            </a>
          )}
        </div>
        {report.identity.description && (
          <p className="mt-4 text-sm text-mute">{report.identity.description}</p>
        )}
      </section>

      <FridgeBadge
        fridge={report.fridge}
        decimals={report.identity.decimals}
        mint={report.mint}
        supply={report.market.supply}
      />

      {report.fridge.status === "fridged" ? (
        <BoostSubscribe fixedMint={report.mint} />
      ) : (
        <section className="ice-card p-5">
          <p className="text-[10px] font-bold tracking-[0.2em] text-ice">GET FEATURED</p>
          <h3 className="mt-1 text-xl font-bold">Three fridge slots — lock first</h3>
          <p className="mt-2 text-sm text-mute">
            24h · 0.1 SOL · 48h · 0.18 SOL · 7d · 0.5 SOL. Only tokens with a live Fridge lock can
            boost. You pay SOL; the program buys $PASTA and burns it. The listing lasts the whole
            package.
          </p>
          <div className="mt-4 grid gap-3 opacity-70 sm:grid-cols-3">
            <div className="fridge-plan fridge-plan-24h pointer-events-none">
              <span className="fridge-plan-kicker">Featured slot</span>
              <span className="fridge-plan-label">24h Boost</span>
              <span className="fridge-plan-price">0.1 SOL</span>
              <span className="fridge-plan-go">Fridge required</span>
            </div>
            <div className="fridge-plan fridge-plan-48h pointer-events-none">
              <span className="fridge-plan-kicker">Featured slot</span>
              <span className="fridge-plan-label">48h Boost</span>
              <span className="fridge-plan-price">0.18 SOL</span>
              <span className="fridge-plan-go">Fridge required</span>
            </div>
            <div className="fridge-plan fridge-plan-7d pointer-events-none">
              <span className="fridge-plan-kicker">Featured slot</span>
              <span className="fridge-plan-label">7d Boost</span>
              <span className="fridge-plan-price">0.5 SOL</span>
              <span className="fridge-plan-go">Fridge required</span>
            </div>
          </div>
          <a className="fridge-key fridge-key-primary mt-4" href={report.links.fridge}>
            Fridge it on devfridge.cool
          </a>
        </section>
      )}

      <section className="ice-card p-5">
        <h3 className="mb-3 text-sm font-bold tracking-[0.16em] text-ice">MARKET</h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Price" value={money(report.market.priceUsd)} />
          <Stat label="Market cap" value={money(report.market.marketCap)} />
          <Stat label="24h volume" value={money(report.market.volume24h)} />
          <Stat
            label="Supply"
            value={
              report.market.supply
                ? (Number(report.market.supply) / 10 ** report.identity.decimals).toLocaleString()
                : "—"
            }
          />
          <Stat label="Holders" value={report.market.holders?.toLocaleString() ?? "—"} />
          <Stat label="Program" value={report.identity.tokenProgram} />
        </div>
        {report.market.note && <p className="mt-3 text-sm text-caution">{report.market.note}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a className="fridge-chip" href={report.links.jupiter} target="_blank" rel="noreferrer">
            Jupiter
          </a>
          <a className="fridge-chip" href={report.links.birdeye} target="_blank" rel="noreferrer">
            Birdeye
          </a>
          <a className="fridge-chip" href={report.links.dexscreener} target="_blank" rel="noreferrer">
            DexScreener
          </a>
          <a className="fridge-chip" href={report.links.solscan} target="_blank" rel="noreferrer">
            Solscan
          </a>
        </div>
      </section>

      <SecurityGrid checks={report.security} />

      {report.warnings.length > 0 && (
        <p className="text-xs text-caution">{report.warnings.join(" · ")}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-navy/50 p-3">
      <p className="text-[10px] tracking-widest text-mute">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function CopyMint({ mint }: { mint: string }) {
  return (
    <button
      type="button"
      className="mt-1 truncate font-mono text-xs text-mute hover:text-ice"
      onClick={() => void navigator.clipboard.writeText(mint)}
    >
      {mint.slice(0, 6)}…{mint.slice(-6)} · copy
    </button>
  );
}
