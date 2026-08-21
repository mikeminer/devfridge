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
  burned?: string;
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

function mergeBoosts(rows: BoostRecord[]): BoostRecord[] {
  const map = new Map<string, BoostRecord>();
  for (const row of rows) {
    if (!row?.mint || !row.expiresAt) continue;
    const prev = map.get(row.mint);
    if (!prev) {
      map.set(row.mint, row);
      continue;
    }
    const newer = row.expiresAt >= prev.expiresAt ? row : prev;
    const older = newer === row ? prev : row;
    map.set(row.mint, {
      ...newer,
      name:
        newer.name && newer.name !== newer.mint.slice(0, 4) ? newer.name : older.name || newer.name,
      symbol: newer.symbol && newer.symbol !== "TKN" ? newer.symbol : older.symbol || newer.symbol,
      image: newer.image || older.image || null,
      burned: newer.burned || older.burned,
      fridged: newer.fridged || older.fridged,
    });
  }
  const rank = { "7d": 3, "48h": 2, "24h": 1 };
  return [...map.values()].sort(
    (a, b) => rank[b.tier] - rank[a.tier] || b.expiresAt - a.expiresAt
  );
}

export async function addBoost(row: BoostRecord) {
  const boosts = await listBoosts(true);
  const next = mergeBoosts([row, ...boosts]);
  mem.boosts = next;
  await kvSet("boosts", next);
}

export async function listBoosts(includeExpired = false): Promise<BoostRecord[]> {
  const stored = await kvGet<BoostRecord[]>("boosts", mem.boosts);
  let chain: BoostRecord[] = [];
  try {
    const { boostsFromChain } = await import("./boost");
    chain = await boostsFromChain();
  } catch {
    chain = [];
  }
  const merged = mergeBoosts([...chain, ...stored]);
  const { fillIdentity, isPlaceholderIdentity } = await import("./identity");
  const filled = await Promise.all(merged.map((row) => fillIdentity(row)));
  if (filled.some((row, i) => isPlaceholderIdentity(merged[i]) && !isPlaceholderIdentity(row))) {
    await kvSet("boosts", filled);
  }
  mem.boosts = filled;
  const now = Date.now();
  return includeExpired ? filled : filled.filter((b) => b.expiresAt > now);
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
