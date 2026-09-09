import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export const RESERVE_PROGRAMS = {
  pump: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  pumpswap: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  raydiumV4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  raydiumCpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  raydiumClmm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  orca: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  meteoraDlmm: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
};
const key = (v: string) => new PublicKey(v);
const discriminator = (name: string) => createHash("sha256").update("account:" + name).digest().subarray(0, 8);
export const raydiumAuthority = (cpmm = false) => PublicKey.findProgramAddressSync(
  [Buffer.from(cpmm ? "vault_and_lp_mint_auth_seed" : "amm authority")],
  key(cpmm ? RESERVE_PROGRAMS.raydiumCpmm : RESERVE_PROGRAMS.raydiumV4));
export const curveAddress = (mint: string) => PublicKey.findProgramAddressSync(
  [Buffer.from("bonding-curve"), key(mint).toBuffer()], key(RESERVE_PROGRAMS.pump))[0].toBase58();

export type Reserve = { protocol: "pump_curve" | "pumpswap" | "raydium_v4" | "raydium_cpmm" | "raydium_clmm" | "orca_whirlpool" | "meteora_dlmm";
  address: string; vault: string; authority: string; mint: string };
export type RawReserveAccount = { owner: string; executable: boolean; data: [string, string] };
export type TokenRow = { pubkey: string; account: RawReserveAccount };
export type TokenSnapshot = { context: { slot: number }; value: TokenRow[] };
type Rpc = <T>(method: string, params: unknown[]) => Promise<T>;
export type ReserveCoverage = { reserves: Reserve[]; unclassifiedCustody?: string[]; classificationSlot: number;
  pumpStage: "bonding_curve" | "completed_curve" | "not_detected" };

/** Program-owned state binds each reserve to its mint, pool and spending authority.
 * Layout references and limits: integrations/holders/README.md. No ticker or DEX API labels are trusted.
 */
export function decodeReserveState(address: string, account: RawReserveAccount, mint: string, tokenProgram: string): Reserve[] {
  if (account.executable || account.data[1] !== "base64") throw new Error("Invalid program state");
  const d = Buffer.from(account.data[0], "base64");
  const at = (offset: number) => { if (offset + 32 > d.length) throw new Error("Truncated state"); return new PublicKey(d.subarray(offset, offset + 32)); };
  const reserve = (protocol: Reserve["protocol"], vault: string, authority: string): Reserve => ({ protocol, address, vault, authority, mint });
  if (account.owner === RESERVE_PROGRAMS.pump) {
    if (address !== curveAddress(mint)) return [];
    if (d.length < 49 || !d.subarray(0, 8).equals(discriminator("BondingCurve")) || d[48] > 1) throw new Error("Invalid bonding curve");
    // Actual SPL balance is used later. Virtual reserves are never token balances.
    return [reserve("pump_curve", getAssociatedTokenAddressSync(key(mint), key(address), true, key(tokenProgram)).toBase58(), address)];
  }
  if (account.owner === RESERVE_PROGRAMS.pumpswap) {
    if (!d.subarray(0, 8).equals(discriminator("Pool"))) return [];
    if (d.length < 211) throw new Error("Truncated PumpSwap pool");
    const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from("pool"), d.subarray(9, 11), at(11).toBuffer(), at(43).toBuffer(), at(75).toBuffer()], key(account.owner));
    if (pda.toBase58() !== address || bump !== d[8]) throw new Error("Invalid PumpSwap PDA");
    const side = at(43).toBase58() === mint ? 139 : at(75).toBase58() === mint ? 171 : null;
    if (side === null) return [];
    const vault = at(side).toBase58();
    if (vault !== getAssociatedTokenAddressSync(key(mint), key(address), true, key(tokenProgram)).toBase58()) throw new Error("Invalid PumpSwap ATA");
    return [reserve("pumpswap", vault, address)];
  }
  if (account.owner === RESERVE_PROGRAMS.raydiumV4) {
    if (d.length !== 752 || d.readBigUInt64LE(0) === 0n || d.readBigUInt64LE(0) > 7n) throw new Error("Invalid Raydium V4 state");
    const [authority, bump] = raydiumAuthority();
    if (d.readBigUInt64LE(8) !== BigInt(bump)) throw new Error("Invalid Raydium authority nonce");
    const side = at(400).toBase58() === mint ? 336 : at(432).toBase58() === mint ? 368 : null;
    return side === null ? [] : [reserve("raydium_v4", at(side).toBase58(), authority.toBase58())];
  }
  if (account.owner === RESERVE_PROGRAMS.raydiumCpmm) {
    if (!d.subarray(0, 8).equals(discriminator("PoolState"))) return [];
    if (d.length < 637) throw new Error("Truncated Raydium CPMM pool");
    const [authority, bump] = raydiumAuthority(true);
    if (d[328] !== bump) throw new Error("Invalid CPMM authority nonce");
    const side = at(168).toBase58() === mint ? 0 : at(200).toBase58() === mint ? 1 : null;
    if (side === null) return [];
    if (at(232 + side * 32).toBase58() !== tokenProgram) throw new Error("Invalid CPMM token program");
    const vault = at(72 + side * 32).toBase58();
    const derived = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), key(address).toBuffer(), key(mint).toBuffer()], key(account.owner))[0];
    if (derived.toBase58() !== vault) throw new Error("Invalid CPMM vault PDA");
    return [reserve("raydium_cpmm", vault, authority.toBase58())];
  }
  if (account.owner === RESERVE_PROGRAMS.raydiumClmm) {
    if (!d.subarray(0, 8).equals(discriminator("PoolState"))) return [];
    if (d.length < 273) throw new Error("Truncated Raydium CLMM pool");
    const side = at(73).toBase58() === mint ? 137 : at(105).toBase58() === mint ? 169 : null;
    if (side === null) return [];
    const vault = at(side).toBase58();
    const derived = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), key(address).toBuffer(), key(mint).toBuffer()], key(account.owner))[0];
    if (derived.toBase58() !== vault) throw new Error("Invalid CLMM vault PDA");
    return [reserve("raydium_clmm", vault, address)];
  }
  if (account.owner === RESERVE_PROGRAMS.orca) {
    if (!d.subarray(0, 8).equals(discriminator("Whirlpool"))) return [];
    if (d.length < 653) throw new Error("Truncated Whirlpool");
    const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from("whirlpool"), at(8).toBuffer(), at(101).toBuffer(), at(181).toBuffer(), d.subarray(43, 45)], key(account.owner));
    if (pda.toBase58() !== address || bump !== d[40]) throw new Error("Invalid Whirlpool PDA");
    const side = at(101).toBase58() === mint ? 133 : at(181).toBase58() === mint ? 213 : null;
    return side === null ? [] : [reserve("orca_whirlpool", at(side).toBase58(), address)];
  }
  if (account.owner === RESERVE_PROGRAMS.meteoraDlmm) {
    if (!d.subarray(0, 8).equals(discriminator("LbPair"))) return [];
    if (d.length < 216) throw new Error("Truncated DLMM pool");
    const side = at(88).toBase58() === mint ? 152 : at(120).toBase58() === mint ? 184 : null;
    if (side === null) return [];
    const vault = at(side).toBase58();
    const derived = PublicKey.findProgramAddressSync([key(address).toBuffer(), key(mint).toBuffer()], key(account.owner))[0];
    if (derived.toBase58() !== vault) throw new Error("Invalid DLMM reserve PDA");
    return [reserve("meteora_dlmm", vault, address)];
  }
  return [];
}

/** Discover pool state from token-account authorities, including noncanonical/secondary pools
 * and arbitrary quote mints. Shared Raydium authorities need mint-filtered pool-state queries.
 */
export async function collectProtocolReserves(rpc: Rpc, snapshot: TokenSnapshot, mint: string, tokenProgram: string, fridgeAuthorities: string[]): Promise<ReserveCoverage> {
  const curve = curveAddress(mint), skip = new Set(fridgeAuthorities), authorities = new Set<string>();
  const accounts = new Map<string, { owner: string; amount: bigint }>();
  const mintKey = key(mint), ownerIsCurve = new Map<string, boolean>();
  for (const row of snapshot.value) {
    const d = Buffer.from(row.account.data[0], "base64");
    if (![109, 165].includes(d.length) || row.account.owner !== tokenProgram || !new PublicKey(d.subarray(0, 32)).equals(mintKey)) throw new Error("Invalid token snapshot");
    const amount = d.readBigUInt64LE(64);
    if (amount === 0n) continue;
    const owner = new PublicKey(d.subarray(32, 64)).toBase58();
    if (!ownerIsCurve.has(owner)) ownerIsCurve.set(owner, PublicKey.isOnCurve(d.subarray(32, 64)));
    accounts.set(row.pubkey, { owner, amount });
    if (amount > 0n && !skip.has(owner) && !ownerIsCurve.get(owner)) authorities.add(owner);
  }
  authorities.add(curve);
  const known = new Map<string, Reserve>(), shared = [raydiumAuthority()[0].toBase58(), raydiumAuthority(true)[0].toBase58()];
  const unclassifiedCustody: string[] = [];
  let slot = snapshot.context.slot, pumpStage: ReserveCoverage["pumpStage"] = "not_detected";
  const accept = (reserve: Reserve) => {
    const held = accounts.get(reserve.vault);
    if (!held || held.amount === 0n) return;
    if (held.owner !== reserve.authority) throw new Error("Reserve authority mismatch");
    const prior = known.get(reserve.vault);
    if (prior && (prior.address !== reserve.address || prior.protocol !== reserve.protocol)) throw new Error("Ambiguous reserve");
    known.set(reserve.vault, reserve);
  };
  const keys = [...authorities].filter(a => !shared.includes(a));
  // Sequential batches bound provider concurrency; missing reads fail closed.
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    const response = await rpc<{ context: { slot: number }; value: (RawReserveAccount | null)[] }>("getMultipleAccounts", [batch, {
      encoding: "base64", commitment: "confirmed", minContextSlot: snapshot.context.slot,
    }]);
    if (!Number.isSafeInteger(response.context.slot) || response.context.slot < snapshot.context.slot || response.value.length !== batch.length) throw new Error("Incomplete protocol lookup");
    slot = Math.max(slot, response.context.slot);
    response.value.forEach((raw, index) => {
      if (!raw) return;
      if (!Object.values(RESERVE_PROGRAMS).includes(raw.owner)) return;
      const decoded = decodeReserveState(batch[index], raw, mint, tokenProgram);
      if (batch[index] === curve && decoded.some(r => r.protocol === "pump_curve")) pumpStage = Buffer.from(raw.data[0], "base64")[48] ? "completed_curve" : "bonding_curve";
      decoded.forEach(accept);
    });
  }
  for (const [index, program, offsets] of [[0, RESERVE_PROGRAMS.raydiumV4, [400, 432]], [1, RESERVE_PROGRAMS.raydiumCpmm, [168, 200]]] as const) {
    if (!authorities.has(shared[index])) continue;
    const responses = await Promise.all(offsets.map(offset => rpc<TokenSnapshot>("getProgramAccounts", [program, {
      encoding: "base64", commitment: "confirmed", withContext: true, minContextSlot: snapshot.context.slot,
      filters: [...(index === 0 ? [{ dataSize: 752 }] : []), { memcmp: { offset, bytes: mint } }],
    }])));
    for (const response of responses) {
      if (!Number.isSafeInteger(response.context.slot) || response.context.slot < snapshot.context.slot || !Array.isArray(response.value)) throw new Error("Incomplete Raydium lookup");
      slot = Math.max(slot, response.context.slot);
      for (const row of response.value) {
        if (row.account.owner !== program) throw new Error("Incorrect pool program");
        decodeReserveState(row.pubkey, row.account, mint, tokenProgram).forEach(accept);
      }
    }
    // Shared authorities can also receive unsolicited deposits into unrelated token accounts.
    // Keep these in ownership and expose the uncertainty; never invent a pool binding.
    for (const [address, held] of accounts) if (held.amount > 0n && held.owner === shared[index] && !known.has(address)) unclassifiedCustody.push(address);
  }
  return { reserves: [...known.values()], unclassifiedCustody, classificationSlot: slot, pumpStage };
}
