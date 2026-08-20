"use client";

import { useEffect, useState } from "react";
import type { CheckStatus, HealthCheck, HealthReport } from "@/lib/health";

const HEADLINE: Record<CheckStatus, { kicker: string; title: string }> = {
  ok: { kicker: "COLD ROOM", title: "All systems frozen" },
  degraded: { kicker: "SOFT THAW", title: "Some feeds are warm" },
  error: { kicker: "DOOR OPEN", title: "Fridge needs attention" },
};

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function HealthBoard() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as HealthReport;
      setReport(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const status: CheckStatus = report?.status ?? (error ? "error" : "ok");
  const head = HEADLINE[status];

  return (
    <div className="grid gap-5">
      <section className="ice-card p-6">
        <p className="text-[10px] font-bold tracking-[0.22em] text-ice">{head.kicker}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{head.title}</h1>
        <p className="mt-2 text-sm text-mute">
          Live probes for Fridge, scanner, Solana RPC, and $PASTA. JSON at{" "}
          <a className="text-ice hover:underline" href="/api/health">
            /api/health
          </a>
          .
        </p>
        <p className="mt-3 text-xs text-mute">
          {report ? `Updated ${ago(report.ts)}` : "Reading gauges…"}
          {error ? ` · ${error}` : ""}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {(report?.checks ?? placeholders()).map((check) => (
          <CheckCard key={check.id} check={check} loading={!report} />
        ))}
      </div>
    </div>
  );
}

function placeholders(): HealthCheck[] {
  return ["rpc", "program", "fridge", "pasta", "site", "scan", "store"].map((id) => ({
    id,
    label: "…",
    status: "ok",
    ms: 0,
    detail: "probing",
  }));
}

function CheckCard({ check, loading }: { check: HealthCheck; loading?: boolean }) {
  const led =
    check.status === "ok" ? "bg-ice shadow-[0_0_10px_#4fc3f7]" : check.status === "degraded" ? "bg-caution" : "bg-danger";
  return (
    <article className={`fridge-plan health-gauge ${loading ? "opacity-60" : ""}`}>
      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${led}`} />
      <span className="fridge-plan-kicker">{check.status}</span>
      <span className="fridge-plan-label">{check.label}</span>
      <span className="mt-auto pb-2 text-sm text-mute">{check.detail}</span>
      <span className="fridge-plan-go">{check.ms ? `${check.ms} ms` : "live"}</span>
    </article>
  );
}
