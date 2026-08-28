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
  const now = Math.floor(Date.now() / 1000);
  const valid = locks.filter((l) => l.unlockAt > now);
  if (valid.length < 2) return null;

  const buckets = bucketLocks(valid);
  if (buckets.length === 0) return null;

  const totalAmount = valid.reduce((s, l) => s + BigInt(l.amount), 0n);
  const maxAmount = buckets.reduce(
    (m, b) => (b.totalAmount > m ? b.totalAmount : m),
    0n,
  );

  return (
    <div className="mt-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
        Unlock schedule
      </p>

      <div className="flex flex-col gap-1">
        {buckets.map((bucket) => {
          const pct =
            totalAmount > 0n
              ? Number((bucket.totalAmount * 10000n) / totalAmount) / 100
              : 0;
          const barWidth =
            maxAmount > 0n
              ? Math.max(4, Number((bucket.totalAmount * 100n) / maxAmount))
              : 0;
          const secs = bucket.startTs - now;
          const days = Math.floor(secs / 86400);
          const timeTag =
            days > 365
              ? `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`
              : days > 30
                ? `${Math.floor(days / 30)}m ${days % 30}d`
                : days > 0
                  ? `${days}d`
                  : "<1d";

          return (
            <div key={bucket.startTs} className="group">
              <div className="flex items-center gap-2">
                <span className="w-[72px] shrink-0 text-right text-[10px] text-mute">
                  {bucket.label}
                </span>
                <div className="relative flex-1">
                  <div
                    className="h-5 rounded-sm transition-all group-hover:brightness-125"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: intensityColor(bucket.intensity),
                    }}
                  />
                </div>
                <span className="w-[72px] shrink-0 font-mono text-[10px] text-ink">
                  {fmtAmount(bucket.totalAmount.toString(), decimals)}
                </span>
                <span className="w-[44px] shrink-0 text-right text-[10px] text-mute">
                  {pct.toFixed(1)}%
                </span>
              </div>
              {bucket.lockCount > 0 && (
                <div className="ml-[80px] flex gap-3 text-[9px] text-mute">
                  <span>
                    {bucket.lockCount} lock{bucket.lockCount > 1 ? "s" : ""}
                  </span>
                  <span>in {timeTag}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-mute">
          <span>Sooner</span>
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
        <span className="text-[10px] text-mute">
          {valid.length} locks · {fmtAmount(totalAmount.toString(), decimals)} total
        </span>
      </div>
    </div>
  );
}
