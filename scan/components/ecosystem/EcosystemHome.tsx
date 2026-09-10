"use client";

import { useMemo, useState } from "react";
import { AUDIENCES, FLOWS, NODES, type EcoAudience, ecoHref, nodeById } from "@/lib/ecosystem";
import type { EcosystemLive } from "@/lib/ecosystem-live";
import EvidenceStrip from "./EvidenceStrip";
import IntegrityFooter from "./IntegrityFooter";
import KitchenMap from "./KitchenMap";
import NodeDrawer from "./NodeDrawer";
import ScanMint from "./ScanMint";
import WorldCountdown from "./WorldCountdown";
import styles from "./ecosystem.module.css";

export default function EcosystemHome({
  host,
  live,
  initialNode,
}: {
  host: string;
  live: EcosystemLive;
  initialNode?: string;
}) {
  const [audience, setAudience] = useState<EcoAudience>("all");
  const [selected, setSelected] = useState<string | null>(initialNode || "fridge");
  const node = nodeById(selected || "") || null;
  const audienceDef = AUDIENCES.find((a) => a.id === audience) || AUDIENCES[0];
  const health = live.health?.status ?? "error";
  const ctaHref = useMemo(() => {
    if (audienceDef.href.startsWith("http")) return audienceDef.href;
    return ecoHref(host, audienceDef.href);
  }, [audienceDef, host]);

  return (
    <div className={`${styles.shell} mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-12`}>
      <p className={styles.kicker}>ECOSYSTEM.DEVFRIDGE.COOL</p>
      <header className={styles.hero}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={styles.led}>
            <span
              className={`${styles.dot} ${
                health === "ok" ? styles.dotOn : health === "degraded" ? styles.dotWarm : styles.dotOff
              }`}
            />
            {live.coldRoomOk ? "Cold room live" : "Check health before any push"}
          </span>
          <span className="fridge-chip">Ticker ≠ identity</span>
          <span className="fridge-chip">Two networks · separate assets</span>
        </div>
        <h1>
          The kitchen.
          <br />
          Not the <em>logo cloud.</em>
        </h1>
        <p className={styles.lede}>
          DevFridge is a Token-2022 time-lock on Solana, a scanner that does not sell its grade, and a
          Robinhood Chain desk that publishes its book. Same ticker on two chains is two assets. Official
          door: connect.devfridge.cool.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="fridge-key fridge-key-primary" href={ctaHref}>
            {audienceDef.cta}
          </a>
          <a className="fridge-key" href="https://docs.devfridge.cool">
            Docs
          </a>
          <a className="fridge-key" href="https://synapse.devfridge.cool">
            Synapse
          </a>
        </div>
      </header>

      <WorldCountdown />
      <EvidenceStrip live={live} />

      <section>
        <p className={styles.kicker}>Who is cooking</p>
        <h2 className="mt-1 text-xl font-bold">One audience per path.</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">{audienceDef.job}</p>
        <div className={`${styles.audiences} mt-4`}>
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`fridge-tab ${audience === a.id ? "is-on" : ""}`}
              onClick={() => {
                setAudience(a.id);
                const first = NODES.find((n) => a.id === "all" || n.audiences.includes(a.id));
                if (first) setSelected(first.id);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <ScanMint />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <KitchenMap host={host} audience={audience} selected={selected} onSelect={setSelected} />
        <NodeDrawer node={node} />
      </div>

      <section>
        <p className={styles.kicker}>Recipes</p>
        <h2 className="mt-1 text-xl font-bold">Three flows. No mixed money.</h2>
        <div className={`${styles.flows} mt-4`}>
          {FLOWS.map((flow) => (
            <article key={flow.id} className={styles.flow}>
              <p className="text-[10px] font-bold tracking-[0.16em] text-ice">{flow.room.toUpperCase()}</p>
              <h3 className="mt-1 font-bold">{flow.title}</h3>
              <ol>
                {flow.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <IntegrityFooter />
    </div>
  );
}
