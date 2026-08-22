import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, extractWallet, QUEST_HANDLERS } from "@/lib/zealy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: { message: string }, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!verifyApiKey(apiKey)) {
    return json({ message: "Unauthorized" }, 401);
  }

  const quest = req.nextUrl.searchParams.get("quest") || "";
  const handler = QUEST_HANDLERS[quest];
  if (!handler) {
    return json(
      { message: `Unknown quest "${quest}". Valid: ${Object.keys(QUEST_HANDLERS).join(", ")}` },
      400
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ message: "Invalid JSON body" }, 400);
  }

  const wallet = extractWallet(body);
  if (!wallet) {
    return json(
      { message: "No valid Solana wallet found. Please connect your wallet on Zealy first." },
      400
    );
  }

  try {
    const result = await handler(wallet);
    return json({ message: result.message }, result.ok ? 200 : 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return json({ message: `Server error: ${msg}` }, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-api-key",
    },
  });
}
