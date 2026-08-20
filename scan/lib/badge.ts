import type { FridgeStatus } from "./fridge";
import { fmtAmount, fmtUnlock, xmlEscape } from "./format";

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

function compactChip(label: string, bg: string, border: string, text: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" viewBox="0 0 160 32" role="img">
  <rect x="0.5" y="0.5" width="159" height="31" rx="6" fill="${bg}" stroke="${border}"/>
  <text x="80" y="21" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="700" fill="${text}">${xmlEscape(label)}</text>
</svg>`;
}

export function renderBadgeSvg(
  fridge: FridgeStatus,
  opts: { theme?: BadgeTheme; style?: BadgeStyle; decimals?: number } = {}
): { svg: string; width: number; height: number } {
  const theme = opts.theme === "light" ? "light" : "dark";
  const style = opts.style === "compact" ? "compact" : "full";
  const t = THEMES[theme];
  const decimals = opts.decimals ?? 6;

  if (fridge.status === "unavailable") {
    if (style === "compact") {
      return { svg: compactChip("⚠️ UNAVAILABLE", t.bgFail, t.borderWarn, t.text), width: 160, height: 32 };
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60" viewBox="0 0 420 60" role="img">
  <rect x="0.5" y="0.5" width="419" height="59" rx="8" fill="${t.bgFail}" stroke="${t.borderWarn}"/>
  <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.borderWarn}">⚠️ Badge temporarily unavailable</text>
  <text x="16" y="46" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">devfridge.cool</text>
</svg>`;
    return { svg, width: 420, height: 60 };
  }

  if (style === "compact") {
    const label =
      fridge.status === "fridged"
        ? "🧊 FRIDGED"
        : fridge.status === "expired"
          ? "🔓 EXPIRED"
          : "⚠️ NOT FRIDGED";
    const bg = fridge.status === "fridged" ? t.bg : fridge.status === "expired" ? t.bgExp : t.bgWarn;
    const border = fridge.status === "fridged" ? t.border : fridge.status === "expired" ? t.borderExp : t.borderWarn;
    return { svg: compactChip(label, bg, border, t.text), width: 160, height: 32 };
  }

  if (fridge.status === "fridged") {
    const locked = fmtAmount(fridge.activeAmount, decimals);
    const unlock = fmtUnlock(fridge.unlockAt);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="90" viewBox="0 0 420 90" role="img" aria-label="FRIDGED verified onchain">
  <rect x="0.5" y="0.5" width="419" height="89" rx="8" fill="${t.bg}" stroke="${t.border}"/>
  <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.accent}">🧊 FRIDGED · VERIFIED ONCHAIN</text>
  <text x="404" y="28" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="${t.mute}">devfridge.cool</text>
  <text x="16" y="54" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="${t.text}">Locked: ${xmlEscape(locked)} · Unlocks: ${xmlEscape(unlock)}</text>
  <text x="16" y="74" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">Live on-chain timelock · scan.devfridge.cool</text>
</svg>`;
    return { svg, width: 420, height: 90 };
  }

  if (fridge.status === "expired") {
    const unlock = fmtUnlock(fridge.unlockAt);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60" viewBox="0 0 420 60" role="img">
  <rect x="0.5" y="0.5" width="419" height="59" rx="8" fill="${t.bgExp}" stroke="${t.borderExp}"/>
  <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.mute}">🔓 FRIDGE EXPIRED</text>
  <text x="16" y="46" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">Was locked until ${xmlEscape(unlock)} · devfridge.cool</text>
</svg>`;
    return { svg, width: 420, height: 60 };
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60" viewBox="0 0 420 60" role="img">
  <rect x="0.5" y="0.5" width="419" height="59" rx="8" fill="${t.bgWarn}" stroke="${t.borderWarn}"/>
  <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="${t.borderWarn}">⚠️ NOT FRIDGED · Lock on devfridge.cool</text>
  <text x="16" y="46" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${t.mute}">No verifiable on-chain timelock</text>
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
