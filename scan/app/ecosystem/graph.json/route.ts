import { NextResponse } from "next/server";
import {
  ASSETS,
  ECO_ORIGIN,
  FLOWS,
  INTEGRITY,
  NODES,
  PASTA_MINT,
  PROGRAM_ID,
  SYNAPSE_BRIEF,
} from "@/lib/ecosystem";
import { loadEcosystemLive } from "@/lib/ecosystem-live";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const live = await loadEcosystemLive();
  const body = {
    name: "DevFridge ecosystem",
    url: ECO_ORIGIN,
    tagline: "Too many tokens? Fridge them.",
    rule: "Ticker ≠ identity. Network + full address required.",
    pasta: PASTA_MINT,
    program: PROGRAM_ID,
    nodes: NODES,
    assets: ASSETS,
    flows: FLOWS,
    integrity: INTEGRITY,
    live: {
      synapseAt: live.synapseAt,
      coldRoomOk: live.coldRoomOk,
      health: live.health?.status ?? null,
      gauges: live.gauges,
    },
    sources: {
      synapse: SYNAPSE_BRIEF,
      health: "https://health.devfridge.cool/api/health",
      stats: "https://scan.devfridge.cool/api/stats",
      connect: "https://connect.devfridge.cool",
      docs: "https://docs.devfridge.cool",
    },
  };
  return NextResponse.json(body, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
