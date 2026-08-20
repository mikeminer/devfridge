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
  const host = req.headers.get("host") || "";
  if (host.startsWith("health.")) {
    const url = req.nextUrl.clone();
    const path = url.pathname;
    if (path === "/" || path === "") {
      const accept = req.headers.get("accept") || "";
      if (accept.includes("application/json") && !accept.includes("text/html")) {
        url.pathname = "/api/health";
      } else {
        url.pathname = "/health";
      }
      return NextResponse.rewrite(url);
    }
  }

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
  matcher: ["/", "/health", "/api/badge", "/api/badge/:path*"],
};
