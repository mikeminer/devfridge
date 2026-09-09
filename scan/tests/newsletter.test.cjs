// Exercise the published handler with isolated, in-memory providers. No email is sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../app/api/world/subscribe/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(options = {}) {
  const calls = { redis: 0, paragraph: [] };
  const exports = {};
  const env = { NODE_ENV: 'production', PARAGRAPH_API_KEY: 'test-key', KV_REST_API_URL: 'https://redis.invalid', KV_REST_API_TOKEN: 'test-token', ...options.env };
  class ParagraphAPI {
    constructor({ apiKey }) { assert.equal(apiKey, 'test-key'); }
    subscribers = { create: async data => {
      calls.paragraph.push(data);
      if (options.throwSdk) throw new Error('private provider error');
      return { success: options.success !== false };
    } };
  }
  vm.runInNewContext(compiled, {
    exports, process: { env }, Buffer, Response, URL, AbortSignal,
    require: name => name === '@paragraph-com/sdk' ? { ParagraphAPI } : require(name),
    fetch: async (url, init) => {
      calls.redis++;
      assert.equal(url, 'https://redis.invalid');
      assert.equal(init.headers.Authorization, 'Bearer test-token');
      const command = JSON.parse(init.body);
      assert.equal(command[0], 'EVAL');
      assert.match(command[1], /EXPIRE/);
      assert.match(command[3], /^world:newsletter:[a-f0-9]{64}$/);
      return Response.json(options.redisBody ?? { result: options.count ?? 1 }, { status: options.redisStatus ?? 200 });
    },
  });
  const send = (body = { email: ' reader@example.com ', consent: true }, headers = {}) => exports.POST(new Request('https://world.devfridge.cool/api/world/subscribe', {
    method: 'POST', headers: { origin: 'https://world.devfridge.cool', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
  return { calls, send };
}

test('newsletter sends trimmed email only after consent and distributed rate check', async () => {
  const h = harness(), res = await h.send();
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { success: true });
  assert.equal(h.calls.redis, 1); assert.equal(h.calls.paragraph.length, 1);
  assert.equal(h.calls.paragraph[0].email, 'reader@example.com');
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
for (const [name, body, headers, status] of [
  ['cross-origin request', undefined, { origin: 'https://unrelated.example' }, 403],
  ['unsupported content type', '{}', { 'content-type': 'text/plain' }, 415],
  ['malformed JSON', '{', {}, 400],
  ['array body', [], {}, 400],
  ['missing consent', { email: 'reader@example.com' }, {}, 400],
  ['invalid email', { email: 'not-an-email', consent: true }, {}, 400],
  ['honeypot', { email: 'reader@example.com', consent: true, website: 'spam' }, {}, 400],
  ['oversized body', JSON.stringify({ padding: 'x'.repeat(2100) }), {}, 413],
]) test(`newsletter rejects ${name} before provider calls`, async () => {
  const h = harness(), res = await h.send(body, headers);
  assert.equal(res.status, status); assert.equal(h.calls.redis, 0); assert.equal(h.calls.paragraph.length, 0);
});
test('newsletter returns unavailable when production configuration is missing', async () => {
  const h = harness({ env: { PARAGRAPH_API_KEY: undefined } }); assert.equal((await h.send()).status, 503); assert.equal(h.calls.redis, 0);
});
test('newsletter refuses submission when Redis fails or returns an invalid counter', async () => {
  for (const options of [{ redisStatus: 503 }, { redisBody: { error: 'failed' } }, { redisBody: { result: '1' } }]) {
    const h = harness(options); assert.equal((await h.send()).status, 503); assert.equal(h.calls.paragraph.length, 0);
  }
});
test('newsletter rate limit prevents a Paragraph call and sets retry time', async () => {
  const h = harness({ count: 6 }), res = await h.send();
  assert.equal(res.status, 429); assert.equal(res.headers.get('retry-after'), '600'); assert.equal(h.calls.paragraph.length, 0);
});
test('newsletter never reports success on SDK failure or exposes private provider errors', async () => {
  for (const options of [{ success: false }, { throwSdk: true }]) {
    const h = harness(options), res = await h.send();
    assert.equal(res.status, 502); assert.deepEqual(await res.json(), { success: false });
  }
});
