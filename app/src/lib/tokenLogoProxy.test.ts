import assert from "node:assert/strict";
import test from "node:test";
import handler from "../../api/token-logo.ts";

const mint = "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";
const cid = "bafkreifkepifavrrghorfikmifkraaj6jcjxvfwrsqlied77cnzkaluxra";
const image = () => new Response(Uint8Array.from([255,216,255,224,1,2,3,4]), {headers:{"content-type":"application/octet-stream"}});

test("Pump.fun recovers a logo while IPFS requests stall and cancels the losers", async t => {
  const calls: string[] = [];
  let aborted = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push(url);
    if (url.startsWith("https://images.pump.fun/")) return image();
    return new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => {aborted++;reject(new Error("aborted"));}, {once:true});
    });
  });
  const res = await handler(new Request(`https://devfridge.cool/api/token-logo?cid=${cid}&mint=${mint}`));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
  assert.ok(calls[0].includes(`/coin-image/${mint}`));
  assert.equal(aborted, 4);
  assert.ok((await res.arrayBuffer()).byteLength > 0);
});

test("mint-only recovery works when metadata contains no image", async t => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, `https://images.pump.fun/coin-image/${mint}?variant=256x256`);
    return image();
  });
  assert.equal((await handler(new Request(`https://devfridge.cool/api/token-logo?mint=${mint}`))).status, 200);
});

test("failed logos are not cached; JSON is never served as an image", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response('{"image":"missing"}', {headers:{"content-type":"application/json"}}));
  const res = await handler(new Request(`https://devfridge.cool/api/token-logo?cid=${cid}`));
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("proxy rejects lookalike domains and redirects outside its allowlist", async t => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return new Response(null, {status:302, headers:{location:"https://127.0.0.1/private"}});
  });
  const bad = await handler(new Request("https://devfridge.cool/api/token-logo?url=https://evilw3s.link/logo.png"));
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
  const redirected = await handler(new Request("https://devfridge.cool/api/token-logo?url=https://images.pump.fun/logo.png"));
  assert.equal(redirected.status, 404);
  assert.deepEqual(calls, ["https://images.pump.fun/logo.png"]);
});
