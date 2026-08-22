import type { FridgeLock } from "./fridge";

export type HeatBucket = {
  startTs: number;
  endTs: number;
  label: string;
  totalAmount: bigint;
  lockCount: number;
  intensity: number;
};

const DAY = 86_400;
const WEEK = 7 * DAY;

function startOfDay(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function startOfWeek(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return Math.floor(d.getTime() / 1000);
}

function startOfMonth(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  return Math.floor(d.getTime() / 1000);
}

function startOfQuarter(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3);
  return Math.floor(d.getTime() / 1000);
}

function nextDay(ts: number): number { return ts + DAY; }
function nextWeek(ts: number): number { return ts + WEEK; }
function nextMonth(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return Math.floor(d.getTime() / 1000);
}
function nextQuarter(ts: number): number {
  const d = new Date(ts * 1000);
  d.setUTCMonth(d.getUTCMonth() + 3);
  return Math.floor(d.getTime() / 1000);
}

function dayLabel(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function weekLabel(ts: number): string {
  const s = new Date(ts * 1000);
  const e = new Date((ts + 6 * DAY) * 1000);
  const sm = s.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const ed = e.getUTCDate();
  return `${sm}–${ed}`;
}

function monthLabel(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function quarterLabel(ts: number): string {
  const d = new Date(ts * 1000);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

type Granularity = {
  align: (ts: number) => number;
  next: (ts: number) => number;
  label: (ts: number) => string;
};

function pickGranularity(spanSeconds: number): Granularity {
  if (spanSeconds <= 14 * DAY) return { align: startOfDay, next: nextDay, label: dayLabel };
  if (spanSeconds <= 90 * DAY) return { align: startOfWeek, next: nextWeek, label: weekLabel };
  if (spanSeconds <= 2 * 365 * DAY) return { align: startOfMonth, next: nextMonth, label: monthLabel };
  return { align: startOfQuarter, next: nextQuarter, label: quarterLabel };
}

export function bucketLocks(locks: FridgeLock[]): HeatBucket[] {
  const valid = locks.filter((l) => l.unlockAt > 0);
  if (valid.length < 2) return [];

  const times = valid.map((l) => l.unlockAt);
  const minTs = Math.min(...times);
  const maxTs = Math.max(...times);
  const span = maxTs - minTs;

  if (span === 0) {
    const total = valid.reduce((s, l) => s + BigInt(l.amount), 0n);
    return [{
      startTs: minTs,
      endTs: minTs + DAY,
      label: dayLabel(minTs),
      totalAmount: total,
      lockCount: valid.length,
      intensity: 1,
    }];
  }

  const g = pickGranularity(span);
  const bucketStart = g.align(minTs);

  const buckets: HeatBucket[] = [];
  let cursor = bucketStart;
  while (cursor <= maxTs) {
    const end = g.next(cursor);
    buckets.push({
      startTs: cursor,
      endTs: end,
      label: g.label(cursor),
      totalAmount: 0n,
      lockCount: 0,
      intensity: 0,
    });
    cursor = end;
  }

  for (const lock of valid) {
    const idx = buckets.findIndex((b) => lock.unlockAt >= b.startTs && lock.unlockAt < b.endTs);
    if (idx >= 0) {
      buckets[idx].totalAmount += BigInt(lock.amount);
      buckets[idx].lockCount += 1;
    }
  }

  // Remove empty leading/trailing buckets
  let first = 0;
  let last = buckets.length - 1;
  while (first < buckets.length && buckets[first].lockCount === 0) first++;
  while (last >= 0 && buckets[last].lockCount === 0) last--;
  const trimmed = buckets.slice(first, last + 1);
  if (trimmed.length === 0) return [];

  const maxAmount = trimmed.reduce(
    (m, b) => (b.totalAmount > m ? b.totalAmount : m),
    0n,
  );
  if (maxAmount > 0n) {
    for (const b of trimmed) {
      b.intensity = Number((b.totalAmount * 1000n) / maxAmount) / 1000;
    }
  }

  return trimmed;
}

const STOPS = [
  { at: 0,    r: 30,  g: 45,  b: 74  },
  { at: 0.25, r: 27,  g: 79,  b: 122 },
  { at: 0.5,  r: 79,  g: 195, b: 247 },
  { at: 0.75, r: 234, g: 179, b: 8   },
  { at: 1.0,  r: 239, g: 68,  b: 68  },
];

export function intensityColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i].at && t <= STOPS[i + 1].at) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const range = hi.at - lo.at || 1;
  const f = (t - lo.at) / range;
  const r = Math.round(lo.r + (hi.r - lo.r) * f);
  const g = Math.round(lo.g + (hi.g - lo.g) * f);
  const b = Math.round(lo.b + (hi.b - lo.b) * f);
  return `rgb(${r},${g},${b})`;
}
