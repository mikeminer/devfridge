import { NextRequest, NextResponse } from "next/server";
import { getTeamConfig, setTeamConfig } from "@/lib/team";
import { verifyAdminSignature } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(res: NextResponse): NextResponse {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type");
  res.headers.set("cache-control", "public, s-maxage=10, stale-while-revalidate=30");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type");
  return res;
}

export async function GET() {
  try {
    const config = await getTeamConfig();
    return cors(NextResponse.json(config));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      applicationsOpen?: boolean;
      signature?: string;
      message?: string;
      signer?: string;
    };

    const { applicationsOpen, signature, message, signer } = body;

    if (typeof applicationsOpen !== "boolean" || !signature || !message || !signer) {
      return cors(NextResponse.json({ error: "Missing required fields" }, { status: 400 }));
    }

    const valid = await verifyAdminSignature(message, signature, signer);
    if (!valid) {
      return cors(NextResponse.json({ error: "Unauthorized" }, { status: 403 }));
    }

    const config = await setTeamConfig({ applicationsOpen });
    return cors(NextResponse.json(config));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
