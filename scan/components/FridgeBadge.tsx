import type { FridgeLock, FridgeStatus } from "@/lib/fridge";
import { fmtAmount, fmtUnlock, lockedPercent, shortKey } from "@/lib/format";
import UnlockHeatmap from "./UnlockHeatmap";

export default function FridgeBadge({
  fridge,
  decimals = 6,
  mint,
  supply,
}: {
  fridge: FridgeStatus;
  decimals?: number;
  mint?: string;
  supply?: string | null;
}) {
  if (fridge.status === "unavailable") {
    return (
      <section className="rounded-2xl border border-caution/40 bg-caution/10 p-5">
        <p className="text-sm font-semibold tracking-widest text-caution">FRIDGE CHECK UNAVAILABLE</p>
        <p className="mt-2 text-sm text-mute">{fridge.message || "RPC error"}</p>
      </section>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const active = fridge.locks.filter((l) => l.unlockAt > now);
  const amount = fridge.activeAmount;
  const pct = lockedPercent(amount, supply);
  const lockers = unique(
    (fridge.status === "fridged" ? active : fridge.locks).map((l) => l.depositor)
  );

  if (fridge.status === "fridged") {
    return (
      <section className="rounded-2xl border-2 border-ice bg-fridge p-5 shadow-ice">
        <p className="text-lg font-bold tracking-[0.18em] text-ice">🧊 FRIDGED · VERIFIED ONCHAIN</p>
        <dl className="mt-4 grid gap-2 text-sm text-ink">
          <Row label="Amount locked" value={`${fmtAmount(amount, decimals)} tokens`} />
          {pct && <Row label="% of supply locked" value={pct} />}
          <Row label="Active locks" value={`${active.length}`} />
          <Row
            label={lockers.length > 1 ? "Locked by" : "Locked by"}
            value={lockers.map((w) => shortKey(w)).join(" · ")}
            mono
          />
        </dl>
        <LockList locks={fridge.locks} now={now} decimals={decimals} />
        <UnlockHeatmap locks={fridge.locks} decimals={decimals} />
        {mint && (
          <a className="fridge-key mt-4" href={`/badge?mint=${mint}`}>
            Embed this badge on your site →
          </a>
        )}
      </section>
    );
  }

  if (fridge.status === "expired") {
    return (
      <section className="rounded-2xl border border-caution/50 bg-card p-5">
        <p className="text-lg font-bold tracking-[0.18em] text-caution">🔓 FRIDGE EXPIRED</p>
        <p className="mt-2 text-sm text-mute">
          Last lock ended {fmtUnlock(fridge.unlockAt)}. Unlock time has passed — locker can claim.
        </p>
        <dl className="mt-4 grid gap-2 text-sm text-ink">
          <Row label="Still in vaults" value={`${fmtAmount(amount, decimals)} tokens`} />
          {pct && <Row label="% of supply in vaults" value={pct} />}
          <Row label="Last unlock" value={fmtUnlock(fridge.unlockAt)} />
          <Row label="Locked by" value={lockers.map((w) => shortKey(w)).join(" · ") || "—"} mono />
        </dl>
        <LockList locks={fridge.locks} now={now} decimals={decimals} />
        <UnlockHeatmap locks={fridge.locks} decimals={decimals} />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-caution/40 bg-card p-5">
      <p className="text-lg font-bold tracking-[0.18em] text-caution">⚠️ NOT FRIDGED</p>
      <p className="mt-2 text-sm text-mute">
        No timelock vaults found for this mint. Community cannot verify rug protection.
      </p>
      <p className="mt-2 text-sm text-mute">Are you the locker?</p>
      <a
        className="fridge-key fridge-key-primary mt-4"
        href={mint ? `https://devfridge.cool/?mint=${mint}` : "https://devfridge.cool/"}
      >
        Lock on devfridge.cool
      </a>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mute">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value}</dd>
    </div>
  );
}

function LockList({
  locks,
  now,
  decimals,
}: {
  locks: FridgeLock[];
  now: number;
  decimals: number;
}) {
  if (locks.length === 0) return null;

  const totalAmount = locks.reduce((s, l) => s + BigInt(l.amount), 0n);

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
        Locks by size and time
      </p>
      <ul className="grid gap-2 text-xs">
        {locks.map((lock) => {
          const live = lock.unlockAt > now;
          const secs = lock.unlockAt - now;
          const days = Math.floor(secs / 86400);
          const hours = Math.floor((secs % 86400) / 3600);
          const timeLeft = live
            ? days > 0
              ? `${days}d ${hours}h left`
              : `${hours}h left`
            : "unlocked";
          const weight =
            totalAmount > 0n
              ? (Number((BigInt(lock.amount) * 10000n) / totalAmount) / 100).toFixed(1)
              : "0";
          return (
            <li key={lock.address} className="rounded-xl border border-line bg-navy/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-mute">
                  <span className={live ? "text-ice font-semibold" : "text-mute"}>
                    {fmtAmount(lock.amount, decimals)} tokens
                  </span>
                  {" · "}
                  {weight}% of locked
                </p>
                <span className={`font-mono ${live ? "text-ink" : "text-mute"}`}>
                  {timeLeft}
                </span>
              </div>
              <p className="mt-1 font-mono text-mute">
                <a
                  className="text-ice hover:underline"
                  href={`https://solscan.io/account/${lock.address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortKey(lock.address)} ↗
                </a>
                {" · locked by "}
                <span className="text-ink">{shortKey(lock.depositor)}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
