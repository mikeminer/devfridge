import assert from "node:assert/strict";
import test from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { LockAccount } from "./fridge";
import { fetchTvl } from "./tvl";
import handler, { spotUsd } from "../../api/pump-price";

const mint = "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";
function lock(amount: bigint, unlockAt: number, token = mint): LockAccount {
  return { mint: new PublicKey(token), amount, unlockAt } as LockAccount;
}

test("Pump.fun TVL includes unlisted tokens and recalculates changed or expired locks", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, `/api/pump-price?mint=${mint}`);
    calls++;
    return Response.json({ priceUsd: 0.0000036 });
  });
  const now = Math.floor(Date.now() / 1000);
  assert.equal((await fetchTvl([])).totalUsd, 0);
  const result = await fetchTvl([
    lock(100_000_000_000000n, now + 3600),
    lock(20_000_000_000000n, now + 3600),
    lock(50_000_000_000000n, now),
  ]);
  assert.equal(result.totalUsd, 432);
  assert.equal(result.byMint.get(mint)?.amount, 120_000_000);
  assert.equal((await fetchTvl([lock(10_000_000_000000n, now + 3600)])).totalUsd, 36);
  assert.equal((await fetchTvl([lock(10_000_000_000000n, now - 1)])).totalUsd, 0);
  assert.equal(calls, 1);
});

test("missing prices reject the total and are retried instead of cached as zero", async (t) => {
  const token = "CvjWYRkV7iFftU8PKsa7Lyyz7hhWKTj6nG1rk2mMpump";
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async () => {
    attempts++;
    return attempts === 1 ? new Response("unavailable", { status: 502 }) : Response.json({ priceUsd: 0.000003 });
  });
  const locks = [lock(500_000_000000n, Math.floor(Date.now() / 1000) + 3600, token)];
  await assert.rejects(fetchTvl(locks), /unavailable/);
  assert.equal((await fetchTvl(locks)).totalUsd, 1.5);
  assert.equal(attempts, 2);
});

test("Alchemy USD price is what the closed door shows", async (t) => {
  const previous = process.env.VITE_ALCHEMY_API_KEY;
  process.env.VITE_ALCHEMY_API_KEY = "test-key-1234567890";
  t.after(() => {
    if (previous == null) delete process.env.VITE_ALCHEMY_API_KEY;
    else process.env.VITE_ALCHEMY_API_KEY = previous;
  });
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    assert.equal(
      url,
      "https://api.g.alchemy.com/prices/v1/test-key-1234567890/tokens/by-address",
    );
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      addresses: [{ network: "solana-mainnet", address: mint }],
    });
    return Response.json({
      data: [{
        network: "solana-mainnet",
        address: mint,
        prices: [{ currency: "usd", value: "0.0000036", lastUpdatedAt: "2026-11-04T00:00:00Z" }],
        error: null,
      }],
    });
  });
  const result = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${mint}`));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { mint, priceUsd: 0.0000036, source: "alchemy" });
  assert.equal((await handler(new Request("https://devfridge.cool/api/pump-price?mint=invalid"))).status, 400);
});

test("a missing Alchemy price does not become zero dollars", async (t) => {
  const previous = process.env.VITE_ALCHEMY_API_KEY;
  process.env.VITE_ALCHEMY_API_KEY = "test-key-1234567890";
  t.after(() => {
    if (previous == null) delete process.env.VITE_ALCHEMY_API_KEY;
    else process.env.VITE_ALCHEMY_API_KEY = previous;
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({
    data: [{ address: mint, prices: [], error: "Token not found" }],
  }));
  const response = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${mint}`));
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json() as { error?: string; reason?: string; priceUsd?: number };
  assert.equal(body.priceUsd, undefined);
  assert.equal(body.reason, "missing");
  assert.match(body.error ?? "", /unavailable/);
});

const SOL = new PublicKey("So11111111111111111111111111111111111111112");
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const PUMP = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_AMM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SOL_POOL = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const PASTA_POOL = "5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5";

function rpcAccount(owner: string, data: Buffer) {
  return { owner, executable: false, lamports: 1, data: [data.toString("base64"), "base64"] as [string, string] };
}

function mintData(decimals: number): Buffer {
  const data = Buffer.alloc(82);
  data[44] = decimals;
  data[45] = 1;
  return data;
}

function tokenData(mint: PublicKey, owner: PublicKey, amount: bigint): Buffer {
  const data = Buffer.alloc(165);
  mint.toBuffer().copy(data, 0);
  owner.toBuffer().copy(data, 32);
  data.writeBigUInt64LE(amount, 64);
  return data;
}

test("effective reserves become the dollar spot", () => {
  const exact = spotUsd(1_000_000_000_000n, 6, 2_000_000_000n, 9, 100);
  assert.ok(exact != null && Math.abs(exact - 0.0002) < 1e-12);
  const live = 26734741677 / 1e9 / (698657004084379 / 1e6) * 92.75330444988012;
  const priced = spotUsd(698657004084379n, 6, 26734741677n, 9, 92.75330444988012);
  assert.ok(priced);
  assert.ok(Math.abs(priced - live) / live < 1e-8);
  assert.equal(spotUsd(1n, 6, 0n, 9, 1), null);
});

test("Alchemy RPC reserves price a PumpSwap pool and a bonding curve", async (t) => {
  const previous = process.env.VITE_ALCHEMY_API_KEY;
  process.env.VITE_ALCHEMY_API_KEY = "test-key-1234567890";
  t.after(() => {
    if (previous == null) delete process.env.VITE_ALCHEMY_API_KEY;
    else process.env.VITE_ALCHEMY_API_KEY = previous;
  });
  const curveMint = "CvjWYRkV7iFftU8PKsa7Lyyz7hhWKTj6nG1rk2mMpump";
  const quotedMint = "BTCxVi7u6DSKbRohALwMay2i4PDsiejKqoSmMDeWpump";
  const [pastaCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()], PUMP,
  );
  const [curveAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), new PublicKey(curveMint).toBuffer()], PUMP,
  );
  const [quotedCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), new PublicKey(quotedMint).toBuffer()], PUMP,
  );
  const baseVault = Keypair.generate().publicKey;
  const quoteVault = Keypair.generate().publicKey;
  const solCoin = Keypair.generate().publicKey;
  const solPc = Keypair.generate().publicKey;
  const poolData = Buffer.alloc(261);
  Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]).copy(poolData, 0);
  new PublicKey(mint).toBuffer().copy(poolData, 43);
  SOL.toBuffer().copy(poolData, 75);
  baseVault.toBuffer().copy(poolData, 139);
  quoteVault.toBuffer().copy(poolData, 171);
  poolData.writeBigUInt64LE(1_000_000_000n, 245);
  const solPool = Buffer.alloc(752);
  solPool.writeBigUInt64LE(1n, 0);
  solCoin.toBuffer().copy(solPool, 336);
  solPc.toBuffer().copy(solPool, 368);
  SOL.toBuffer().copy(solPool, 400);
  USDC.toBuffer().copy(solPool, 432);
  const curveData = Buffer.alloc(49);
  Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(curveData, 0);
  curveData.writeBigUInt64LE(1_000_000_000_000n, 8);
  curveData.writeBigUInt64LE(2_000_000_000n, 16);
  const quotedCurveData = Buffer.alloc(115);
  Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(quotedCurveData, 0);
  quotedCurveData.writeBigUInt64LE(1_000_000_000_000n, 8);
  quotedCurveData.writeBigUInt64LE(2_000_000_000n, 16);
  new PublicKey(mint).toBuffer().copy(quotedCurveData, 83);

  const serve = (requested: string) => {
    const pool = new PublicKey(PASTA_POOL);
    if (requested === mint) return rpcAccount(TOKEN, mintData(6));
    if (requested === curveMint) return rpcAccount(TOKEN, mintData(6));
    if (requested === quotedMint) return rpcAccount(TOKEN, mintData(6));
    if (requested === PASTA_POOL) return rpcAccount(PUMP_AMM.toBase58(), poolData);
    if (requested === SOL_POOL) return rpcAccount("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", solPool);
    if (requested === baseVault.toBase58()) return rpcAccount(TOKEN, tokenData(new PublicKey(mint), pool, 1_000_000_000_000n));
    if (requested === quoteVault.toBase58()) return rpcAccount(TOKEN, tokenData(SOL, pool, 1_000_000_000n));
    if (requested === solCoin.toBase58()) return rpcAccount(TOKEN, tokenData(SOL, solCoin, 1_000_000_000_000n));
    if (requested === solPc.toBase58()) return rpcAccount(TOKEN, tokenData(USDC, solPc, 100_000_000_000n));
    if (requested === curveAddress.toBase58()) return rpcAccount(PUMP.toBase58(), curveData);
    if (requested === quotedCurve.toBase58()) return rpcAccount(PUMP.toBase58(), quotedCurveData);
    return null;
  };

  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/tokens/by-address")) {
      return Response.json({ data: [{ address: mint, prices: [], error: "Token not found" }] });
    }
    assert.equal(u, "https://solana-mainnet.g.alchemy.com/v2/test-key-1234567890");
    const body = JSON.parse(String(init?.body)) as { method?: string; params?: [string[], { encoding?: string }] };
    assert.equal(body.method, "getMultipleAccounts");
    assert.equal(body.params?.[1]?.encoding, "base64");
    const keys = body.params?.[0] ?? [];
    if (keys[2] === mint && keys[3] === SOL_POOL) {
      assert.deepEqual(keys, [PASTA_POOL, pastaCurve.toBase58(), mint, SOL_POOL]);
    }
    return Response.json({ result: { value: keys.map((key) => serve(key)) } });
  });

  const pool = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${mint}`));
  assert.equal(pool.status, 200);
  const poolBody = await pool.json() as { mint?: string; priceUsd?: number; source?: string };
  assert.equal(poolBody.mint, mint);
  assert.equal(poolBody.source, "alchemy-rpc");
  assert.ok(poolBody.priceUsd != null && Math.abs(poolBody.priceUsd - 0.0002) < 1e-12);

  const curve = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${curveMint}`));
  assert.equal(curve.status, 200);
  const curveBody = await curve.json() as { mint?: string; priceUsd?: number; source?: string };
  assert.equal(curveBody.mint, curveMint);
  assert.equal(curveBody.source, "alchemy-rpc");
  assert.ok(curveBody.priceUsd != null && Math.abs(curveBody.priceUsd - 0.0002) < 1e-12);

  const quoted = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${quotedMint}`));
  assert.equal(quoted.status, 200);
  const quotedBody = await quoted.json() as { mint?: string; priceUsd?: number; source?: string };
  assert.equal(quotedBody.mint, quotedMint);
  assert.equal(quotedBody.source, "alchemy-rpc");
  assert.ok(quotedBody.priceUsd != null && Math.abs(quotedBody.priceUsd - 0.0000004) < 1e-12);

  curveData[48] = 1;
  const finished = await handler(new Request(`https://devfridge.cool/api/pump-price?mint=${curveMint}`));
  assert.equal(finished.status, 502);
  const finishedBody = await finished.json() as { priceUsd?: number; reason?: string };
  assert.equal(finishedBody.priceUsd, undefined);
  assert.equal(finishedBody.reason, "missing");
});
