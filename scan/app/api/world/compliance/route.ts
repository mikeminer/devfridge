import { NextRequest, NextResponse } from "next/server";
import { RegistrationError } from "@/lib/topshelf/registration-security";
import {
  adultCookieHeader,
  adultCookieValue,
  appendLog,
  assertAdult,
  EXCLUDE_OPTIONS,
  readAdultCookie,
  readLog,
  setExclusion,
  walletKey,
  exclusionOf,
} from "@/lib/world-compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function fail(e: unknown) {
  const err = e instanceof RegistrationError ? e : null;
  return NextResponse.json(
    { error: err?.message || "Player-protection service unavailable." },
    { status: err?.status || 503, headers },
  );
}

export async function GET(request: NextRequest) {
  try {
    const adult = readAdultCookie(request.headers.get("cookie"));
    const wallet = request.nextUrl.searchParams.get("wallet");
    const runId = request.nextUrl.searchParams.get("runId");
    if (runId) return NextResponse.json(await readLog(runId), { headers });
    const exclusion = wallet ? await exclusionOf(walletKey(wallet)) : null;
    return NextResponse.json(
      {
        adult,
        exclusion,
        options: EXCLUDE_OPTIONS.map(({ id, label }) => ({ id, label })),
        licensed: false,
        notice:
          "Player-protection controls on World v2. No cash prizes.",
      },
      { headers },
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const local = process.env.NODE_ENV === "development" && origin && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
    if (origin && origin !== "https://world.devfridge.cool" && origin !== "https://scan.devfridge.cool" && !local) {
      throw new RegistrationError("Invalid origin", 403);
    }
    const body = await request.json();
    if (!body || typeof body !== "object") throw new RegistrationError("Invalid request");
    if (body.action === "adult") {
      assertAdult(Number(body.year), Number(body.month), Number(body.day));
      const value = adultCookieValue();
      const res = NextResponse.json({ adult: true, licensed: false }, { headers });
      res.headers.set("Set-Cookie", adultCookieHeader(value));
      return res;
    }
    if (body.action === "exclude") {
      const wallet = walletKey(body.wallet);
      const row = await setExclusion(wallet, String(body.option || ""));
      return NextResponse.json({ exclusion: row }, { headers });
    }
    if (body.action === "log") {
      const runId = String(body.runId || "");
      if (!runId) throw new RegistrationError("runId required", 400);
      const row = await appendLog(runId, { kind: "client", note: String(body.note || "").slice(0, 200) });
      return NextResponse.json({ entry: row }, { headers });
    }
    throw new RegistrationError("Unknown action", 400);
  } catch (e) {
    return fail(e);
  }
}
