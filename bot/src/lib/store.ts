import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Alert = {
  telegramId: number;
  vaultPda: string;
  mint: string;
  depositor: string;
  registeredAt: number;
  alertsSent: string[];
};

type Broadcast = {
  eventType: string;
  mint?: string;
  vaultPda?: string;
  at: number;
  channel: string;
};

type FileStore = {
  alerts: Alert[];
  broadcasts: Broadcast[];
  lastPastaPrice?: number;
  knownVaults?: string[];
};

const file = join(dirname(fileURLToPath(import.meta.url)), "../../data/store.json");

function load(): FileStore {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as FileStore;
  } catch {
    return { alerts: [], broadcasts: [], knownVaults: [] };
  }
}

function save(data: FileStore) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function addAlert(row: Alert) {
  const data = load();
  data.alerts = [row, ...data.alerts.filter((a) => a.vaultPda !== row.vaultPda)];
  save(data);
}

export function listAlerts(): Alert[] {
  return load().alerts;
}

export function markAlertSent(vaultPda: string, kind: string) {
  const data = load();
  const row = data.alerts.find((a) => a.vaultPda === vaultPda);
  if (row && !row.alertsSent.includes(kind)) {
    row.alertsSent.push(kind);
    save(data);
  }
}

export function alreadyBroadcast(eventType: string, key: string): boolean {
  const data = load();
  return data.broadcasts.some((b) => b.eventType === eventType && (b.vaultPda === key || b.mint === key));
}

export function addBroadcast(row: Broadcast) {
  const data = load();
  data.broadcasts = [row, ...data.broadcasts].slice(0, 500);
  save(data);
}

export function pastaPriceState() {
  const data = load();
  return data.lastPastaPrice ?? null;
}

export function setPastaPrice(n: number) {
  const data = load();
  data.lastPastaPrice = n;
  save(data);
}

export function knownVaults(): string[] {
  return load().knownVaults || [];
}

export function rememberVaults(ids: string[]) {
  const data = load();
  data.knownVaults = ids;
  save(data);
}
