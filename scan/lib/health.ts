import { PROGRAM_ID, PASTA_MINT } from "./constants";
import { fridgeForMint } from "./fridge";
import { usdPrice } from "./price";
import { rpc } from "./rpc";

export type CheckStatus = "ok" | "degraded" | "error";

export type HealthCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  ms: number;
  detail: string;
};

export type HealthReport = {
  ok: boolean;
  status: CheckStatus;
  ts: number;
  rpc: "ok" | "degraded";
  db: "ok" | "memory";
  fridge: "ok" | "error";
  checks: HealthCheck[];
};

function accountPresent(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const row = result as { value?: unknown; executable?: boolean };
  if (row.value === null) return false;
  if (row.value && typeof row.value === "object") return true;
  return row.executable === true;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T; ms: number } | { ok: false; error: string; ms: number }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { ok: true, value, ms: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - t0,
    };
  }
}

export async function runHealth(): Promise<HealthReport> {
  const [slot, program, fridge, pasta, site] = await Promise.all([
    timed(() => rpc<number>("getSlot", [])),
    timed(() => rpc<unknown>("getAccountInfo", [PROGRAM_ID, { encoding: "base64" }])),
    timed(() => fridgeForMint(PASTA_MINT)),
    timed(() => usdPrice(PASTA_MINT)),
    timed(async () => {
      const res = await fetch("https://devfridge.cool/", {
        method: "HEAD",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const get = await fetch("https://devfridge.cool/", {
          signal: AbortSignal.timeout(8000),
        });
        if (!get.ok) throw new Error(`HTTP ${get.status}`);
        return get.status;
      }
      return res.status;
    }),
  ]);

  const kv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  const rpcCheck: HealthCheck = slot.ok
    ? { id: "rpc", label: "Solana RPC", status: "ok", ms: slot.ms, detail: `slot ${slot.value.toLocaleString()}` }
    : { id: "rpc", label: "Solana RPC", status: "error", ms: slot.ms, detail: slot.error };

  const programLive = program.ok && accountPresent(program.value);
  const programCheck: HealthCheck = programLive
    ? {
        id: "program",
        label: "Fridge program",
        status: "ok",
        ms: program.ms,
        detail: PROGRAM_ID.slice(0, 4) + "…" + PROGRAM_ID.slice(-4),
      }
    : {
        id: "program",
        label: "Fridge program",
        status: "error",
        ms: program.ms,
        detail: program.ok ? "account missing" : program.error,
      };

  const fridgeCheck: HealthCheck = !fridge.ok
    ? { id: "fridge", label: "Fridge locks", status: "error", ms: fridge.ms, detail: fridge.error }
    : fridge.value.status === "unavailable"
      ? { id: "fridge", label: "Fridge locks", status: "error", ms: fridge.ms, detail: fridge.value.message || "unavailable" }
      : {
          id: "fridge",
          label: "Fridge locks",
          status: "ok",
          ms: fridge.ms,
          detail:
            fridge.value.status === "fridged"
              ? `$PASTA lock live`
              : fridge.value.status === "expired"
                ? "$PASTA lock expired"
                : "GPA ok · no $PASTA lock",
        };

  const pastaCheck: HealthCheck =
    pasta.ok && pasta.value != null
      ? {
          id: "pasta",
          label: "$PASTA price",
          status: "ok",
          ms: pasta.ms,
          detail: `$${pasta.value < 0.01 ? pasta.value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : pasta.value.toFixed(4)}`,
        }
      : {
          id: "pasta",
          label: "$PASTA price",
          status: "degraded",
          ms: pasta.ms,
          detail: pasta.ok ? "no quote" : pasta.error,
        };

  const siteCheck: HealthCheck = site.ok
    ? { id: "site", label: "devfridge.cool", status: "ok", ms: site.ms, detail: `HTTP ${site.value}` }
    : { id: "site", label: "devfridge.cool", status: "degraded", ms: site.ms, detail: site.error };

  const storeCheck: HealthCheck = {
    id: "store",
    label: "Boost store",
    status: "ok",
    ms: 0,
    detail: kv ? "Vercel KV" : "in-memory",
  };

  const scanCheck: HealthCheck = {
    id: "scan",
    label: "Scanner API",
    status: "ok",
    ms: 0,
    detail: "health endpoint live",
  };

  const checks = [rpcCheck, programCheck, fridgeCheck, pastaCheck, siteCheck, scanCheck, storeCheck];
  const hasError = checks.some((c) => c.status === "error");
  const hasDegraded = checks.some((c) => c.status === "degraded");
  const status: CheckStatus = hasError ? "error" : hasDegraded ? "degraded" : "ok";

  return {
    ok: status !== "error",
    status,
    ts: Date.now(),
    rpc: rpcCheck.status === "ok" ? "ok" : "degraded",
    db: kv ? "ok" : "memory",
    fridge: fridgeCheck.status === "ok" ? "ok" : "error",
    checks,
  };
}
