"use client";

import type { FridgeLock } from "@/lib/fridge";
import { bucketLocks, intensityColor } from "@/lib/heatmap";
import { fmtAmount } from "@/lib/format";

export default function UnlockHeatmap({
  locks,
  decimals = 6,
}: {
  locks: FridgeLock[];
  decimals?: number;
}) {
  const buckets = bucketLocks(locks);
  if (buckets.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
        Unlock Heatmap
      </p>

      <div className="flex gap-[2px] overflow-x-auto rounded-lg">
        {buckets.map((b, i) => (
          <div key={i} className="group relative min-w-[24px] flex-1">
            <div
              className="h-8 rounded-sm transition-transform hover:scale-y-[1.25]"
              style={{ backgroundColor: intensityColor(b.intensity) }}
            />
            <div
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2
                         hidden -translate-x-1/2 rounded-lg border border-line
                         bg-navy px-3 py-2 text-xs text-ink shadow-lg
                         whitespace-nowrap group-hover:block"
            >
              <p className="font-semibold">{b.label}</p>
              <p>{fmtAmount(b.totalAmount.toString(), decimals)} tokens</p>
              <p className="text-mute">
                {b.lockCount} lock{b.lockCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-mute">
        <span>{buckets[0].label}</span>
        {buckets.length > 2 && (
          <span>{buckets[Math.floor(buckets.length / 2)].label}</span>
        )}
        <span>{buckets[buckets.length - 1].label}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-mute">
        <span>Less</span>
        <div className="flex gap-[1px]">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: intensityColor(v) }}
            />
          ))}
        </div>
        <span>More tokens</span>
      </div>
    </div>
  );
}
