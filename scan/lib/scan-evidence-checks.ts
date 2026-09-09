import type { SecurityCheck } from "./scan";
import type { verifyPoolSnapshot } from "./solana-evidence";

type Pool = ReturnType<typeof verifyPoolSnapshot>;

export function liquidityCheck(pool: Pool | null, dexStatus: "ok" | "unavailable", dexIds: string[], onCurve: boolean): SecurityCheck {
  const base = { id: "lp", label: "LP locked" };
  if (pool) {
    if (!pool.funded || pool.frozen) return { ...base, level: "caution", amount: "Restricted", detail: `PumpSwap pool verified (${pool.address}); reserves are empty or frozen. LP mint supply: ${pool.lpSupplyRaw}.` };
    if (pool.lpSupplyRaw === "0") return { ...base, level: "safe", amount: "Zero LP supply", detail: `Funded PumpSwap pool verified on-chain (${pool.address}), slot ${pool.observedSlot}. LP mint supply is zero: no outstanding LP tokens to redeem at this snapshot. This does not guarantee price, liquidity depth, or future pool state.` };
    return { ...base, level: "caution", amount: "Unverified", detail: `Funded PumpSwap pool verified on-chain (${pool.address}). LP tokens are outstanding; their lock/burn status has not been verified.` };
  }
  if (onCurve) return { ...base, level: "caution", amount: "Curve", detail: "pump.fun reports an active bonding curve; no canonical PumpSwap pool was verified." };
  if (dexIds.some(id => id.toLowerCase() !== "pumpfun")) return { ...base, level: "caution", amount: "Unverified", detail: "A market data provider reports a DEX pool. LP lock/burn status has not been verified." };
  if (dexIds.length) return { ...base, level: "caution", amount: "Curve", detail: "Only pump.fun curve liquidity was reported by the market data provider." };
  return { ...base, level: "unknown", amount: "Unknown", detail: dexStatus === "unavailable" ? "DEX data provider unavailable; liquidity absence cannot be inferred. No canonical PumpSwap pool was verified." : "The provider returned no indexed pairs and no canonical PumpSwap pool was verified. This is not proof that no liquidity exists elsewhere." };
}

/** MetadataV1 Borsh layout: isMutable follows variable strings, creators and primarySaleHappened. */
export function decodeMetaplexMetadata(buf: Buffer, expectedMint: string, keyAt: (bytes: Buffer) => string) {
  if (buf.length < 65 || buf[0] !== 4 || keyAt(buf.subarray(33, 65)) !== expectedMint) throw new Error("Invalid Metaplex metadata account");
  let offset = 65;
  const string = () => {
    if (offset + 4 > buf.length) throw new Error("Truncated metadata string");
    const length = buf.readUInt32LE(offset); offset += 4;
    if (offset + length > buf.length) throw new Error("Truncated metadata string");
    const value = buf.subarray(offset, offset + length).toString("utf8").replace(/\0/g, "").trim(); offset += length;
    return value;
  };
  const name = string(), symbol = string(), uri = string();
  if (offset + 3 > buf.length) throw new Error("Truncated metadata creators");
  offset += 2; // sellerFeeBasisPoints
  const option = buf[offset++];
  if (option === 1) {
    if (offset + 4 > buf.length) throw new Error("Truncated creator count");
    const count = buf.readUInt32LE(offset); offset += 4 + count * 34;
  } else if (option !== 0) throw new Error("Invalid creators option");
  if (offset + 2 > buf.length || buf[offset] > 1 || buf[offset + 1] > 1) throw new Error("Invalid metadata flags");
  return { name, symbol, uri, isMutable: buf[offset + 1] === 1 };
}
