import type { Metadata } from "next";
import { headers } from "next/headers";
import EcosystemHome from "@/components/ecosystem/EcosystemHome";
import { ECO_ORIGIN } from "@/lib/ecosystem";
import { loadEcosystemLive } from "@/lib/ecosystem-live";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "DevFridge ecosystem — the kitchen map" },
  description:
    "Interactive kitchen map of DevFridge on Solana and Robinhood Chain. Live locks, burns, and identities with timestamps.",
  alternates: { canonical: ECO_ORIGIN },
};

export default async function EcosystemPage({
  searchParams,
}: {
  searchParams?: { node?: string };
}) {
  const host = headers().get("host") || "";
  const live = await loadEcosystemLive();
  return <EcosystemHome host={host} live={live} initialNode={searchParams?.node} />;
}
