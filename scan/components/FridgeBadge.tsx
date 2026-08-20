import type { FridgeStatus } from "@/lib/fridge";

function fmtAmount(raw: string, decimals = 6) {
  try {
    const n = Number(BigInt(raw)) / 10 ** decimals;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return raw;
  }
}

function fmtTime(unix: number | null) {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function short(k: string) {
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export default function FridgeBadge({
  fridge,
  decimals = 6,
}: {
  fridge: FridgeStatus;
  decimals?: number;
}) {
  if (fridge.status === "unavailable") {
    return (
      <section className="rounded-2xl border border-caution/40 bg-caution/10 p-5">
        <p className="text-sm font-semibold tracking-widest text-caution">FRIDGE CHECK UNAVAILABLE</p>
        <p className="mt-2 text-sm text-mute">{fridge.message || "RPC error"}</p>
      </section>
    );
  }

  if (fridge.status === "fridged") {
    return (
      <section className="rounded-2xl border-2 border-ice bg-fridge p-5 shadow-ice">
        <p className="text-lg font-bold tracking-[0.18em] text-ice">🧊 FRIDGED · VERIFIED ONCHAIN</p>
        <dl className="mt-4 grid gap-2 text-sm text-ink">
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Amount locked</dt>
            <dd>{fmtAmount(fridge.activeAmount, decimals)} tokens</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Unlocks</dt>
            <dd>{fmtTime(fridge.unlockAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Dev wallet</dt>
            <dd className="font-mono">{fridge.depositor ? short(fridge.depositor) : "—"}</dd>
          </div>
          {fridge.locks[0] && (
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Vault PDA</dt>
              <dd>
                <a
                  className="font-mono text-ice hover:underline"
                  href={`https://solscan.io/account/${fridge.locks[0].address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(fridge.locks[0].address)} ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>
    );
  }

  if (fridge.status === "expired") {
    return (
      <section className="rounded-2xl border border-caution/50 bg-card p-5">
        <p className="text-lg font-bold tracking-[0.18em] text-caution">🔓 FRIDGE EXPIRED</p>
        <p className="mt-2 text-sm text-mute">Was locked until {fmtTime(fridge.unlockAt)}. Vault now unlocked.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-caution/40 bg-card p-5">
      <p className="text-lg font-bold tracking-[0.18em] text-caution">⚠️ NOT FRIDGED</p>
      <p className="mt-2 text-sm text-mute">Dev has not timelocked supply.</p>
      <a
        className="mt-4 inline-flex rounded-xl bg-ice px-4 py-2 text-sm font-semibold text-navy"
        href="https://devfridge.cool/#fridge"
      >
        Lock your tokens on devfridge.cool
      </a>
    </section>
  );
}
