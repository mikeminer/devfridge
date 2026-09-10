import type { EcosystemLive } from "@/lib/ecosystem-live";
import styles from "./ecosystem.module.css";

export default function EvidenceStrip({ live }: { live: EcosystemLive }) {
  return (
    <section aria-label="Live evidence">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={styles.kicker}>Open book</p>
          <h2 className="mt-1 text-xl font-bold">Evidence, dated.</h2>
        </div>
        <p className="text-xs text-mute">
          {live.synapseAt ? `Synapse ${live.synapseAt}` : "Synapse snapshot not collected"}
          {" · "}
          Missing data stays empty. Never rounded to zero.
        </p>
      </div>
      <dl className={styles.gauges}>
        {live.gauges.map((g) => {
          const empty = g.value === "Not collected" || g.value === "None published";
          return (
            <div key={g.id} className={styles.gauge}>
              <dt>{g.label}</dt>
              <dd className={empty ? styles.hollow : undefined}>{g.value}</dd>
              <p className={styles.gaugeNote}>
                {g.note}
                {g.at ? ` · ${g.at}` : ""}
              </p>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
