"use client";

import {
  ASSETS,
  NODES,
  type EcoAudience,
  type EcoNode,
  type EcoRoom,
  ecoHref,
  logoForAsset,
} from "@/lib/ecosystem";
import styles from "./ecosystem.module.css";

const ROOM_LABEL: Record<EcoRoom, string> = {
  solana: "Cold room · Solana",
  robinhood: "Pantry · Robinhood 4663",
  pass: "The pass · shared lore, verified routes",
};

export default function KitchenMap({
  host,
  audience,
  selected,
  onSelect,
  roomFilter,
}: {
  host: string;
  audience: EcoAudience;
  selected: string | null;
  onSelect: (id: string) => void;
  roomFilter?: EcoRoom;
}) {
  function lit(node: EcoNode) {
    if (audience === "all") return true;
    return node.audiences.includes(audience) || node.id === "connect";
  }

  const solana = NODES.filter((n) => n.room === "solana");
  const pantry = NODES.filter((n) => n.room === "robinhood");
  const pass = NODES.filter((n) => n.room === "pass");
  const characters = ASSETS.filter((a) => a.kind === "character");

  return (
    <div className={styles.kitchen}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={styles.kicker}>The appliance</p>
        <p className="text-xs text-mute">Click a magnet. Proof first.</p>
      </div>
      <div className={styles.rooms}>
        {(!roomFilter || roomFilter === "solana") && (
          <Room
            title={ROOM_LABEL.solana}
            nodes={solana}
            selected={selected}
            lit={lit}
            onSelect={onSelect}
          />
        )}
        <button
          type="button"
          className={styles.freezer}
          onClick={() => onSelect("fridge")}
          aria-pressed={selected === "fridge"}
        >
          <img src="https://devfridge.cool/brand/logo-mark.jpg" alt="" />
          <div className={styles.handle} aria-hidden />
          <strong>Fridge vault</strong>
          <span className="text-xs text-mute">Token-2022 time-lock</span>
        </button>
        {(!roomFilter || roomFilter === "robinhood") && (
          <Room
            title={ROOM_LABEL.robinhood}
            nodes={pantry}
            selected={selected}
            lit={lit}
            onSelect={onSelect}
          />
        )}
      </div>
      {(!roomFilter || roomFilter === "pass") && (
        <div>
          <p className={styles.roomHead}>{ROOM_LABEL.pass}</p>
          <div className={`${styles.pass} mt-2`}>
            {pass.map((node) => (
              <NodeButton
                key={node.id}
                node={node}
                on={selected === node.id}
                dim={!lit(node)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className={styles.roomHead}>Door magnets · ten characters</p>
          <a className="text-xs text-ice hover:underline" href={ecoHref(host, "cast")}>
            Full registry
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          {characters.map((c) => (
            <a
              key={c.id}
              className="fridge-chip"
              href={ecoHref(host, "cast") + `#${c.id}`}
              title={`${c.name} · ${c.chant}`}
            >
              <img
                src={logoForAsset(c)}
                alt=""
                className="mr-1 h-5 w-5 rounded-full object-cover"
              />
              {c.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Room({
  title,
  nodes,
  selected,
  lit,
  onSelect,
}: {
  title: string;
  nodes: EcoNode[];
  selected: string | null;
  lit: (n: EcoNode) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.room}>
      <p className={styles.roomHead}>{title}</p>
      {nodes.map((node) => (
        <NodeButton
          key={node.id}
          node={node}
          on={selected === node.id}
          dim={!lit(node)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function NodeButton({
  node,
  on,
  dim,
  onSelect,
}: {
  node: EcoNode;
  on: boolean;
  dim: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.node} ${on ? styles.nodeOn : ""} ${dim ? styles.nodeDim : ""}`}
      onClick={() => onSelect(node.id)}
    >
      <small>{node.kicker}</small>
      <strong>{node.name}</strong>
    </button>
  );
}
