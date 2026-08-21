"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export type Faction = {
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  usd: number;
  color: string;
  team: "pastalovers" | "shelf";
  teamName: string;
};

const FridgeCanvas = dynamic(() => import("./FridgeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-ice">Loading the Fridge…</div>
  ),
});

export default function WorldApp() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [faction, setFaction] = useState<Faction | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const wallet = publicKey?.toBase58() || "";

  useEffect(() => {
    document.body.classList.add("world-play");
    return () => document.body.classList.remove("world-play");
  }, []);

  useEffect(() => {
    if (!wallet) {
      setFaction(undefined);
      return;
    }
    let live = true;
    setErr("");
    fetch(`/api/world/faction?wallet=${wallet}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        setFaction(j.faction || null);
      })
      .catch((e) => {
        if (!live) return;
        setErr(e instanceof Error ? e.message : "faction failed");
        setFaction(null);
      });
    return () => {
      live = false;
    };
  }, [wallet]);

  const room = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("room") || "";
  }, []);

  const canFight = Boolean(connected && faction);

  return (
    <div className="relative h-[calc(100dvh-58px)] min-h-[520px] w-full overflow-hidden bg-[#152033]">
      <FridgeCanvas faction={faction && connected ? faction : null} room={room} />
      {!connected || !publicKey ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-6 sm:place-items-center">
          <div className="ice-card pointer-events-auto max-w-lg p-6">
            <p className="text-[10px] font-bold tracking-[0.2em] text-ice">WORLD.DEVFRIDGE.COOL</p>
            <h1 className="mt-2 text-2xl font-bold">Inside the Fridge</h1>
            <p className="mt-3 text-sm text-mute">
              Click the ice to look around. Connect the wallet that locked a token to join a team:
              Pastalovers ($PASTA) vs The Shelf (any other live lock).
            </p>
            <button type="button" className="fridge-key fridge-key-primary mt-5" onClick={() => setVisible(true)}>
              Connect wallet to fight
            </button>
          </div>
        </div>
      ) : connected && faction === undefined ? (
        <p className="absolute bottom-6 left-6 z-10 text-sm text-ice">Reading Fridge locks…</p>
      ) : connected && faction === null ? (
        <div className="absolute bottom-6 left-6 z-10 ice-card max-w-md p-4">
          <p className="font-bold">Spectating — no live lock</p>
          <p className="mt-1 text-sm text-mute">
            Lock $PASTA for Pastalovers or any other Token-2022 for The Shelf, then reload.
          </p>
          <a className="fridge-key fridge-key-primary mt-3" href="https://devfridge.cool">
            Fridge a token
          </a>
        </div>
      ) : null}
      {canFight ? null : null}
      {err && <p className="absolute bottom-4 right-4 z-20 text-xs text-red-300">{err}</p>}
    </div>
  );
}
