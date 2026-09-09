const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const cid = 'bafybeihrg76loei43i5mgv3hpu44ndnjededrnawsoi5z4f4txuvgh5kam';
function loadFile(file, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require, URL, URLSearchParams, Buffer, AbortController, AbortSignal, ...extra });
  return exports;
}
const logo = loadFile('../lib/logo.ts');
test('stored proxy URLs remain idempotent and invalidate old failures', () => {
  const source = `/api/logo?cid=${cid}`;
  assert.equal(logo.publicLogoUrl(source), `${source}&v=2`);
  assert.equal(logo.publicLogoUrl(logo.publicLogoUrl(source)), `${source}&v=2`);
});
test('IPFS paths survive metadata rewriting and every gateway fallback', () => {
  for (const source of [`ipfs://${cid}/images/logo.png`, `ipfs://ipfs/${cid}/images/logo.png`, `https://ipfs.io/ipfs/${cid}/images/logo.png`, `https://${cid}.ipfs.dweb.link/images/logo.png`]) {
    const publicUrl = new URL(logo.publicLogoUrl(source), 'https://scan.devfridge.cool');
    assert.equal(publicUrl.searchParams.get('cid'), cid);
    assert.equal(publicUrl.searchParams.get('path'), '/images/logo.png');
    assert.ok(logo.rewriteUri(source).endsWith(`${cid}/images/logo.png`));
    assert.ok(logo.logoFetchList(undefined, source).every(url => url.endsWith(`${cid}/images/logo.png`)));
  }
});
test('legacy CID requests work and paths cannot replace the gateway host', () => {
  assert.equal(logo.logoFetchList(cid).length, 4);
  assert.equal(logo.logoFetchList(cid, undefined, '//private/path').length, 0);
  assert.equal(logo.logoFetchList(cid, undefined, '/x?url=other').length, 0);
  assert.equal(logo.publicLogoUrl(null), null);
  assert.equal(logo.publicLogoUrl('javascript:alert(1)'), null);
  assert.equal(logo.publicLogoUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.ok(logo.publicLogoUrl('https://example.com/logo.png').startsWith('/api/logo?url='));
});
function route(fetcher) {
  return loadFile('../app/api/logo/route.ts', { fetch: fetcher, require: name => name === '@/lib/logo' ? logo : require(name) }).GET;
}
const request = query => ({ nextUrl: new URL(`https://scan.devfridge.cool/api/logo?${query}`) });
const jpeg = Buffer.alloc(40); jpeg[0] = 255; jpeg[1] = 216; jpeg[2] = 255;
test('a slow first gateway does not delay a successful second gateway; losers abort', async () => {
  const signals = [];
  const get = route(async (_url, options) => {
    signals.push(options.signal);
    if (signals.length === 2) return new Response(jpeg, { headers: { 'content-type': 'application/octet-stream' } });
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  });
  const response = await get(request(`cid=${cid}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.equal((await response.arrayBuffer()).byteLength, 40);
  assert.ok(signals.every(signal => signal.aborted));
});
test('failed images are not cached and unsupported octet-stream bytes are rejected', async () => {
  const get = route(async () => new Response(Buffer.alloc(40), { headers: { 'content-type': 'application/octet-stream' } }));
  const response = await get(request(`cid=${cid}`));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('bad MIME, oversized content, and blocked hosts cannot win the race', async () => {
  for (const headers of [{ 'content-type': 'text/html' }, { 'content-type': 'image/png', 'content-length': '9000000' }]) {
    assert.equal((await route(async () => new Response(jpeg, { headers }))(request(`cid=${cid}`))).status, 404);
  }
  let fetched = false;
  const response = await route(async () => { fetched = true; throw Error('should not fetch'); })(request('url=https://127.0.0.1/logo.png'));
  assert.equal(response.status, 404);
  assert.equal(fetched, false);
});
test('source paths reach the gateway and declared JPEG keeps its MIME', async () => {
  const seen = [];
  const get = route(async url => { seen.push(url); return new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } }); });
  assert.equal((await get(request(`cid=${cid}&path=${encodeURIComponent('/images/logo.jpg')}`))).status, 200);
  assert.ok(seen.every(url => url.endsWith('/images/logo.jpg')));
});
