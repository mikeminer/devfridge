import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { buildProgramBoostTx } from "@/lib/boost";
import { fridgeForMint } from "@/lib/fridge";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { mint?: string; tier?: BoostTier; payer?: string };
    const mint = parseMint(body.mint || "");
    const tier = body.tier;
    const payer = body.payer?.trim() || "";
    if (!mint || !tier || !BOOST_TIERS[tier] || !payer) {
      return NextResponse.json({ error: "mint, tier and payer required" }, { status: 400 });
    }
    new PublicKey(payer);

    const fridge = await fridgeForMint(mint);
    const now = Math.floor(Date.now() / 1000);
    const live = fridge.locks.find((l) => l.unlockAt > now);
    if (fridge.status !== "fridged" || !live) {
      return NextResponse.json(
        {
          error: "Only fridged tokens can be boosted. Lock supply on devfridge.cool first.",
          cta: "https://devfridge.cool/",
        },
        { status: 400 }
      );
    }

    const built = await buildProgramBoostTx({
      payer: new PublicKey(payer),
      mint,
      tier,
      lock: live,
    });
    return NextResponse.json({
      ok: true,
      ...built,
      hours: BOOST_TIERS[tier].hours,
      sol: BOOST_TIERS[tier].sol,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not build on-chain $PASTA boost" },
      { status: 502 }
    );
  }
}
