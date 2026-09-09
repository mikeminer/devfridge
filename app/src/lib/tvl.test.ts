import assert from "node:assert/strict";
import test from "node:test";
import { PublicKey } from "@solana/web3.js";
import type { LockAccount } from "./fridge";
import { fetchTvl } from "./tvl";
import handler from "../../api/pump-price";

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

test("server converts Pump.fun raw supply to whole tokens and validates upstream data", async (t) => {
  let payload: unknown = { mint, usd_market_cap: 3600, total_supply: 1_000_000_000_000000 };
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, `https://frontend-api-v3.pump.fun/coins/${mint}`);
    return Response.json(payload);
  });
  const request = () => new Request(`https://devfridge.cool/api/pump-price?mint=${mint}`);
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { mint, priceUsd: 0.0000036, source: "pump.fun" });
  for (const invalid of [
    { mint, usd_market_cap: 3600, total_supply: 0 },
    { mint, total_supply: 1_000_000 },
    { mint: "wrong", usd_market_cap: 3600, total_supply: 1_000_000 },
  ]) {
    payload = invalid;
    const response = await handler(request());
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await handler(new Request("https://devfridge.cool/api/pump-price?mint=invalid"))).status, 400);
});
