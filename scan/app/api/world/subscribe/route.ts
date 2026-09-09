import { ParagraphAPI } from "@paragraph-com/sdk";
import { createHmac } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function reply(status: number, success = false) {
  return Response.json({ success }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "600" } : {}) } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const local = process.env.NODE_ENV !== "production" && origin === new URL(request.url).origin;
  if (origin !== "https://world.devfridge.cool" && !local) return reply(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply(415);
  if (Number(request.headers.get("content-length") || 0) > 2048) return reply(413);

  let body;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 2048) return reply(413);
    body = JSON.parse(text);
  } catch { return reply(400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400);
  if (body.website) return reply(400);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (body.consent !== true || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400);

  const apiKey = process.env.PARAGRAPH_API_KEY;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!apiKey || !kvUrl || !kvToken) return reply(503);

  try {
    // Distributed limit; only a keyed IP hash is retained in Redis, for 10 minutes.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const identity = createHmac("sha256", apiKey).update(ip).digest("hex");
    const limit = await fetch(kvUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 600); end; return n", 1, `world:newsletter:${identity}`]),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!limit.ok) return reply(503);
    const count = await limit.json();
    if (count.error || !Number.isInteger(count.result) || count.result < 1) return reply(503);
    if (count.result > 5) return reply(429);

    const api = new ParagraphAPI({ apiKey });
    const result = await api.subscribers.create({ email });
    return result.success === true ? reply(200, true) : reply(502);
  } catch {
    // Never log subscriber addresses, API keys, or raw provider errors.
    return reply(502);
  }
}
