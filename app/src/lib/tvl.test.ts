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
  const body = await response.json() as { error?: string; priceUsd?: number };
  assert.equal(body.priceUsd, undefined);
  assert.match(body.error ?? "", /unavailable/);
});
