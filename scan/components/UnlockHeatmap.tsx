"use client";

import type { FridgeLock } from "@/lib/fridge";
import { intensityColor } from "@/lib/heatmap";
import { fmtAmount, fmtUnlock } from "@/lib/format";

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

  const sorted = [...valid].sort((a, b) => a.unlockAt - b.unlockAt);
  const maxAmount = sorted.reduce(
    (m, l) => {
      const v = BigInt(l.amount);
      return v > m ? v : m;
    },
    0n,
  );

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
        Unlock Heatmap
      </p>

      <div className="flex flex-col gap-[2px]">
        {sorted.map((lock) => {
          const intensity = maxAmount > 0n
            ? Number((BigInt(lock.amount) * 1000n) / maxAmount) / 1000
            : 0;
          return (
            <div key={lock.address} className="flex items-center gap-2">
              <div
                className="h-6 flex-1 rounded-sm"
                style={{ backgroundColor: intensityColor(intensity) }}
              />
              <a
                className="min-w-[90px] text-right text-[10px] text-ice hover:underline"
                href={`https://solscan.io/account/${lock.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {fmtUnlock(lock.unlockAt)}
              </a>
              <span className="min-w-[80px] text-right font-mono text-[10px] text-ink">
                {fmtAmount(lock.amount, decimals)}
              </span>
            </div>
          );
        })}
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
