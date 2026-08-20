import { NextRequest, NextResponse } from "next/server";
import { fridgeForMint } from "@/lib/fridge";
import { fallbackBadgeSvg, renderBadgeSvg, type BadgeStyle, type BadgeTheme } from "@/lib/badge";
import { parseMint } from "@/lib/format";

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
    const fridge = await fridgeForMint(mint);
    const { svg } = renderBadgeSvg(fridge, { theme, style });
    return svgResponse(svg);
  } catch {
    return svgResponse(fallbackBadgeSvg(), 200);
  }
}
