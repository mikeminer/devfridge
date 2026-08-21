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
};

const FridgeCanvas = dynamic(() => import("./FridgeCanvas"), { ssr: false });

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

  return (
    <div className="relative h-[calc(100dvh-58px)] min-h-[480px] w-full overflow-hidden bg-[#070b14]">
      {!connected || !publicKey ? (
        <Gate
          title="Enter the Fridge"
          body="Connect the wallet that locked a Token-2022. Your faction is the live lock with the highest USD value. Same mint cannot kill each other."
          cta="Connect wallet"
          onClick={() => setVisible(true)}
        />
      ) : faction === undefined ? (
        <Gate title="Reading on-chain locks…" body="Checking your Fridge vaults." />
      ) : faction === null ? (
        <Gate
          title="No live Fridge lock"
          body="Lock a Token-2022 on devfridge.cool to join its faction. Expired locks do not count."
          cta="Fridge a token"
          href="https://devfridge.cool"
        />
      ) : (
        <FridgeCanvas faction={faction} room={room} />
      )}
      {err && (
        <p className="absolute bottom-4 left-4 z-20 text-xs text-red-300">{err}</p>
      )}
    </div>
  );
}

function Gate({
  title,
  body,
  cta,
  href,
  onClick,
}: {
  title: string;
  body: string;
  cta?: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="grid h-full place-items-center px-4">
      <div className="ice-card max-w-lg p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ice">WORLD.DEVFRIDGE.COOL</p>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-mute">{body}</p>
        {cta && href && (
          <a className="fridge-key fridge-key-primary mt-5" href={href}>
            {cta}
          </a>
        )}
        {cta && onClick && (
          <button type="button" className="fridge-key fridge-key-primary mt-5" onClick={onClick}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
