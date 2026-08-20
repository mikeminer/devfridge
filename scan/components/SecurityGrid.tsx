import type { SecurityCheck } from "@/lib/scan";

const ICON = { safe: "✅ SAFE", caution: "⚠️ CAUTION", danger: "❌ DANGER", unknown: "• UNKNOWN" };
const COLOR = {
  safe: "text-safe border-safe/30 bg-safe/5",
  caution: "text-caution border-caution/30 bg-caution/5",
  danger: "text-danger border-danger/30 bg-danger/5",
  unknown: "text-mute border-line bg-navy/40",
};

export default function SecurityGrid({ checks }: { checks: SecurityCheck[] }) {
  return (
    <div className="grid gap-2">
      {checks.map((c) => (
        <div
          key={c.id}
          className={`flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${COLOR[c.level]}`}
        >
          <div>
            <p className="font-semibold text-ink">{c.label}</p>
            <p className="text-sm text-mute">{c.detail}</p>
          </div>
          <span className="shrink-0 text-xs font-bold tracking-widest">{ICON[c.level]}</span>
        </div>
      ))}
    </div>
  );
}
