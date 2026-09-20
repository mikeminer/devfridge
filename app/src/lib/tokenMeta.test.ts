import assert from "node:assert/strict";
import test from "node:test";
import { fallbackGlyph, imageCandidates, remainingLabel, rewriteUri } from "./tokenMeta.ts";

test("rewrites ipfs and arweave uris", () => {
  assert.equal(rewriteUri("ipfs://abc"), "https://w3s.link/ipfs/abc");
  assert.equal(
    rewriteUri("https://ipfs.io/ipfs/abc"),
    "https://w3s.link/ipfs/abc"
  );
  assert.equal(rewriteUri("ar://xyz"), "https://arweave.net/xyz");
  assert.equal(rewriteUri("https://cdn.example/logo.png"), "https://cdn.example/logo.png");
});

test("image candidates prefer same-origin proxy", () => {
  const list = imageCandidates(
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  );
  assert.ok(list[0].startsWith("/api/token-logo?cid="));
});

test("fallback glyph", () => {
  assert.equal(fallbackGlyph("PASTA"), "PA");
  assert.equal(fallbackGlyph("$PASTA"), "PA");
});

test("logos use the mint-aware proxy and Pump.fun when IPFS is unavailable", () => {
  const mint = "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";
  const cid = "bafkreifkepifavrrghorfikmifkraaj6jcjxvfwrsqlied77cnzkaluxra";
  const list = imageCandidates(`ipfs://${cid}`, mint);
  assert.ok(list[0].includes(`mint=${mint}`));
  assert.ok(list[0].includes("v=2"));
  assert.equal(list[1], `https://images.pump.fun/coin-image/${mint}?variant=256x256&ipfs=${cid}`);
  assert.equal(imageCandidates(null, mint)[0], `/api/token-logo?mint=${mint}&v=2`);
  assert.deepEqual(imageCandidates(null, "invalid/mint"), []);
  assert.deepEqual(imageCandidates("/local.png", mint), ["/local.png"]);
});

test("remaining label", () => {
  assert.equal(remainingLabel(100, 100), "Ready");
  assert.equal(remainingLabel(100 + 3661, 100), "1h 1m");
});
