import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BURN_ADDRESS, HELIUS_KEY, PASTA_MINT } from "../config.js";
import { rpc } from "./rpc.js";

export async function pastaHolders() {
  const mint = new PublicKey(PASTA_MINT);
  const largest = await rpc<{ value?: Array<{ address: string; uiAmount?: number | null; amount?: string }> }>(
    "getTokenLargestAccounts",
    [PASTA_MINT]
  );
  const rows = (largest.value ?? []).slice(0, 10);
  let supply = 0;
  try {
    const sup = await rpc<{ value?: { uiAmount?: number; amount?: string } }>("getTokenSupply", [PASTA_MINT]);
    supply = Number(sup.value?.uiAmount || 0);
  } catch {
    supply = 1_000_000_000;
  }
  const top = rows.map((r) => {
    const ui = r.uiAmount ?? (r.amount ? Number(r.amount) / 1e6 : 0);
    return { address: r.address, pct: supply > 0 ? (ui / supply) * 100 : 0, ui };
  });
  const top10 = top.reduce((s, r) => s + r.pct, 0);
  let holders: number | null = null;
  if (HELIUS_KEY) {
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccounts",
          params: { mint: PASTA_MINT, options: { showZeroBalance: false } },
        }),
        signal: AbortSignal.timeout(12000),
      });
      const json = (await res.json()) as { result?: { total?: number } };
      holders = json.result?.total ?? null;
    } catch {
      holders = null;
    }
  }
  void mint;
  return { top, top10, holders, supply };
}

export async function pastaBurns() {
  let burned = "0";
  try {
    const ata = getAssociatedTokenAddressSync(
      new PublicKey(PASTA_MINT),
      new PublicKey(BURN_ADDRESS),
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const acc = await rpc<{
      value?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } };
    }>("getAccountInfo", [ata.toBase58(), { encoding: "jsonParsed" }]);
    burned =
      acc?.value?.data?.parsed?.info?.tokenAmount?.uiAmountString ||
      "0";
  } catch {
    const byOwner = await rpc<{
      value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } } }>;
    }>("getTokenAccountsByOwner", [BURN_ADDRESS, { mint: PASTA_MINT }, { encoding: "jsonParsed" }]);
    burned = byOwner.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString || "0";
  }

  const history: Array<{ amount: string; when: number; sig: string }> = [];
  if (HELIUS_KEY) {
    try {
      const ata = getAssociatedTokenAddressSync(
        new PublicKey(PASTA_MINT),
        new PublicKey(BURN_ADDRESS),
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const res = await fetch(
        `https://api.helius.xyz/v0/addresses/${ata.toBase58()}/transactions?api-key=${HELIUS_KEY}&limit=8`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          timestamp?: number;
          signature?: string;
          tokenTransfers?: Array<{ mint?: string; tokenAmount?: number }>;
        }>;
        for (const tx of rows) {
          const t = (tx.tokenTransfers || []).find((x) => x.mint === PASTA_MINT);
          if (!t || !t.tokenAmount) continue;
          history.push({
            amount: String(t.tokenAmount),
            when: (tx.timestamp || 0) * 1000,
            sig: tx.signature || "",
          });
        }
      }
    } catch {
      /* optional */
    }
  }
  return { burned, history: history.slice(0, 5) };
}
