"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TokenLogo from "./TokenLogo";

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

  async function load() {
    const [b, r] = await Promise.all([
      fetch("/api/feed/boosted").then((x) => x.json()),
      fetch("/api/feed/recent").then((x) => x.json()),
    ]);
    setBoosted(b.tokens || []);
    setRecent(r.tokens || []);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-sm font-bold tracking-widest ${tab === "boosted" ? "bg-ice text-navy" : "text-mute"}`}
          onClick={() => setTab("boosted")}
        >
          🔥 BOOSTED
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-sm font-bold tracking-widest ${tab === "recent" ? "bg-ice text-navy" : "text-mute"}`}
          onClick={() => setTab("recent")}
        >
          🕐 RECENT SCANS
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

function TokenCard({ token, boosted }: { token: Card; boosted?: boolean }) {
  const left = token.expiresAt ? Math.max(0, token.expiresAt - Date.now()) : 0;
  const hours = Math.ceil(left / 3600000);
  return (
    <Link href={`/t/${token.mint}`} className="ice-card flex items-center gap-3 p-3 hover:border-ice">
      <TokenLogo src={token.image} symbol={token.symbol || "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {token.name} <span className="text-mute">${token.symbol}</span>
        </p>
        <p className="text-xs text-mute">
          {token.fridged ? "🧊 Fridged" : "Not fridged"}
          {boosted && token.expiresAt ? ` · ${hours}h left` : ""}
        </p>
      </div>
      {boosted && <span className="text-xs text-ice">🔥 Boosted</span>}
    </Link>
  );
}
