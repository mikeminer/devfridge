import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { BOOST_TIERS, TREASURY, type BoostTier } from "@/lib/constants";
import { connection } from "@/lib/rpc";
import { addBoost, listBoosts } from "@/lib/store";
import { fridgeForMint } from "@/lib/fridge";
import { scanMint } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mint?: string;
      tier?: BoostTier;
      signature?: string;
    };
    const mint = body.mint?.trim() || "";
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

    const conn = connection();
    const tx = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx || tx.meta?.err) {
      return NextResponse.json({ error: "Boost transaction not confirmed" }, { status: 400 });
    }

    const expected = Math.round(BOOST_TIERS[tier].sol * 1_000_000_000);
    const keys = tx.transaction.message.getAccountKeys();
    let treasuryIdx: number | null = null;
    for (let i = 0; i < keys.length; i++) {
      if (keys.get(i)?.toBase58() === TREASURY) {
        treasuryIdx = i;
        break;
      }
    }
    if (treasuryIdx === null) {
      return NextResponse.json({ error: "Treasury was not paid" }, { status: 400 });
    }
    const pre = tx.meta?.preBalances?.[treasuryIdx] ?? 0;
    const post = tx.meta?.postBalances?.[treasuryIdx] ?? 0;
    if (post - pre < expected * 0.98) {
      return NextResponse.json({ error: "Boost amount too low" }, { status: 400 });
    }

    const payer = keys.get(0)?.toBase58() || "";
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
    const now = Date.now();
    const row = {
      mint,
      name,
      symbol,
      image,
      tier,
      signature,
      payer,
      createdAt: now,
      expiresAt: now + BOOST_TIERS[tier].hours * 3600 * 1000,
      fridged: fridge.status === "fridged",
    };
    await addBoost(row);
    return NextResponse.json({ ok: true, boost: row });
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
