import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { buildBoostBurn, pastaBoughtInSwap } from "@/lib/boost";
import { fridgeForMint } from "@/lib/fridge";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mint?: string;
      tier?: BoostTier;
      payer?: string;
      swapSignature?: string;
    };
    const mint = parseMint(body.mint || "");
    const tier = body.tier;
    const payer = body.payer?.trim() || "";
    const swapSignature = body.swapSignature?.trim() || "";
    if (!mint || !tier || !BOOST_TIERS[tier] || !payer || !swapSignature) {
      return NextResponse.json(
        { error: "mint, tier, payer and swapSignature required" },
        { status: 400 }
      );
    }
    new PublicKey(payer);

    const fridge = await fridgeForMint(mint);
    if (fridge.status !== "fridged") {
      return NextResponse.json(
        {
          error: "Only fridged tokens can be boosted. Lock supply on devfridge.cool first.",
          cta: "https://devfridge.cool/",
        },
        { status: 400 }
      );
    }

    const amount = await pastaBoughtInSwap(swapSignature, payer);
    const built = await buildBoostBurn({
      payer: new PublicKey(payer),
      mint,
      tier,
      amount,
    });
    return NextResponse.json({
      ok: true,
      step: "burn",
      ...built,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not build $PASTA burn" },
      { status: 502 }
    );
  }
}
