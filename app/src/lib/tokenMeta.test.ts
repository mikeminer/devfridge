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

test("remaining label", () => {
  assert.equal(remainingLabel(100, 100), "Ready");
  assert.equal(remainingLabel(100 + 3661, 100), "1h 1m");
});
