import { NextRequest, NextResponse } from "next/server";
import { fridgeForMint } from "@/lib/fridge";
import { fallbackBadgeSvg, renderBadgeSvg, type BadgeStyle, type BadgeTheme } from "@/lib/badge";
import { parseMint } from "@/lib/format";
import { rpc } from "@/lib/rpc";
import { tokenTicker } from "@/lib/ticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function svgResponse(svg: string, status = 200) {
  return new NextResponse(svg, {
    status,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      "access-control-allow-origin": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const mint = parseMint(req.nextUrl.searchParams.get("mint") || "");
  const theme = (req.nextUrl.searchParams.get("theme") === "light" ? "light" : "dark") as BadgeTheme;
  const style = (req.nextUrl.searchParams.get("style") === "compact" ? "compact" : "full") as BadgeStyle;

  if (!mint) {
    return svgResponse(fallbackBadgeSvg(), 400);
  }

  try {
    const [fridge, supplyInfo, ticker] = await Promise.all([
      fridgeForMint(mint),
      rpc<{ value?: { amount?: string; decimals?: number } }>("getTokenSupply", [mint]).catch(
        () => null
      ),
      tokenTicker(mint).catch(() => ""),
    ]);
    const { svg } = renderBadgeSvg(fridge, {
      theme,
      style,
      supply: supplyInfo?.value?.amount ?? null,
      decimals: supplyInfo?.value?.decimals ?? 6,
      ticker,
      mint,
    });
    return svgResponse(svg);
  } catch {
    return svgResponse(fallbackBadgeSvg(), 200);
  }
}
