import { PublicKey } from "@solana/web3.js";

const BASE58_CHUNK = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const INVISIBLE = /[\u200B-\u200D\uFEFF\u00A0\u2060\u180E]/g;

function asMint(value: string): string | null {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    return null;
  }
}

export function parseMint(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(INVISIBLE, "").trim();
  if (!cleaned) return null;
  const exact = asMint(cleaned);
  if (exact) return exact;
  try {
    const href = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned.replace(/^\/\//, "")}`;
    const u = new URL(href);
    for (const key of ["mint", "token", "address", "ca"]) {
      const v = u.searchParams.get(key);
      if (v) {
        const ok = asMint(v.trim());
        if (ok) return ok;
      }
    }
    const parts = u.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const ok = asMint(decodeURIComponent(parts[i]));
      if (ok) return ok;
    }
  } catch {
    /* not a url */
  }
  const chunks = cleaned.match(BASE58_CHUNK) || [];
  for (const chunk of chunks) {
    const ok = asMint(chunk);
    if (ok) return ok;
  }
  return null;
}

export function shortKey(k: string): string {
  if (k.length < 10) return k;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toPrecision(3)}`;
  return `$${n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export function fmtAmt(raw: string, decimals = 6): string {
  try {
    const n = Number(BigInt(raw)) / 10 ** decimals;
    if (!Number.isFinite(n)) return raw;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return raw;
  }
}

export function fmtUnlock(unix: number | null): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function remaining(ms: number): string {
  const left = Math.max(0, ms - Date.now());
  const h = Math.floor(left / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  return `${h}h`;
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
