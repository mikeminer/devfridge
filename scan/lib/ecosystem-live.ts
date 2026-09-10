import { protocolStats, type ProtocolStats } from "./stats";
import { runHealth, type HealthReport } from "./health";
import { SYNAPSE_BRIEF } from "./ecosystem";

export type EcoGauge = {
  id: string;
  label: string;
  value: string;
  note: string;
  source: string;
  at: string | null;
};

export type EcosystemLive = {
  health: HealthReport | null;
  stats: ProtocolStats | null;
  gauges: EcoGauge[];
  synapseAt: string | null;
  coldRoomOk: boolean;
};

type SynapseBrief = {
  snapshot_attempted_at?: string;
  protocol?: {
    activity?: {
      fetched_at?: string;
      status?: string;
      data?: {
        active_locks?: number;
        depositor_wallets?: number;
        unique_mints?: number;
        open_lock_accounts?: number;
        scope?: string;
        slot?: number;
      };
    };
    reported_stats?: {
      fetched_at?: string;
      data?: {
        reported_pasta_burned?: string;
        interpretation?: string;
      };
    };
  };
};

function iso(ms: number | string | undefined | null): string | null {
  if (!ms) return null;
  if (typeof ms === "string") return ms;
  return new Date(ms).toISOString();
}

async function fetchSynapse(): Promise<SynapseBrief | null> {
  const res = await fetch(SYNAPSE_BRIEF, {
    next: { revalidate: 300 },
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as SynapseBrief;
}

function num(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Not collected";
  return value.toLocaleString("en-US");
}

export async function loadEcosystemLive(): Promise<EcosystemLive> {
  const [health, stats, synapse] = await Promise.all([
    runHealth().catch(() => null),
    protocolStats().catch(() => null),
    fetchSynapse().catch(() => null),
  ]);

  const act = synapse?.protocol?.activity;
  const burns = synapse?.protocol?.reported_stats;
  const synapseAt = synapse?.snapshot_attempted_at || act?.fetched_at || null;
  const statsAt = stats ? iso(stats.ts) : null;

  const active = act?.data?.active_locks ?? stats?.activeLocks ?? null;
  const depositors = act?.data?.depositor_wallets ?? stats?.depositors ?? null;
  const mints = act?.data?.unique_mints ?? stats?.mints ?? null;
  const openAccounts = act?.data?.open_lock_accounts ?? stats?.lockCount ?? null;
  const burned = burns?.data?.reported_pasta_burned ?? stats?.pastaBurned ?? null;

  const gauges: EcoGauge[] = [
    {
      id: "health",
      label: "Cold room",
      value: health?.status === "ok" ? "Live" : health?.status === "degraded" ? "Warm" : health ? "Attention" : "Not collected",
      note: health ? "Fridge, RPC, Scanner probes." : "Health feed unavailable.",
      source: "https://health.devfridge.cool/api/health",
      at: health ? iso(health.ts) : null,
    },
    {
      id: "locks",
      label: "Active locks",
      value: num(active),
      note: "Currently open accounts with unlock still in the future. Not lifetime users.",
      source: act?.data ? SYNAPSE_BRIEF : "https://scan.devfridge.cool/api/stats",
      at: act?.fetched_at || statsAt,
    },
    {
      id: "wallets",
      label: "Depositor wallets",
      value: num(depositors),
      note: "Wallets are not people. Outside adoption still needs evidence.",
      source: act?.data ? SYNAPSE_BRIEF : "https://scan.devfridge.cool/api/stats",
      at: act?.fetched_at || statsAt,
    },
    {
      id: "mints",
      label: "Unique mints",
      value: num(mints),
      note: openAccounts != null ? `Open lock accounts: ${num(openAccounts)} (includes expired unclaimed).` : "Open-account count not collected.",
      source: act?.data ? SYNAPSE_BRIEF : "https://scan.devfridge.cool/api/stats",
      at: act?.fetched_at || statsAt,
    },
    {
      id: "burns",
      label: "Reported $PASTA burned",
      value: burned ?? "Not collected",
      note:
        burns?.data?.interpretation ||
        "Scanner incinerator read. Not a complete ledger of Burn instructions. Not fee revenue.",
      source: burns?.data ? SYNAPSE_BRIEF : "https://scan.devfridge.cool/api/stats",
      at: burns?.fetched_at || statsAt,
    },
    {
      id: "locks-pct",
      label: "Locked % / unlocks",
      value: "Not collected",
      note: "Per-token locked percentage and unlock schedule are not in this snapshot. Verify the mint in Scan.",
      source: "https://scan.devfridge.cool",
      at: synapseAt,
    },
    {
      id: "audit",
      label: "Independent audit",
      value: "None published",
      note: "Public source and tests are not an audit.",
      source: "https://docs.devfridge.cool/security",
      at: null,
    },
  ];

  return {
    health,
    stats,
    gauges,
    synapseAt,
    coldRoomOk: health?.status === "ok",
  };
}
