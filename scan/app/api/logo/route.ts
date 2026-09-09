import { NextRequest, NextResponse } from "next/server";
import { isBlockedHost, logoFetchList } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

async function fetchImage(url: string, signal: AbortSignal): Promise<NextResponse | null> {
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
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/") && type !== "application/octet-stream") return null;
  if (Number(res.headers.get("content-length")) > 8_000_000) { await res.body?.cancel(); return null; }
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 8_000_000) { await reader.cancel(); return null; }
    chunks.push(chunk.value);
  }
  if (length < 32) return null;
  const body = Buffer.concat(chunks);
  // Some gateways label JPEG/PNG bytes as octet-stream. Do not mislabel all of them as WebP.
  let imageType = type;
  if (type === "application/octet-stream") {
    imageType = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff ? "image/jpeg" :
      body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png" :
      /^GIF8[79]a$/.test(body.subarray(0, 6).toString()) ? "image/gif" :
      body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "";
    if (!imageType) return null;
  }
  return new NextResponse(body, {
    headers: {
      "content-type": imageType,
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}

export async function GET(req: NextRequest) {
  const cid = (req.nextUrl.searchParams.get("cid") ?? "").trim();
  const raw = (req.nextUrl.searchParams.get("url") ?? "").trim();
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const urls = logoFetchList(cid || undefined, raw || undefined, path);
  if (urls.length === 0) {
    return new NextResponse("missing", { status: 400 });
  }
  const controller = new AbortController();
  try {
    // A slow first gateway must not block an already available image from another gateway.
    return await new Promise<NextResponse>((resolve, reject) => {
      let remaining = urls.length;
      const failed = () => { if (--remaining === 0) reject(new Error("Image unavailable")); };
      for (const url of urls) {
        void fetchImage(url, controller.signal).then(hit => hit ? resolve(hit) : failed(), failed);
      }
    });
  } catch {
    return new NextResponse("not found", { status: 404, headers: { "cache-control": "no-store" } });
  } finally {
    controller.abort();
  }
}
