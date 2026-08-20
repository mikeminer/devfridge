"use client";

import { useEffect, useMemo, useState } from "react";
import { PASTA_MINT } from "@/lib/constants";
import { parseMint } from "@/lib/format";
import type { FridgeStatus } from "@/lib/fridge";
import type { TrustReport } from "@/lib/scan";

type Theme = "dark" | "light";
type Style = "full" | "compact";

function origin(): string {
  if (typeof window === "undefined") return "https://scan.devfridge.cool";
  return window.location.origin;
}

export default function BadgeGenerator({ initialMint = "" }: { initialMint?: string }) {
  const [mint, setMint] = useState(initialMint);
  const [theme, setTheme] = useState<Theme>("dark");
  const [style, setStyle] = useState<Style>("full");
  const [tab, setTab] = useState<"html" | "ai">("html");
  const [copied, setCopied] = useState("");
  const [fridge, setFridge] = useState<FridgeStatus | null>(null);
  const [scan, setScan] = useState<TrustReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const v = parseMint(initialMint);
    if (v) void preview(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMint]);

  const resolved = parseMint(mint);
  const valid = Boolean(resolved);
  const badgeSrc = resolved
    ? `${origin()}/api/badge?mint=${resolved}&theme=${theme}&style=${style}`
    : "";
  const scannerUrl = resolved ? `${origin()}/t/${resolved}` : "";

  const html = useMemo(() => {
    if (!resolved) return "";
    const w = style === "compact" ? 160 : 420;
    const h = style === "compact" ? 32 : fridge?.status === "fridged" ? 90 : 60;
    return `<!-- DevFridge Verification Badge — devfridge.cool -->
<a href="${scannerUrl}" target="_blank" rel="noopener">
  <img
    src="${origin()}/api/badge?mint=${resolved}&theme=${theme}&style=${style}"
    alt="DevFridge Verification Badge"
    width="${w}"
    height="${h}"
    style="border-radius:8px;"
  />
</a>`;
  }, [valid, resolved, mint, theme, style, scannerUrl, fridge?.status]);

  const prompt = useMemo(() => {
    if (!resolved) return "";
    return `I want to add a DevFridge verification badge to my token website.

Token mint: ${resolved}
Badge URL: ${origin()}/api/badge?mint=${resolved}&theme=${theme}
Scanner link: ${scannerUrl}

The badge is a live SVG image served from the URL above. It shows whether my token's
supply is timelocked in the DevFridge vault on Solana mainnet, updating every 60 seconds.

Please integrate this badge into my [INSERT YOUR STACK: React / Next.js / HTML / Vue /
Webflow / Framer / etc.] website. Add it to [INSERT WHERE: the hero section / footer /
about page / sidebar]. Make it link to the scanner URL. Keep the existing design consistent.

My current site code is: [PASTE YOUR CODE HERE]`;
  }, [valid, resolved, theme, scannerUrl]);

  async function preview(addr = mint) {
    const v = parseMint(addr);
    if (!v) {
      setError("Invalid Solana address — paste the mint or a pump.fun / Dexscreener link");
      return;
    }
    setMint(v);
    setError("");
    setBusy(true);
    try {
      const [f, s] = await Promise.all([
        fetch(`/api/fridge?mint=${v}`).then((r) => r.json()),
        fetch(`/api/scan?mint=${v}`).then((r) => r.json()),
      ]);
      setFridge(f);
      setScan(s.error ? null : s);
    } catch {
      setError("Could not preview badge");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, which: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      window.setTimeout(() => setCopied(""), 1600);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="ice-card p-5">
        <h2 className="text-lg font-bold">Badge generator</h2>
        <p className="mt-1 text-sm text-mute">
          Embed a live on-chain Fridge badge. Free. No JS. Updates every 60s.
        </p>
        <div className="mt-4 grid gap-3">
          <input
            className="ice-input font-mono text-sm"
            placeholder="Mint, pump.fun link, or Dexscreener URL"
            value={mint}
            onChange={(e) => setMint(e.target.value.trim())}
            onPaste={(e) => {
              const parsed = parseMint(e.clipboardData.getData("text"));
              if (parsed) {
                e.preventDefault();
                setMint(parsed);
                window.setTimeout(() => void preview(parsed), 0);
              }
            }}
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <select
              className="rounded-xl border border-line bg-navy px-3 py-2"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <select
              className="rounded-xl border border-line bg-navy px-3 py-2"
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
            >
              <option value="full">Full</option>
              <option value="compact">Compact</option>
            </select>
            <button
              type="button"
              className="fridge-key fridge-key-primary disabled:opacity-50"
              disabled={busy}
              onClick={() => void preview()}
            >
              {busy ? "Loading…" : "Preview"}
            </button>
            <button
              type="button"
              className="fridge-key"
              onClick={() => {
                setMint(PASTA_MINT);
                void preview(PASTA_MINT);
              }}
            >
              Demo $PASTA
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </section>

      {valid && (
        <section className="ice-card p-5">
          <h3 className="text-sm font-bold tracking-[0.16em] text-ice">LIVE PREVIEW</h3>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-navy p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={badgeSrc}
              src={badgeSrc}
              alt="DevFridge badge preview"
              className="max-w-full"
              style={{ borderRadius: 8 }}
            />
          </div>
          {scan && (
            <ul className="mt-4 grid gap-1 text-sm text-mute">
              <li>Fridge: {scan.fridge.status}</li>
              {scan.security
                .filter((c) => c.id === "mint" || c.id === "freeze")
                .map((c) => (
                  <li key={c.id}>
                    {c.label}: {c.level.toUpperCase()} — {c.detail}
                  </li>
                ))}
              {resolved === PASTA_MINT && (
                <li className="text-caution">
                  ⚠️ Mint/freeze authority being revoked — in progress. Track on devfridge.cool
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {valid && (
        <section className="ice-card p-5">
          <div className="flex gap-2">
            <button
              type="button"
              className={`fridge-tab ${tab === "html" ? "is-on" : ""}`}
              onClick={() => setTab("html")}
            >
              {"</>"} HTML snippet
            </button>
            <button
              type="button"
              className={`fridge-tab ${tab === "ai" ? "is-on" : ""}`}
              onClick={() => setTab("ai")}
            >
              🤖 AI prompt
            </button>
          </div>
          {tab === "html" ? (
            <>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-navy p-4 text-xs text-ink">{html}</pre>
              <button
                type="button"
                className="fridge-key mt-3"
                onClick={() => copy(html, "html")}
              >
                {copied === "html" ? "Copied!" : "Copy snippet"}
              </button>
              <p className="mt-3 text-sm text-mute">
                Paste this before {"</body>"} in your site, or add the {"<img>"} tag anywhere in your
                HTML. The badge updates live from the blockchain — no maintenance needed.
              </p>
            </>
          ) : (
            <>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-navy p-4 text-xs text-ink">
                {prompt}
              </pre>
              <button
                type="button"
                className="fridge-key mt-3"
                onClick={() => copy(prompt, "ai")}
              >
                {copied === "ai" ? "Copied!" : "Copy AI prompt"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
