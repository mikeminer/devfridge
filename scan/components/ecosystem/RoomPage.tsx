"use client";

import { useState } from "react";
import { NODES, type EcoRoom, nodeById } from "@/lib/ecosystem";
import type { EcosystemLive } from "@/lib/ecosystem-live";
import EvidenceStrip from "./EvidenceStrip";
import IntegrityFooter from "./IntegrityFooter";
import KitchenMap from "./KitchenMap";
import NodeDrawer from "./NodeDrawer";
import RegistryWall from "./RegistryWall";
import ScanMint from "./ScanMint";
import styles from "./ecosystem.module.css";

export default function RoomPage({
  host,
  live,
  room,
  kicker,
  title,
  lede,
}: {
  host: string;
  live: EcosystemLive;
  room: EcoRoom;
  kicker: string;
  title: string;
  lede: string;
}) {
  const first = NODES.find((n) => n.room === room)?.id || "fridge";
  const [selected, setSelected] = useState<string | null>(first);
  return (
    <div className={`${styles.shell} mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-12`}>
      <p className={styles.kicker}>{kicker}</p>
      <header>
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-mute">{lede}</p>
      </header>
      <EvidenceStrip live={live} />
      {room === "solana" && <ScanMint />}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <KitchenMap
          host={host}
          audience="all"
          selected={selected}
          onSelect={setSelected}
          roomFilter={room}
        />
        <NodeDrawer node={nodeById(selected || "") || null} />
      </div>
      <section>
        <h2 className="text-xl font-bold">Registry · {room === "solana" ? "Solana" : "Robinhood Chain"}</h2>
        <p className="mt-2 text-sm text-mute">Same ticker on two chains is two assets. Copy the full address.</p>
        <div className="mt-4">
          <RegistryWall chain={room === "pass" ? undefined : room === "solana" ? "solana" : "robinhood"} />
        </div>
      </section>
      <IntegrityFooter />
    </div>
  );
}
