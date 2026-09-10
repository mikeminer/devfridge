import type { Metadata } from "next";
import { headers } from "next/headers";
import RoomPage from "@/components/ecosystem/RoomPage";
import { ECO_ORIGIN, TMC_RH } from "@/lib/ecosystem";
import { loadEcosystemLive } from "@/lib/ecosystem-live";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Robinhood Chain pantry",
  description: `Trust Me Capital vault, $TMC on Pons, Trust Rewards, kitchen gate. $TMC ${TMC_RH} is not a share of the vault.`,
  alternates: { canonical: `${ECO_ORIGIN}/robinhood` },
};

export default async function RobinhoodRoom() {
  const host = headers().get("host") || "";
  const live = await loadEcosystemLive();
  return (
    <RoomPage
      host={host}
      live={live}
      room="robinhood"
      kicker="ROBINHOOD CHAIN · 4663"
      title="Trade the book. Buy back the coin."
      lede="The vault lives on Hyperliquid. The coin lives on Robinhood Chain. When the recorded book is green, the team buys $TMC on Pons. No promised size. $TMC is not vault equity. Mixing the names does not mix the money."
    />
  );
}
