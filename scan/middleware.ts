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
  const path = req.nextUrl.pathname;
  if (/\.(glb|gltf|png|jpg|jpeg|webp|svg|ico|txt|xml)$/i.test(path)) {
    return NextResponse.next();
  }

  if (host.startsWith("world.")) {
    const url = req.nextUrl.clone();
    if (path === "/" || path === "") url.pathname = "/world";
    else if (
      !path.startsWith("/world") &&
      !path.startsWith("/api") &&
      !path.startsWith("/_next")
    ) {
      url.pathname = `/world${path}`;
    }
    return NextResponse.rewrite(url);
  }

  if (host.startsWith("docs.")) {
    const url = req.nextUrl.clone();
    if (path === "/" || path === "") url.pathname = "/docs";
    else if (
      !path.startsWith("/docs") &&
      !path.startsWith("/api") &&
      !path.startsWith("/_next") &&
      path !== "/sitemap.xml" &&
      path !== "/robots.txt" &&
      path !== "/llms.txt"
    ) {
      url.pathname = `/docs${path}`;
    }
    return NextResponse.rewrite(url);
  }

  if (host.startsWith("sdk.")) {
    const url = req.nextUrl.clone();
    if (path === "/" || path === "") url.pathname = "/sdk";
    else if (
      !path.startsWith("/sdk") &&
      !path.startsWith("/api") &&
      !path.startsWith("/_next") &&
      path !== "/sitemap.xml" &&
      path !== "/robots.txt" &&
      path !== "/llms.txt"
    ) {
      url.pathname = `/sdk${path}`;
    }
    return NextResponse.rewrite(url);
  }

  if (host.startsWith("health.") || host.startsWith("connect.")) {
    const url = req.nextUrl.clone();
    if (path === "/" || path === "") {
      const accept = req.headers.get("accept") || "";
      if (host.startsWith("health.") && accept.includes("application/json") && !accept.includes("text/html")) {
        url.pathname = "/api/health";
      } else {
        url.pathname = host.startsWith("connect.") ? "/connect" : "/health";
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
