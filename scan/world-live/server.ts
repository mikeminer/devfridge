import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { initPhysics } from "../lib/topshelf/engine/core";
import { advanceLiveRun } from "../lib/topshelf/live-run";
import { cachedWorldCount } from "../lib/topshelf/live-cache";
import { RegistrationError, scoreRateLimit, unseal } from "../lib/topshelf/registration-security";
import type { RunTicket } from "../lib/topshelf/score-protocol";
import { appendLog, assertNotExcluded } from "../lib/world-compliance";

process.env.WORLD_LIVE_WORKER = "1";

const PORT = Number(process.env.PORT || 8787);

function readSecret() {
  const secret = process.env.WORLD_LIVE_SECRET || "";
  if (secret.length < 32) throw new Error("WORLD_LIVE_SECRET must be at least 32 characters");
  return secret;
}

function authorized(req: IncomingMessage) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = readSecret();
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res: ServerResponse, status: number, body: object) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(json);
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    req.on("data", (chunk) => {
      length += chunk.length;
      if (length > 512 * 1024) {
        req.destroy();
        reject(new RegistrationError("Replay too large", 413));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new RegistrationError("Invalid request");
        resolve(body);
      } catch (e) {
        reject(e instanceof RegistrationError ? e : new RegistrationError("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function handleLive(body: Record<string, unknown>, ip: string) {
  const secret = process.env.TOPSHELF_RUN_SECRET;
  if (!secret || secret.length < 32) throw new RegistrationError("Score verification is not configured.", 503);
  const live = body.action === "move" || body.action === "finish";
  if (!live) throw new RegistrationError("Unknown registration action");
  await scoreRateLimit(`ip:live:${ip}`, 1200);
  const ticket = unseal<RunTicket>(body.ticket, secret, "run");
  if (ticket.liveVersion !== 2) throw new RegistrationError("This run predates live verification. Start a new run.", 409);
  await scoreRateLimit(`live:${ticket.runId}`, 240);
  await assertNotExcluded(ticket.wallet);
  const ack = await advanceLiveRun(ticket, body);
  try {
    await appendLog(ticket.runId, { action: body.action, tick: body.tick, x: body.x, score: body.score, sequence: body.sequence });
  } catch {
    /* log is best-effort */
  }
  return ack;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      send(res, 200, { ok: true, worker: true, worlds: cachedWorldCount() });
      return;
    }
    if (req.method !== "POST" || req.url !== "/live") {
      send(res, 404, { error: "Not found" });
      return;
    }
    if (!authorized(req)) {
      send(res, 401, { error: "Unauthorized" });
      return;
    }
    const ip = String(req.headers["x-forwarded-ip"] || req.socket.remoteAddress || "local");
    const body = await readJson(req);
    send(res, 200, await handleLive(body, ip));
  } catch (e) {
    const err = e instanceof RegistrationError ? e : null;
    send(res, err?.status || 503, {
      error: err?.message || "Live verification is temporarily unavailable.",
      retryAfter: err?.retryAfter,
    });
  }
});

await initPhysics();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`world-live worker on :${PORT} worlds=${cachedWorldCount()}`);
});
