import type { FridgeLock, FridgeStatus } from "@/lib/fridge";
import { fmtAmount, fmtUnlock, lockedPercent, remainingLabel, shortKey } from "@/lib/format";

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
          <Row label="Unlocks" value={fmtUnlock(fridge.unlockAt)} />
          <Row label="Time remaining" value={remainingLabel(fridge.unlockAt)} />
          <Row
            label={lockers.length > 1 ? "Locked by" : "Locked by"}
            value={lockers.map((w) => shortKey(w)).join(" · ")}
            mono
          />
        </dl>
        <LockList locks={fridge.locks} now={now} decimals={decimals} />
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
  return (
    <ul className="mt-4 grid gap-2 text-xs">
      {locks.map((lock) => {
        const live = lock.unlockAt > now;
        return (
          <li key={lock.address} className="rounded-xl border border-line bg-navy/40 px-3 py-2">
            <p className="text-mute">
              {live ? "Active vault" : "Unclaimed vault"} · {fmtAmount(lock.amount, decimals)} tokens
              {" · locked by "}
              <span className="font-mono text-ink">{shortKey(lock.depositor)}</span>
            </p>
            <p className="mt-1 font-mono">
              <a
                className="text-ice hover:underline"
                href={`https://solscan.io/account/${lock.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortKey(lock.address)} ↗
              </a>
              {" · "}
              {live ? `unlocks ${fmtUnlock(lock.unlockAt)}` : `ended ${fmtUnlock(lock.unlockAt)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
