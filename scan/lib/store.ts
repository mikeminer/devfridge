export type BoostRecord = {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  tier: "24h" | "48h" | "7d";
  signature: string;
  payer: string;
  expiresAt: number;
  createdAt: number;
  fridged: boolean;
};

export type RecentScan = {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  fridged: boolean;
  scannedAt: number;
};

const mem = {
  boosts: [] as BoostRecord[],
  recent: [] as RecentScan[],
};

const CACHE_TTL = 60 * 60 * 24 * 30;

function kvEnabled() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function storeBackend(): "kv" | "cache" | "memory" {
  if (kvEnabled()) return "kv";
  if (process.env.VERCEL) return "cache";
  return "memory";
}

async function runtimeGet<T>(key: string): Promise<T | undefined> {
  try {
    const { getCache } = await import("@vercel/functions");
    const hit = await getCache().get(key);
    if (hit == null) return undefined;
    return hit as T;
  } catch {
    return undefined;
  }
}

async function runtimeSet(key: string, value: unknown) {
  try {
    const { getCache } = await import("@vercel/functions");
    await getCache().set(key, value, { ttl: CACHE_TTL, name: key, tags: ["feed"] });
  } catch {
    /* local / unsupported */
  }
}

async function kvGet<T>(key: string, fallback: T): Promise<T> {
  if (kvEnabled()) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { result?: string | null };
        if (json.result) return JSON.parse(json.result) as T;
      }
    } catch {
      /* fall through */
    }
  }
  const cached = await runtimeGet<T>(key);
  if (cached != null) return cached;
  return fallback;
}

async function kvSet(key: string, value: unknown) {
  if (kvEnabled()) {
    await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(value)),
    });
  }
  await runtimeSet(key, value);
}

export async function addBoost(row: BoostRecord) {
  const boosts = await listBoosts(true);
  const next = [row, ...boosts.filter((b) => b.mint !== row.mint || b.signature !== row.signature)];
  mem.boosts = next;
  await kvSet("boosts", next);
}

export async function listBoosts(includeExpired = false): Promise<BoostRecord[]> {
  const stored = await kvGet<BoostRecord[]>("boosts", mem.boosts);
  mem.boosts = stored;
  const now = Date.now();
  const rows = includeExpired ? stored : stored.filter((b) => b.expiresAt > now);
  const rank = { "7d": 3, "48h": 2, "24h": 1 };
  return [...rows].sort((a, b) => rank[b.tier] - rank[a.tier] || b.expiresAt - a.expiresAt);
}

export async function addRecent(row: RecentScan) {
  const recent = await listRecent();
  const next = [row, ...recent.filter((r) => r.mint !== row.mint)].slice(0, 20);
  mem.recent = next;
  await kvSet("recent", next);
}

export async function listRecent(): Promise<RecentScan[]> {
  const stored = await kvGet<RecentScan[]>("recent", mem.recent);
  mem.recent = stored;
  return stored.slice(0, 20);
}
