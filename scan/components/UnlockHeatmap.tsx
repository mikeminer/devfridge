"use client";

import type { FridgeLock } from "@/lib/fridge";
import { bucketLocks, intensityColor } from "@/lib/heatmap";
import { fmtAmount } from "@/lib/format";

function fmtScale(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(0);
  return n.toFixed(2);
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

export default function UnlockHeatmap({
  locks,
  decimals = 6,
  priceUsd,
}: {
  locks: FridgeLock[];
  decimals?: number;
  priceUsd?: number | null;
}) {
  const now = Math.floor(Date.now() / 1000);
  const valid = locks.filter((l) => l.unlockAt > now);
  if (valid.length < 2) return null;

  const buckets = bucketLocks(valid);
  if (buckets.length === 0) return null;

  const populated = buckets.filter((b) => b.lockCount > 0);
  if (populated.length === 0) return null;

  const totalAmount = valid.reduce((s, l) => s + BigInt(l.amount), 0n);
  const maxAmount = populated.reduce(
    (m, b) => (b.totalAmount > m ? b.totalAmount : m),
    0n,
  );

  const maxTokens = Number(maxAmount) / 10 ** decimals;
  const price = priceUsd && priceUsd > 0 ? priceUsd : null;
  const maxUsd = price ? maxTokens * price : null;

  const TICKS = 5;
  const tokenTicks = Array.from({ length: TICKS }, (_, i) =>
    (maxTokens / (TICKS - 1)) * i
  );
  const usdTicks = maxUsd
    ? Array.from({ length: TICKS }, (_, i) => (maxUsd / (TICKS - 1)) * i)
    : null;

  return (
    <div className="mt-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
        Unlock schedule
      </p>

      {/* Token scale */}
      <div className="mb-1 flex items-center gap-2">
        <span className="w-[72px] shrink-0" />
        <div className="relative flex-1 flex justify-between text-[9px] text-mute">
          {tokenTicks.map((v, i) => (
            <span key={i}>{fmtScale(v)}</span>
          ))}
        </div>
        <span className="w-[120px] shrink-0 text-right text-[9px] text-mute">
          tokens
        </span>
      </div>

      {/* USD scale */}
      {usdTicks && (
        <div className="mb-1 flex items-center gap-2">
          <span className="w-[72px] shrink-0" />
          <div className="relative flex-1 flex justify-between text-[9px] text-ice/60">
            {usdTicks.map((v, i) => (
              <span key={i}>{fmtUsd(v)}</span>
            ))}
          </div>
          <span className="w-[120px] shrink-0 text-right text-[9px] text-ice/60">
            USD
          </span>
        </div>
      )}

      {/* Bars */}
      <div className="flex flex-col gap-1">
        {populated.map((bucket) => {
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

          const bucketTokens = Number(bucket.totalAmount) / 10 ** decimals;
          const bucketUsd = price ? bucketTokens * price : null;

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
                <span className="w-[56px] shrink-0 font-mono text-right text-[10px] text-ink">
                  {fmtAmount(bucket.totalAmount.toString(), decimals)}
                </span>
                {bucketUsd != null && (
                  <span className="w-[56px] shrink-0 text-right text-[10px] text-ice/70">
                    {fmtUsd(bucketUsd)}
                  </span>
                )}
              </div>
              <div className="ml-[80px] flex gap-3 text-[9px] text-mute">
                <span>
                  {bucket.lockCount} lock{bucket.lockCount > 1 ? "s" : ""}
                </span>
                <span>{pct.toFixed(1)}%</span>
                <span>in {timeTag}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-mute">
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
        <span className="text-[10px] text-mute">
          {valid.length} locks · {fmtAmount(totalAmount.toString(), decimals)} total
          {price ? ` · ${fmtUsd(Number(totalAmount) / 10 ** decimals * price)}` : ""}
        </span>
      </div>
    </div>
  );
}
