import { NextRequest, NextResponse } from "next/server";
import { isBlockedHost, logoFetchList } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchImage(url: string): Promise<NextResponse | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (isBlockedHost(parsed.hostname)) return null;

  const res = await fetch(url, {
    headers: { accept: "image/*,*/*;q=0.8", "user-agent": "DevFridgeScan/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/") && type !== "application/octet-stream") return null;
  const body = await res.arrayBuffer();
  if (body.byteLength < 32 || body.byteLength > 8_000_000) return null;
  return new NextResponse(body, {
    headers: {
      "content-type": type.startsWith("image/") ? type : "image/webp",
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "access-control-allow-origin": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const cid = (req.nextUrl.searchParams.get("cid") ?? "").trim();
  const raw = (req.nextUrl.searchParams.get("url") ?? "").trim();
  const urls = logoFetchList(cid || undefined, raw || undefined);
  if (urls.length === 0) {
    return new NextResponse("missing", { status: 400 });
  }
  for (const url of urls) {
    try {
      const hit = await fetchImage(url);
      if (hit) return hit;
    } catch {
      /* next gateway */
    }
  }
  return new NextResponse("not found", { status: 404 });
}
