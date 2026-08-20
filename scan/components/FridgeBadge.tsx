import type { FridgeStatus } from "@/lib/fridge";
import { fmtAmount, fmtUnlock, remainingLabel, shortKey } from "@/lib/format";

export default function FridgeBadge({
  fridge,
  decimals = 6,
  mint,
}: {
  fridge: FridgeStatus;
  decimals?: number;
  mint?: string;
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
            <dd>{fmtUnlock(fridge.unlockAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Time remaining</dt>
            <dd>{remainingLabel(fridge.unlockAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Dev wallet</dt>
            <dd className="font-mono">{fridge.depositor ? shortKey(fridge.depositor) : "—"}</dd>
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
                  {shortKey(fridge.locks[0].address)} ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
        {mint && (
          <a
            className="fridge-key mt-4"
            href={`/badge?mint=${mint}`}
          >
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
          Was locked until {fmtUnlock(fridge.unlockAt)}. Vault is now unlocked. Dev can withdraw.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-caution/40 bg-card p-5">
      <p className="text-lg font-bold tracking-[0.18em] text-caution">⚠️ NOT FRIDGED</p>
      <p className="mt-2 text-sm text-mute">
        Dev has not timelocked supply in DevFridge. Community cannot verify rug protection.
      </p>
      <p className="mt-2 text-sm text-mute">Are you the dev?</p>
      <a
        className="fridge-key fridge-key-primary mt-4"
        href={mint ? `https://devfridge.cool/?mint=${mint}` : "https://devfridge.cool/"}
      >
        Lock on devfridge.cool
      </a>
    </section>
  );
}
