import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { verifyWalletSignature, zealyMessage } from "@/lib/zealy";
import { addZealyLog } from "@/lib/store";
import { parseMint } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = ["fridge-check"];

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const wallet = (body.wallet as string)?.trim() || "";
  const mintRaw = (body.mint as string)?.trim() || "";
  const action = (body.action as string)?.trim() || "";
  const signature = (body.signature as string)?.trim() || "";

  if (!wallet || !mintRaw || !action || !signature) {
    return json({ error: "Missing wallet, mint, action, or signature" }, 400);
  }

  if (!ALLOWED_ACTIONS.includes(action)) {
    return json({ error: `Unknown action: ${action}` }, 400);
  }

  try {
    new PublicKey(wallet);
  } catch {
    return json({ error: "Invalid wallet address" }, 400);
  }

  const mint = parseMint(mintRaw);
  if (!mint) {
    return json({ error: "Invalid mint address" }, 400);
  }

  const message = zealyMessage(action, mint);
  if (!verifyWalletSignature(wallet, message, signature)) {
    return json({ error: "Signature verification failed" }, 400);
  }

  await addZealyLog(wallet, action, mint);

  return json({ ok: true, message: `Action "${action}" logged for wallet.` }, 200);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
