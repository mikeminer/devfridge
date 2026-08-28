export type Socials = {
  x?: string;
  github?: string;
  telegram?: string;
  discord?: string;
  farcaster?: string;
  pumpfun?: string;
};

export type TeamMember = {
  wallet: string;
  role: string;
  tier: 1 | 2 | 3 | 4 | 5;
  displayName: string | null;
  avatar: string | null;
  socials?: Socials | null;
  addedAt: number;
};

/* ── KV helpers (same pattern as store.ts) ─────────────── */

function kvEnabled() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const KV_KEY = "team:roster";

async function kvGet<T>(key: string, fallback: T): Promise<T> {
  if (kvEnabled()) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { result?: string | null };
        if (json.result) {
          let parsed: unknown = JSON.parse(json.result);
          // Handle legacy double-encoded values
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          return parsed as T;
        }
      }
    } catch {
      /* fall through */
    }
  }
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
      body: JSON.stringify(value),
    });
  }
}

/* ── In-memory fallback for local dev ──────────────────── */

let mem: TeamMember[] = [];

/* ── CRUD ──────────────────────────────────────────────── */

export async function listTeam(): Promise<TeamMember[]> {
  const stored = await kvGet<TeamMember[]>(KV_KEY, mem);
  mem = stored;
  return stored;
}

export async function upsertMember(member: TeamMember): Promise<TeamMember[]> {
  const roster = await listTeam();
  const idx = roster.findIndex((m) => m.wallet === member.wallet);
  if (idx >= 0) {
    roster[idx] = { ...member, addedAt: roster[idx].addedAt };
  } else {
    roster.push(member);
  }
  mem = roster;
  await kvSet(KV_KEY, roster);
  return roster;
}

export async function removeMember(wallet: string): Promise<TeamMember[]> {
  const roster = await listTeam();
  const next = roster.filter((m) => m.wallet !== wallet);
  mem = next;
  await kvSet(KV_KEY, next);
  return next;
}

/* ── Team Config (applications open/closed) ──────────── */

const CONFIG_KEY = "team:config";

export type TeamConfig = {
  applicationsOpen: boolean;
};

let memConfig: TeamConfig = { applicationsOpen: false };

export async function getTeamConfig(): Promise<TeamConfig> {
  const stored = await kvGet<TeamConfig>(CONFIG_KEY, memConfig);
  memConfig = stored;
  return stored;
}

export async function setTeamConfig(config: TeamConfig): Promise<TeamConfig> {
  memConfig = config;
  await kvSet(CONFIG_KEY, config);
  return config;
}
