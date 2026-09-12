import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { RegistrationError, scoreStore } from "./topshelf/registration-security";

const ADULT_COOKIE = "world_v2_adult";
const EXCLUDE_PREFIX = "world:exclude:v1:";
const LOG_PREFIX = "world:log:v1:";
const GENESIS = "0".repeat(64);

export const EXCLUDE_OPTIONS = [
  { id: "24h", seconds: 86400, label: "24 hours" },
  { id: "7d", seconds: 7 * 86400, label: "7 days" },
  { id: "6m", seconds: 180 * 86400, label: "6 months" },
  { id: "perm", seconds: 10 * 365 * 86400, label: "Permanent" },
] as const;

function secret() {
  const s = process.env.TOPSHELF_RUN_SECRET || process.env.WORLD_GATE_SECRET || "";
  if (s.length < 32) return null;
  return s;
}

export function adultCookieValue() {
  const key = secret();
  if (!key) throw new RegistrationError("Player-protection storage is not configured.", 503);
  const issued = Date.now();
  const body = Buffer.from(JSON.stringify({ v: 1, issued })).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readAdultCookie(cookieHeader: string | null) {
  const raw = cookieHeader
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADULT_COOKIE}=`))
    ?.slice(ADULT_COOKIE.length + 1);
  if (!raw) return false;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return false;
  const key = secret();
  if (!key) return false;
  const expected = createHmac("sha256", key).update(body).digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const { issued } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return Number.isSafeInteger(issued) && Date.now() - issued <= 365 * 86400000;
  } catch {
    return false;
  }
}

export function adultCookieHeader(value: string) {
  return `${ADULT_COOKIE}=${value}; Max-Age=${365 * 86400}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export function assertAdult(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RegistrationError("Enter a valid date of birth.", 400);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
    throw new RegistrationError("Enter a valid date of birth.", 400);
  }
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    throw new RegistrationError("Enter a valid date of birth.", 400);
  }
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  if (dob > cutoff) throw new RegistrationError("You must be 18 or older to play.", 403);
}

export function walletKey(value: unknown) {
  try {
    if (typeof value !== "string") throw Error();
    const key = new PublicKey(value);
    if (!PublicKey.isOnCurve(key.toBytes())) throw Error();
    return key.toBase58();
  } catch {
    throw new RegistrationError("Invalid Solana wallet", 400);
  }
}

export async function exclusionOf(wallet: string) {
  try {
    const raw = await scoreStore(["GET", EXCLUDE_PREFIX + wallet]);
    if (!raw) return null;
    const row = JSON.parse(String(raw));
    if (!row?.until || row.until <= Date.now()) {
      await scoreStore(["DEL", EXCLUDE_PREFIX + wallet]);
      return null;
    }
    return row as { wallet: string; until: number; option: string; created: number };
  } catch (e) {
    if (e instanceof RegistrationError && e.status === 503) return null;
    throw e;
  }
}

export async function assertNotExcluded(wallet: string) {
  const row = await exclusionOf(wallet);
  if (row) {
    throw new RegistrationError(
      `Self-exclusion is active until ${new Date(row.until).toISOString()}. Play is blocked.`,
      403,
    );
  }
}

export async function setExclusion(wallet: string, optionId: string) {
  const option = EXCLUDE_OPTIONS.find((o) => o.id === optionId);
  if (!option) throw new RegistrationError("Choose a self-exclusion period.", 400);
  const created = Date.now();
  const until = created + option.seconds * 1000;
  const row = { wallet, until, option: option.id, created, id: randomBytes(8).toString("hex") };
  const ttl = Math.max(60, Math.ceil((until - created) / 1000));
  await scoreStore(["SET", EXCLUDE_PREFIX + wallet, JSON.stringify(row), "EX", ttl]);
  return row;
}

function digest(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function appendLog(runId: string, event: Record<string, unknown>) {
  const key = LOG_PREFIX + runId;
  let prev = GENESIS;
  try {
    const last = await scoreStore(["LINDEX", key, 0]);
    if (last) prev = JSON.parse(String(last)).hash || GENESIS;
  } catch (e) {
    if (e instanceof RegistrationError && e.status === 503) return null;
    throw e;
  }
  const entry = {
    ...event,
    runId,
    at: Date.now(),
    prev,
  };
  const hash = digest(JSON.stringify(entry));
  const row = { ...entry, hash };
  await scoreStore(["LPUSH", key, JSON.stringify(row)]);
  await scoreStore(["EXPIRE", key, 90 * 86400]);
  return row;
}

export async function readLog(runId: string, limit = 50) {
  if (!/^[0-9a-fA-Fx]+$/.test(runId) || runId.length > 128) throw new RegistrationError("Invalid run id", 400);
  const key = LOG_PREFIX + runId;
  const rows = (await scoreStore(["LRANGE", key, 0, Math.min(200, Math.max(1, limit)) - 1])) as string[] | null;
  const events = (rows || []).map((r) => JSON.parse(String(r)));
  return { runId, genesis: GENESIS, events };
}
