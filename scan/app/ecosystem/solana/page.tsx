import type { Metadata } from "next";
import { headers } from "next/headers";
import RoomPage from "@/components/ecosystem/RoomPage";
import { ECO_ORIGIN } from "@/lib/ecosystem";
import { loadEcosystemLive } from "@/lib/ecosystem-live";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Solana cold room",
  description:
    "Fridge, Scanner, Get Featured, badge, bot, and SDK. Token-2022 timelocks on Solana. $PASTA mint 39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump.",
  alternates: { canonical: `${ECO_ORIGIN}/solana` },
};

export default async function SolanaRoom() {
  const host = headers().get("host") || "";
  const live = await loadEcosystemLive();
  return (
    <RoomPage
      host={host}
      live={live}
      room="solana"
      kicker="SOLANA · COLD ROOM"
      title="Fridge it, then feature it."
      lede="Lock Token-2022 supply so a scan can prove the vault is live. Featured slots are paid, labeled, and fund a $PASTA buy-and-burn. A scan is not an audit. A token lock is not an LP lock."
    />
  );
}
