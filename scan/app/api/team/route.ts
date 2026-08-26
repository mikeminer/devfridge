import { NextRequest, NextResponse } from "next/server";
import { listTeam, upsertMember, type TeamMember } from "@/lib/team";
import { verifyAdminSignature } from "@/lib/auth";
import { PublicKey } from "@solana/web3.js";

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
    const members = await listTeam();
    return cors(NextResponse.json({ members }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      wallet?: string;
      role?: string;
      tier?: number;
      displayName?: string | null;
      avatar?: string | null;
      signature?: string;
      message?: string;
      signer?: string;
    };

    const { wallet, role, tier, displayName, avatar, signature, message, signer } = body;

    if (!wallet || !role || !tier || !signature || !message || !signer) {
      return cors(NextResponse.json({ error: "Missing required fields" }, { status: 400 }));
    }

    try {
      new PublicKey(wallet);
    } catch {
      return cors(NextResponse.json({ error: "Invalid wallet address" }, { status: 400 }));
    }

    if (![1, 2, 3, 4, 5].includes(tier)) {
      return cors(NextResponse.json({ error: "Invalid tier (must be 1-5)" }, { status: 400 }));
    }

    const valid = await verifyAdminSignature(message, signature, signer);
    if (!valid) {
      return cors(NextResponse.json({ error: "Unauthorized" }, { status: 403 }));
    }

    const member: TeamMember = {
      wallet,
      role,
      tier: tier as 1 | 2 | 3 | 4 | 5,
      displayName: displayName ?? null,
      avatar: avatar ?? null,
      addedAt: Math.floor(Date.now() / 1000),
    };

    const members = await upsertMember(member);
    return cors(NextResponse.json({ members }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
