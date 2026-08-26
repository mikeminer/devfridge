import { NextRequest, NextResponse } from "next/server";
import { removeMember } from "@/lib/team";
import { verifyAdminSignature } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(res: NextResponse): NextResponse {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "DELETE, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "DELETE, OPTIONS");
  res.headers.set("access-control-allow-headers", "content-type");
  return res;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const body = (await req.json()) as {
      signature?: string;
      message?: string;
      signer?: string;
    };

    const { signature, message, signer } = body;
    if (!signature || !message || !signer) {
      return cors(NextResponse.json({ error: "Missing auth fields" }, { status: 400 }));
    }

    const valid = await verifyAdminSignature(message, signature, signer);
    if (!valid) {
      return cors(NextResponse.json({ error: "Unauthorized" }, { status: 403 }));
    }

    const members = await removeMember(params.wallet);
    return cors(NextResponse.json({ members }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return cors(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
