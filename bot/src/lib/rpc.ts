import { rpcUrl } from "../config.js";

export async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const urls = [rpcUrl(), "https://api.mainnet-beta.solana.com"];
  const errors: string[] = [];
  for (const url of [...new Set(urls)]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
      });
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (!res.ok || json.error) {
        errors.push(json.error?.message || String(res.status));
        continue;
      }
      return json.result as T;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(errors[0] || "RPC failed");
}
