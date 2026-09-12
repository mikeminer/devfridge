import { RegistrationError } from "./registration-security";

export function liveWorkerConfigured() {
  return Boolean(process.env.WORLD_LIVE_WORKER_URL && process.env.WORLD_LIVE_SECRET && !process.env.WORLD_LIVE_WORKER);
}

export async function proxyLive(body: Record<string, unknown>, ip: string) {
  const base = process.env.WORLD_LIVE_WORKER_URL!.replace(/\/$/, "");
  const secret = process.env.WORLD_LIVE_SECRET!;
  let response: Response;
  try {
    response = await fetch(`${base}/live`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "x-forwarded-ip": ip,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new RegistrationError("Live verification worker is unreachable. Retry this move.", 503);
  }
  let data: { error?: string; retryAfter?: number } = {};
  try {
    data = await response.json();
  } catch {
    throw new RegistrationError("Live verification worker returned an invalid response.", 503);
  }
  if (!response.ok) {
    throw new RegistrationError(data.error || "Live verification is busy. Retry this move.", response.status >= 400 && response.status < 600 ? response.status : 503, data.retryAfter);
  }
  return data;
}
