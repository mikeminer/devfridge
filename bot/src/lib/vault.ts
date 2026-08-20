import { TRUST_ME_LEADER, TRUST_ME_VAULT } from "../config.js";

export async function vaultDetails() {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "vaultDetails", vaultAddress: TRUST_ME_VAULT }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      name?: string;
      leader?: string;
      apr?: number;
      description?: string;
    };
    return {
      ok: true as const,
      name: json.name || "TRUST ME CAPITAL",
      leader: json.leader || TRUST_ME_LEADER,
      vault: TRUST_ME_VAULT,
      apr: json.apr,
    };
  } catch {
    return {
      ok: false as const,
      name: "TRUST ME CAPITAL",
      leader: TRUST_ME_LEADER,
      vault: TRUST_ME_VAULT,
      apr: undefined as number | undefined,
    };
  }
}
