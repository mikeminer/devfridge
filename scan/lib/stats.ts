import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, LOCK_DISC, LOCK_ACCOUNT_SIZE, BOOST_VAULT_SEED, PASTA_MINT, BURN_ADDRESS } from "./constants";
import { rpc } from "./rpc";
import { decodeLock } from "./fridge";

export type ProtocolStats = {
  /** Total number of lock accounts currently on-chain (active + expired unclaimed). */
  lockCount: number;
  /** Unique depositor wallets. */
  depositors: number;
  /** Unique mints locked. */
  mints: number;
  /** Active locks (unlock_at still in future). */
  activeLocks: number;
  /** Total SOL in the boost vault (lamports). */
  boostVaultLamports: number;
  /** Total $PASTA burned (ui amount string). */
  pastaBurned: string | null;
  /** $PASTA price in USD. */
  pastaPrice: number | null;
  /** Timestamp of this snapshot. */
  ts: number;
};

let cached: { at: number; value: ProtocolStats } | null = null;
const TTL = 60_000; // 1 minute cache

export async function protocolStats(): Promise<ProtocolStats> {
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const now = Math.floor(Date.now() / 1000);

  // 1. Fetch all lock accounts
  const rows = await rpc<
    Array<{ pubkey: string; account: { data: [string, string] } }>
  >("getProgramAccounts", [
    PROGRAM_ID,
    {
      encoding: "base64",
      commitment: "confirmed",
      filters: [{ dataSize: LOCK_ACCOUNT_SIZE }],
    },
  ]).catch(() => [] as Array<{ pubkey: string; account: { data: [string, string] } }>);

  const locks = (rows || [])
    .map((row) => {
      const raw = Uint8Array.from(Buffer.from(row.account.data[0], "base64"));
      return decodeLock(row.pubkey, raw);
    })
    .filter((x) => x != null);

  const depositorSet = new Set(locks.map((l) => l!.depositor));
  const mintSet = new Set(locks.map((l) => l!.mint));
  const activeLocks = locks.filter((l) => l!.unlockAt > now).length;

  // 2. Boost vault balance
  let boostVaultLamports = 0;
  try {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(BOOST_VAULT_SEED)],
      new PublicKey(PROGRAM_ID)
    );
    const info = await rpc<{ value?: { lamports?: number } | null }>(
      "getAccountInfo",
      [vaultPda.toBase58(), { encoding: "base64" }]
    );
    boostVaultLamports = info?.value?.lamports ?? 0;
  } catch {
    boostVaultLamports = 0;
  }

  // 3. PASTA burned
  let pastaBurned: string | null = null;
  try {
    const acc = await rpc<{
      value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } } }>;
    }>("getTokenAccountsByOwner", [
      BURN_ADDRESS,
      { mint: PASTA_MINT },
      { encoding: "jsonParsed" },
    ]);
    pastaBurned = (acc.value ?? [])[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? null;
  } catch {
    pastaBurned = null;
  }

  // 4. PASTA price
  let pastaPrice: number | null = null;
  try {
    const res = await fetch(
      `https://api.jup.ag/price/v2?ids=${PASTA_MINT}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const j = (await res.json()) as { data?: Record<string, { price?: string }> };
      pastaPrice = Number(j.data?.[PASTA_MINT]?.price ?? 0) || null;
    }
  } catch {
    pastaPrice = null;
  }

  const value: ProtocolStats = {
    lockCount: locks.length,
    depositors: depositorSet.size,
    mints: mintSet.size,
    activeLocks,
    boostVaultLamports,
    pastaBurned,
    pastaPrice,
    ts: Date.now(),
  };

  cached = { at: Date.now(), value };
  return value;
}
