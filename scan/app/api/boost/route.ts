import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { invalidateBoostChainCache, verifyBoostTransaction } from "@/lib/boost";
import { addBoost, listBoosts } from "@/lib/store";
import { fridgeForMint } from "@/lib/fridge";
import { scanMint } from "@/lib/scan";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mint?: string;
      tier?: BoostTier;
      signature?: string;
      swapSignature?: string;
      payer?: string;
    };
    const mint = parseMint(body.mint || "") || "";
    const tier = body.tier;
    const signature = body.signature?.trim() || "";
    const swapSignature = body.swapSignature?.trim() || "";
    const payer = body.payer?.trim() || "";
    if (!mint || !tier || !BOOST_TIERS[tier] || !signature || !swapSignature) {
      return NextResponse.json(
        { error: "mint, tier, swap signature and burn signature required" },
        { status: 400 }
      );
    }
    new PublicKey(mint);

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

    const verified = await verifyBoostTransaction({
      burnSignature: signature,
      swapSignature,
      mint,
      tier,
      payer: payer || undefined,
    });

    let name = mint.slice(0, 4);
    let symbol = "TKN";
    let image: string | null = null;
    try {
      const report = await scanMint(mint);
      name = report.identity.name;
      symbol = report.identity.symbol;
      image = report.identity.image;
    } catch {
      /* identity optional */
    }

    const row = {
      mint,
      name,
      symbol,
      image,
      tier,
      signature,
      payer: "",
      createdAt: verified.createdAt,
      expiresAt: verified.expiresAt,
      fridged: true,
      burned: verified.burned,
    };
    invalidateBoostChainCache();
    await addBoost(row);
    return NextResponse.json({
      ok: true,
      boost: row,
      hours: BOOST_TIERS[tier].hours,
      burned: verified.burned,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Boost failed" },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ boosts: await listBoosts() });
}
