"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TokenLogo from "./TokenLogo";
import { readLocalRecent } from "./RememberScan";

type Card = {
  mint: string;
  name?: string;
  symbol?: string;
  image?: string | null;
  fridged?: boolean;
  tier?: string;
  expiresAt?: number;
  scannedAt?: number;
  signature?: string;
};

export default function Feeds() {
  const [boosted, setBoosted] = useState<Card[]>([]);
  const [recent, setRecent] = useState<Card[]>([]);
  const [tab, setTab] = useState<"boosted" | "recent">("boosted");

  function mergeRecent(server: Card[]): Card[] {
    const local = readLocalRecent() as Card[];
    const map = new Map<string, Card>();
    for (const row of [...server, ...local]) {
      if (!row?.mint) continue;
      const prev = map.get(row.mint);
      if (!prev || (row.scannedAt || 0) > (prev.scannedAt || 0)) map.set(row.mint, row);
    }
    return [...map.values()]
      .sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0))
      .slice(0, 20);
  }

  async function load() {
    const [b, r] = await Promise.all([
      fetch("/api/feed/boosted").then((x) => x.json()),
      fetch("/api/feed/recent").then((x) => x.json()),
    ]);
    setBoosted(b.tokens || []);
    setRecent(mergeRecent((r.tokens || []) as Card[]));
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    const onBoost = () => void load();
    window.addEventListener("devfridge:boosted", onBoost);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("devfridge:boosted", onBoost);
    };
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`fridge-tab ${tab === "boosted" ? "is-on" : ""}`}
          onClick={() => setTab("boosted")}
        >
          Boosted
        </button>
        <button
          type="button"
          className={`fridge-tab ${tab === "recent" ? "is-on" : ""}`}
          onClick={() => setTab("recent")}
        >
          Recent scans
        </button>
      </div>
      {tab === "boosted" ? (
      <section>
        {boosted.length === 0 ? (
          <p className="text-sm text-mute">No active boosts. Be the first — scan a mint and boost it.</p>
        ) : (
          <div className="grid gap-2">
            {boosted.map((t) => (
              <TokenCard key={t.signature || t.mint} token={t} boosted />
            ))}
          </div>
        )}
      </section>
      ) : (
      <section>
        {recent.length === 0 ? (
          <p className="text-sm text-mute">No scans yet.</p>
        ) : (
          <div className="grid gap-2">
            {recent.map((t) => (
              <TokenCard key={t.mint + String(t.scannedAt)} token={t} />
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function leftLabel(expiresAt?: number) {
  if (!expiresAt) return "";
  const ms = Math.max(0, expiresAt - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d >= 1) return `${d}d ${h}h left`;
  const hours = Math.max(1, Math.ceil(ms / 3600000));
  return `${hours}h left`;
}

function TokenCard({ token, boosted }: { token: Card; boosted?: boolean }) {
  return (
    <Link href={`/t/${token.mint}`} className="ice-card flex items-center gap-3 p-3 hover:border-ice">
      <TokenLogo src={token.image} symbol={token.symbol || "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {token.name} <span className="text-mute">${token.symbol}</span>
        </p>
        <p className="text-xs text-mute">
          {token.fridged ? "🧊 Fridged" : "Not fridged"}
          {boosted && token.tier ? ` · ${token.tier} boost` : ""}
          {boosted && token.expiresAt ? ` · ${leftLabel(token.expiresAt)}` : ""}
        </p>
      </div>
      {boosted && <span className="text-xs text-ice">🔥 Boosted</span>}
    </Link>
  );
}
