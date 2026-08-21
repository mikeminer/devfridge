import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { PublicKey } from "@solana/web3.js";
import { BOOST_TIERS, type BoostTier } from "@/lib/constants";
import { invalidateBoostChainCache, runCrankBuyback, verifyBoostTransaction } from "@/lib/boost";
import { addBoost, listBoosts } from "@/lib/store";
import { fridgeForMint } from "@/lib/fridge";
import { tokenIdentity } from "@/lib/identity";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mint?: string;
      tier?: BoostTier;
      signature?: string;
    };
    const mint = parseMint(body.mint || "") || "";
    const tier = body.tier;
    const signature = body.signature?.trim() || "";
    if (!mint || !tier || !BOOST_TIERS[tier] || !signature) {
      return NextResponse.json({ error: "mint, tier and signature required" }, { status: 400 });
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

    const [verified, ident] = await Promise.all([
      verifyBoostTransaction({ signature, mint }),
      tokenIdentity(mint).catch(() => ({
        name: mint.slice(0, 4),
        symbol: "TKN",
        image: null as string | null,
      })),
    ]);

    const row = {
      mint,
      name: ident.name,
      symbol: ident.symbol,
      image: ident.image,
      tier: verified.tier || tier,
      signature,
      payer: verified.payer || "",
      createdAt: verified.createdAt,
      expiresAt: verified.expiresAt,
      fridged: true,
    };
    invalidateBoostChainCache();
    await addBoost(row);
    waitUntil(runCrankBuyback().then(() => undefined, () => undefined));
    return NextResponse.json({
      ok: true,
      boost: row,
      hours: BOOST_TIERS[tier].hours,
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
