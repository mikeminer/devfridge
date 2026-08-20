import { PublicKey } from "@solana/web3.js";

export function fmtAmount(raw: string, decimals = 6): string {
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
  return (
    new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC"
  );
}

export function remainingLabel(unix: number | null): string {
  if (!unix) return "—";
  const s = unix - Math.floor(Date.now() / 1000);
  if (s <= 0) return "unlocked";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d <= 0) return `${h} hours`;
  return `${d} days ${h} hours`;
}

export function shortKey(k: string): string {
  if (k.length < 8) return k;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

const BASE58_CHUNK = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const INVISIBLE = /[\u200B-\u200D\uFEFF\u00A0\u2060\u180E]/g;

function asMint(value: string): string | null {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    return null;
  }
}

function mintFromUrl(raw: string): string | null {
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/\//, "")}`;
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
    /* not a URL */
  }
  return null;
}

/** Pull a canonical Solana mint out of a CA, pump.fun/Dexscreener URL, or messy paste. */
export function parseMint(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(INVISIBLE, "").trim();
  if (!cleaned) return null;

  const exact = asMint(cleaned);
  if (exact) return exact;

  if (/^https?:\/\//i.test(cleaned) || cleaned.includes("/") || cleaned.includes("?")) {
    const fromUrl = mintFromUrl(cleaned);
    if (fromUrl) return fromUrl;
  }

  const chunks = cleaned.match(BASE58_CHUNK) || [];
  for (const chunk of chunks) {
    const ok = asMint(chunk);
    if (ok) return ok;
  }
  return null;
}

export function isMintAddress(value: string): boolean {
  return parseMint(value) !== null;
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
