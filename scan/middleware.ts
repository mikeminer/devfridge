import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const LIMIT = 100;
const hits = new Map<string, { n: number; t: number }>();

function ipOf(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/badge")) {
    return NextResponse.next();
  }
  const ip = ipOf(req);
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return NextResponse.next();
  }
  row.n += 1;
  if (row.n > LIMIT) {
    return new NextResponse("rate limited", {
      status: 429,
      headers: { "retry-after": "60" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/badge"],
};
