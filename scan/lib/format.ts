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

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isMintAddress(value: string): boolean {
  return BASE58.test(value.trim());
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
