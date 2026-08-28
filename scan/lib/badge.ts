import { SCAN_URL, scanPageUrl } from "./constants";
import { hasOpenVault, type FridgeStatus } from "./fridge";
import { displayTicker, fmtAmount, fmtUnlock, lockedPercent, shortKey, xmlEscape } from "./format";

export type BadgeTheme = "dark" | "light";
export type BadgeStyle = "full" | "compact";

const THEMES = {
  dark: {
    bg: "#0d2137",
    bgWarn: "#1a1000",
    bgExp: "#1a1408",
    bgFail: "#1a1010",
    border: "#4fc3f7",
    borderWarn: "#eab308",
    borderExp: "#94a3b8",
    text: "#e2e8f0",
    mute: "#94a3b8",
    accent: "#4fc3f7",
  },
  light: {
    bg: "#e8f6fc",
    bgWarn: "#fff6e0",
    bgExp: "#f1f5f9",
    bgFail: "#f8ecec",
    border: "#0284c7",
    borderWarn: "#ca8a04",
    borderExp: "#64748b",
    text: "#0f172a",
    mute: "#475569",
    accent: "#0369a1",
  },
} as const;

function compactChip(
  label: string,
  bg: string,
  border: string,
  text: string,
  href?: string
): { svg: string; width: number; height: number } {
  const width = Math.max(168, Math.min(320, Math.round(28 + label.length * 7.6)));
  const inner = `<rect x="0.5" y="0.5" width="${width - 1}" height="31" rx="6" fill="${bg}" stroke="${border}"/>
    <text x="${width / 2}" y="21" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="700" fill="${text}">${xmlEscape(label)}</text>`;
  const body = href
    ? `<a href="${xmlEscape(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : inner;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="32" viewBox="0 0 ${width} 32" role="img">
  ${body}
</svg>`;
  return { svg, width, height: 32 };
}

export function renderBadgeSvg(
  fridge: FridgeStatus,
  opts: {
    theme?: BadgeTheme;
    style?: BadgeStyle;
    decimals?: number;
    supply?: string | null;
    ticker?: string | null;
    mint?: string | null;
  } = {}
): { svg: string; width: number; height: number } {
  const theme = opts.theme === "light" ? "light" : "dark";
  const style = opts.style === "compact" ? "compact" : "full";
  const t = THEMES[theme];
  const decimals = opts.decimals ?? 6;
  const ticker = displayTicker(opts.ticker);
  const href = opts.mint ? scanPageUrl(opts.mint) : undefined;
  const open = href
    ? `<a href="${xmlEscape(href)}" target="_blank" rel="noopener noreferrer">`
    : "";
  const close = href ? "</a>" : "";
  const scanHint = opts.mint
    ? `Live scan → scan.devfridge.cool/t/${shortKey(opts.mint)}`
    : "Live scan → scan.devfridge.cool";

  if (fridge.status === "unavailable") {
    if (style === "compact") {
      return compactChip("⚠️ UNAVAILABLE", t.bgFail, t.borderWarn, t.text, href);
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="420" height="60" viewBox="0 0 420 60" role="img">
  ${open}
    <rect x="0.5" y="0.5" width="419" height="59" rx="8" fill="${t.bgFail}" stroke="${t.borderWarn}"/>
    <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.borderWarn}">⚠️ Badge temporarily unavailable</text>
    <text x="16" y="46" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">${xmlEscape(SCAN_URL.replace("https://", ""))}</text>
  ${close}
</svg>`;
    return { svg, width: 420, height: 60 };
  }

  if (hasOpenVault(fridge)) {
    const now = Math.floor(Date.now() / 1000);
    const live = fridge.locks.filter((l) => l.unlockAt > now);
    const liveAmount = live.length
      ? live.reduce((s, l) => s + BigInt(l.amount), 0n).toString()
      : "0";
    const locked = fmtAmount(live.length ? liveAmount : fridge.activeAmount, decimals);
    const pct = live.length ? lockedPercent(liveAmount, opts.supply) : null;
    const unlock = live.length
      ? fmtUnlock(Math.max(...live.map((l) => l.unlockAt)))
      : "until claimed";
    if (style === "compact") {
      const label = ticker
        ? pct
          ? `🧊 ${ticker} ${pct}`
          : `🧊 ${ticker} FRIDGED`
        : pct
          ? `🧊 ${pct} FRIDGED`
          : "🧊 FRIDGED";
      return compactChip(label, t.bg, t.border, t.text, href);
    }
    const title = ticker
      ? `🧊 ${ticker} · FRIDGED · VERIFIED ONCHAIN`
      : "🧊 FRIDGED · VERIFIED ONCHAIN";
    const stats = pct
      ? `Locked: ${xmlEscape(locked)} · ${xmlEscape(pct)} of supply`
      : `Locked: ${xmlEscape(locked)}`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="420" height="90" viewBox="0 0 420 90" role="img" aria-label="${xmlEscape(title)}">
  ${open}
    <rect x="0.5" y="0.5" width="419" height="89" rx="8" fill="${t.bg}" stroke="${t.border}"/>
    <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.accent}">${xmlEscape(title)}</text>
    <text x="16" y="54" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="${t.text}">${stats}</text>
    <text x="16" y="74" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">${xmlEscape(scanHint)}</text>
  ${close}
</svg>`;
    return { svg, width: 420, height: 90 };
  }

  if (style === "compact") {
    const label = ticker ? `⚠️ ${ticker} OPEN` : "⚠️ NOT FRIDGED";
    return compactChip(label, t.bgWarn, t.borderWarn, t.text, href);
  }

  const title = ticker ? `⚠️ ${ticker} · NOT FRIDGED` : "⚠️ NOT FRIDGED · Lock on devfridge.cool";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="420" height="60" viewBox="0 0 420 60" role="img">
  ${open}
    <rect x="0.5" y="0.5" width="419" height="59" rx="8" fill="${t.bgWarn}" stroke="${t.borderWarn}"/>
    <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.borderWarn}">${xmlEscape(title)}</text>
    <text x="16" y="46" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">${xmlEscape(scanHint)}</text>
  ${close}
</svg>`;
  return { svg, width: 420, height: 60 };
}

export function fallbackBadgeSvg(): string {
  return renderBadgeSvg(
    {
      status: "unavailable",
      message: "temporarily unavailable",
      locks: [],
      activeAmount: "0",
      unlockAt: null,
      depositor: null,
    },
    { theme: "dark", style: "full" }
  ).svg;
}
