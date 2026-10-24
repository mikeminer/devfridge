import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { createRpcProxy } from './server.mjs';
import { base58Encode, canonicalIp, ipQuotaKey, readConfig, validateCall, validateTransaction } from './policy.mjs';

const ORIGIN = 'https://game.example';
const SYNTHETIC = 'SYNTHETIC_TEST_CREDENTIAL_12345';
const fixtureEndpoint = new URL(`https://rpc.example.invalid/v2/${SYNTHETIC}`);
fixtureEndpoint.searchParams.set('api-key', 'TEST_QUERY_CREDENTIAL');
const UPSTREAM = fixtureEndpoint.href;
const pubkey = byte => base58Encode(Buffer.alloc(32, byte));
const signature = base58Encode(Buffer.alloc(64, 3));
const PROGRAM = pubkey(5), MINT = pubkey(6), WALLET = pubkey(7);
const rule = { programId: PROGRAM, mint: MINT, dataSize: 105, discriminatorHex: '0102030405060708', depositorOffset: 8, mintOffset: 40 };
const baseEnv = { RPC_UPSTREAM_URL: UPSTREAM, RPC_ALLOWED_ORIGINS: ORIGIN, RPC_IP_BURST_UNITS: '1000', RPC_GLOBAL_BURST_UNITS: '1000' };
const call = (method = 'getLatestBlockhash', params = [], id = 1) => ({ jsonrpc: '2.0', id, method, params });
const tick = () => new Promise(resolve => setImmediate(resolve));
const reply = (response, payload, status = 200) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload)); };

async function listen(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
async function close(server) { if (!server.listening) return; const stopped = once(server, 'close'); server.close(); server.closeAllConnections(); await stopped; }
async function setup(t, { env = {}, upstream, clock, fetchOverride } = {}) {
  const seen = [], logs = []; let fetchCount = 0;
  const fixture = http.createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const requestCall = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    seen.push(requestCall);
    if (upstream) await upstream(requestCall, response, request);
    else reply(response, { jsonrpc: '2.0', id: requestCall.id, result: { value: 'fixture' } });
  });
  const fixtureUrl = await listen(fixture);
  const config = readConfig({ ...baseEnv, ...env });
  const server = createRpcProxy({ config, clock, logger: entry => logs.push(entry), fetchImpl: (url, options) => {
    fetchCount++;
    assert.equal(url, config.upstream, 'only the fixed server upstream may be selected');
    return fetchOverride ? fetchOverride(url, options) : fetch(fixtureUrl, options);
  } });
  const url = await listen(server);
  t.after(async () => { await close(server); await close(fixture); });
  return {
    url, seen, logs, config, fetchCount: () => fetchCount,
    async request(payload = call(), { origin = ORIGIN, headers = {}, path = '/rpc', method = 'POST', raw } = {}) {
      const response = await fetch(`${url}${path}`, { method, headers: { ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), ...(origin === null ? {} : { origin }), ...headers }, ...(method === 'POST' ? { body: raw ?? JSON.stringify(payload) } : {}) });
      const text = await response.text();
      return { status: response.status, headers: response.headers, text, body: text ? JSON.parse(text) : null };
    },
  };
}

function transaction({ signed = true, versioned = false, lookup = false, program = PROGRAM } = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const signer = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  // Two static accounts, one signer, one read-only program; one tiny instruction.
  const message = Buffer.concat([
    Buffer.from(versioned ? [128, 1, 0, 1, 2] : [1, 0, 1, 2]), signer,
    Buffer.alloc(32, program === PROGRAM ? 5 : 9), Buffer.alloc(32, 11),
    Buffer.from([1, 1, 1, 0, 1, 42]),
    ...(versioned ? [Buffer.from(lookup ? [1] : [0])] : []),
  ]);
  const bytes = Buffer.concat([Buffer.from([1]), signed ? sign(null, message, privateKey) : Buffer.alloc(64), message]);
  return bytes.toString('base64');
}
const transactionEnv = { RPC_ENABLE_SEND: 'true', RPC_ENABLE_SIMULATION: 'true', RPC_TX_PROGRAM_IDS: PROGRAM, RPC_REQUIRED_TX_PROGRAM_IDS: PROGRAM };

test('configuration fails closed without disclosing the supplied endpoint', () => {
  for (const bad of [`http://rpc.example/${SYNTHETIC}`, `https://user:${SYNTHETIC}@rpc.example/`, 'https://127.0.0.1/', 'https://[::1]/', 'https://localhost/', 'https://node.internal/', 'not a URL']) {
    assert.throws(() => readConfig({ ...baseEnv, RPC_UPSTREAM_URL: bad }), error => !error.message.includes(SYNTHETIC) && error.message.includes('server-only'));
  }
  for (const origin of ['*', `${ORIGIN}/path`, `${ORIGIN}/`, 'http://game.example', 'null']) assert.throws(() => readConfig({ ...baseEnv, RPC_ALLOWED_ORIGINS: origin }));
  assert.throws(() => readConfig({ ...baseEnv, RPC_ALLOWED_ORIGINS: '' }));
  assert.throws(() => readConfig({ ...baseEnv, RPC_ENABLE_SEND: 'true' }));
  assert.throws(() => readConfig({ ...baseEnv, RPC_METHODS: 'getEverything' }));
  assert.throws(() => readConfig({ ...baseEnv, RPC_TRUST_PROXY_IPS: '0.0.0.0/0' }));
  assert.equal(readConfig({ ...baseEnv, RPC_ALLOWED_ORIGINS: 'http://localhost:3000', RPC_ALLOW_HTTP_LOCAL_ORIGINS: 'true' }).origins.size, 1);
});

test('health is liveness only and approved reads use normalized bounded options', async t => {
  const h = await setup(t);
  const health = await h.request(null, { path: '/healthz', method: 'GET', origin: null });
  assert.deepEqual(health.body, { ok: true }); assert.equal(h.fetchCount(), 0);
  const result = await h.request(call('getLatestBlockhash', [], 'read-1'));
  assert.equal(result.status, 200); assert.equal(result.body.id, 'read-1');
  assert.equal(result.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(result.headers.get('access-control-allow-credentials'), null);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(h.seen[0].params, [{ commitment: 'confirmed' }]);
  assert.equal(h.logs[0].event, 'rpc-gateway');
  assert.ok(h.logs.every(entry => Object.keys(entry).join(',') === 'event,status,calls,durationMs'));
});

test('exact origins, content types, methods and paths cannot be used as an open relay', async t => {
  const h = await setup(t);
  for (const origin of [null, 'null', 'https://game.example.evil', 'https://evil.example']) assert.equal((await h.request(call(), { origin })).status, 403);
  assert.equal((await h.request(call(), { path: '/rpc?upstream=https://evil.example' })).status, 404);
  assert.equal((await h.request(call(), { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await h.request(call(), { headers: { 'content-encoding': 'gzip' } })).status, 415);
  assert.equal((await h.request(null, { method: 'GET' })).status, 405);
  assert.equal((await h.request({ ...call(), upstream: 'https://evil.example' })).status, 400);
  assert.equal((await h.request(call('requestAirdrop', [WALLET, 1]))).body.error.code, -32601);
  assert.equal((await h.request(call('sendTransaction', ['unused']))).body.error.code, -32601);
  assert.equal(h.fetchCount(), 0);
});

test('preflight accepts only the approved POST and content-type header', async t => {
  const h = await setup(t);
  const ok = await h.request(null, { method: 'OPTIONS', headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
  assert.equal(ok.status, 204);
  assert.equal((await h.request(null, { method: 'OPTIONS', headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization' } })).status, 403);
  assert.equal(h.fetchCount(), 0);
});

test('native/no-Origin access is explicit and has a separate method subset', async t => {
  const h = await setup(t, { env: { ...transactionEnv, RPC_ALLOW_NO_ORIGIN: 'true', RPC_NATIVE_METHODS: 'getLatestBlockhash,getSignatureStatuses' } });
  assert.equal((await h.request(call(), { origin: null })).status, 200);
  assert.equal((await h.request(call('getBalance', [WALLET]), { origin: null })).body.error.code, -32601);
  assert.equal((await h.request(call('sendTransaction', [transaction()]), { origin: null })).body.error.code, -32601);
  assert.equal(h.fetchCount(), 1);
});

test('program-account queries require one exact schema, mint, discriminator and wallet filter', async t => {
  const h = await setup(t, { env: { RPC_GPA_RULES: JSON.stringify([rule]) } });
  const filters = [{ dataSize: 105 }, { memcmp: { offset: 0, bytes: base58Encode(Buffer.from(rule.discriminatorHex, 'hex')) } }, { memcmp: { offset: 8, bytes: WALLET } }, { memcmp: { offset: 40, bytes: MINT } }];
  const good = call('getProgramAccounts', [PROGRAM, { filters, withContext: true }]);
  assert.equal((await h.request(good)).status, 200);
  assert.equal(h.seen[0].params[1].encoding, 'base64');
  for (const mutate of [
    item => { item.params[1].filters.pop(); },
    item => { item.params[1].filters[3].memcmp.bytes = pubkey(8); },
    item => { item.params[1].filters[2].memcmp.offset = 0; },
    item => { item.params[1].filters[2].memcmp.bytes = 'invalid'; },
    item => { item.params[0] = pubkey(8); },
    item => { item.params[1].dataSlice = { offset: 0, length: 10 }; },
  ]) { const value = structuredClone(good); mutate(value); assert.equal((await h.request(value)).status, 400); }
  assert.equal(h.fetchCount(), 1);
  assert.equal((await h.request(call('getTokenAccountsByOwner', [WALLET, { mint: MINT }]))).status, 200);
  assert.equal((await h.request(call('getTokenAccountsByOwner', [WALLET, { programId: PROGRAM }]))).status, 400);
});

test('invalid or duplicate batch members reject the whole batch before forwarding', async t => {
  const h = await setup(t, { env: { RPC_MAX_BATCH: '2' } });
  for (const payload of [[], [call(), call()], [call(), call('getEverything', [], 2)], [call(), call('getSlot', [], 2), call('getSlot', [], 3)], { jsonrpc: '2.0', method: 'getSlot', params: [] }]) assert.equal((await h.request(payload)).status, 400);
  assert.equal(h.fetchCount(), 0);
  const result = await h.request([call(), call('getSlot', [], 2)]);
  assert.deepEqual(result.body.map(item => item.id), [1, 2]); assert.equal(h.fetchCount(), 2);
});

test('large account and history lists, unsafe integers and unsupported options are rejected', () => {
  const config = readConfig(baseEnv);
  for (const payload of [
    call('getMultipleAccounts', [Array(65).fill(WALLET)]),
    call('getSignatureStatuses', [Array(21).fill(signature)]),
    call('getSignaturesForAddress', [WALLET, { limit: 101 }]),
    call('getLatestBlockhash', [{ minContextSlot: Number.MAX_SAFE_INTEGER + 1 }]),
    call('getLatestBlockhash', [{ commitment: 'processed' }]),
    call('getAccountInfo', [WALLET, { encoding: 'jsonParsed' }]),
    call('getMinimumBalanceForRentExemption', [16385]),
  ]) assert.throws(() => validateCall(payload, config));
  assert.equal(validateCall(call('getTransaction', [signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]), config).request.params[1].encoding, 'json');
});

test('transaction decoder verifies every send signature, static program list and full message', () => {
  const config = readConfig({ ...baseEnv, ...transactionEnv });
  for (const versioned of [false, true]) assert.ok(validateTransaction(transaction({ versioned }), config, true));
  for (const bad of [transaction({ signed: false }), transaction({ program: pubkey(9) }), transaction({ versioned: true, lookup: true }), `${transaction()}!`]) assert.throws(() => validateTransaction(bad, config, true));
  const tampered = Buffer.from(transaction(), 'base64'); tampered[tampered.length - 1] ^= 1;
  assert.throws(() => validateTransaction(tampered.toString('base64'), config, true));
  assert.throws(() => validateTransaction(Buffer.concat([Buffer.from(transaction(), 'base64'), Buffer.from([0])]).toString('base64'), config, true));
  assert.throws(() => validateTransaction(Buffer.alloc(1233).toString('base64'), config, false));
});

test('opt-in simulation and send constrain options and never treat broadcast as confirmation', async t => {
  const h = await setup(t, { env: transactionEnv, upstream: (request, response) => reply(response, { jsonrpc: '2.0', id: request.id, result: request.method === 'sendTransaction' ? signature : { value: { err: null } } }) });
  const sent = await h.request(call('sendTransaction', [transaction()]));
  assert.equal(sent.body.result, signature); assert.equal(h.fetchCount(), 1);
  assert.deepEqual(h.seen[0].params[1], { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0 });
  assert.equal((await h.request(call('simulateTransaction', [transaction({ signed: false })]))).status, 200);
  assert.equal(h.seen[1].params[1].replaceRecentBlockhash, true);
  for (const params of [{ skipPreflight: true }, { maxRetries: 3 }, { encoding: 'base58' }]) assert.equal((await h.request(call('sendTransaction', [transaction(), params]))).status, 400);
  assert.equal((await h.request(call('simulateTransaction', [transaction({ signed: false }), { sigVerify: true }]))).status, 400);
  assert.equal(h.fetchCount(), 2);
});

test('provider HTTP/errors cannot leak the endpoint, credential or body through responses or logs', async t => {
  let mode = 'http';
  const h = await setup(t, { upstream: (request, response) => {
    const secretText = `failure at ${UPSTREAM} ${SYNTHETIC} TEST_QUERY_CREDENTIAL`;
    if (mode === 'http') reply(response, { secretText }, 500);
    else reply(response, { jsonrpc: '2.0', id: request.id, error: { code: -32000, message: secretText, data: { secretText } } });
  } });
  for (mode of ['http', 'rpc']) {
    const result = await h.request();
    assert.ok(result.body.error);
    assert.ok(!result.text.includes(SYNTHETIC)); assert.ok(!result.text.includes('TEST_QUERY_CREDENTIAL')); assert.ok(!result.text.includes('rpc.example'));
  }
  assert.ok(!JSON.stringify(h.logs).includes(SYNTHETIC));
});

test('successful payloads are recursively scrubbed and malformed envelopes are rejected', async t => {
  let mode = 'result';
  const h = await setup(t, { upstream: (request, response) => reply(response, mode === 'result'
    ? { jsonrpc: '2.0', id: request.id, result: { [SYNTHETIC]: [UPSTREAM, 'TEST_QUERY_CREDENTIAL'] } }
    : { jsonrpc: '2.0', id: 999, result: null }) });
  const ok = await h.request(); assert.ok(!ok.text.includes(SYNTHETIC)); assert.ok(ok.text.includes('[redacted]'));
  mode = 'id'; assert.equal((await h.request()).body.error.code, -32001);
});

test('short credential path segments are redacted as tokens without corrupting base58-like values', async t => {
  const h = await setup(t, { env: { RPC_UPSTREAM_URL: 'https://rpc.example.invalid/v2/abc123' }, upstream: (request, response) => reply(response, {
    jsonrpc: '2.0', id: request.id, result: { fixture: 'abc123', sentence: 'key: abc123 failed', publicKeyLike: '9v2QxBabc123XY' },
  }) });
  assert.deepEqual((await h.request()).body.result, { fixture: '[redacted]', sentence: 'key: [redacted] failed', publicKeyLike: '9v2QxBabc123XY' });
});

test('upstream redirects are refused and errors have no redirect destination', async t => {
  const h = await setup(t, { upstream: (_request, response) => { response.writeHead(302, { location: `https://never-follow.example/${SYNTHETIC}` }); response.end(); } });
  const result = await h.request(); assert.equal(result.body.error.code, -32001);
  assert.equal(h.seen.length, 1); assert.ok(!result.text.includes(SYNTHETIC));
});

test('request, individual response and combined batch response byte caps are enforced', async t => {
  const h = await setup(t, { env: { RPC_MAX_BODY_BYTES: '1024', RPC_MAX_RESPONSE_BYTES: '1024' }, upstream: (request, response) => reply(response, { jsonrpc: '2.0', id: request.id, result: 'x'.repeat(request.id === 9 ? 1100 : 600) }) });
  assert.equal((await h.request(null, { raw: 'x'.repeat(1025) })).status, 413); assert.equal(h.fetchCount(), 0);
  assert.equal((await h.request(call('getSlot', [], 9))).body.error.code, -32001);
  assert.equal((await h.request([call('getSlot', [], 1), call('getSlot', [], 2)])).status, 502);
  assert.equal((await h.request(call('getSlot', [], 3))).status, 200, 'capacity releases after a rejected response');
});

test('declared response size and incorrect content type fail before data can be forwarded', async t => {
  let mode = 'length';
  const h = await setup(t, { env: { RPC_MAX_RESPONSE_BYTES: '1024' }, upstream: (_request, response) => {
    response.writeHead(200, mode === 'length' ? { 'content-type': 'application/json', 'content-length': '9999' } : { 'content-type': 'text/html' });
    response.end(`secret ${SYNTHETIC}`);
  } });
  for (mode of ['length', 'type']) { const result = await h.request(); assert.equal(result.body.error.code, -32001); assert.ok(!result.text.includes(SYNTHETIC)); }
});

test('send timeouts stay unknown and the gateway never retries a transaction', async t => {
  const h = await setup(t, { env: { ...transactionEnv, RPC_UPSTREAM_TIMEOUT_MS: '100' }, upstream: () => {} });
  const result = await h.request(call('sendTransaction', [transaction()]));
  assert.equal(result.body.error.code, -32001);
  assert.deepEqual(result.body.error.data, { outcome: 'unknown', retryable: false });
  assert.equal(h.fetchCount(), 1);
});

test('IP quotas ignore arbitrary forwarded headers and recover with controlled refill', async t => {
  let now = 0;
  const h = await setup(t, { clock: () => now, env: { RPC_IP_BURST_UNITS: '2', RPC_IP_UNITS_PER_MINUTE: '2' } });
  assert.equal((await h.request()).status, 200);
  assert.equal((await h.request(call(), { headers: { 'x-forwarded-for': '192.0.2.1', 'x-real-ip': '192.0.2.1' } })).status, 429);
  now = 60000; assert.equal((await h.request()).status, 200);
  assert.equal(h.fetchCount(), 2);
});

test('explicit trusted-edge IP headers allow per-client quotas but share a global budget', async t => {
  const h = await setup(t, { clock: () => 0, env: { RPC_TRUST_PROXY_IPS: '127.0.0.1', RPC_GLOBAL_BURST_UNITS: '4', RPC_IP_BURST_UNITS: '20' } });
  assert.equal((await h.request()).status, 400);
  assert.equal((await h.request(call(), { headers: { 'x-real-ip': '192.0.2.1, 192.0.2.2' } })).status, 400);
  for (const ip of ['192.0.2.1', '192.0.2.2']) assert.equal((await h.request(call(), { headers: { 'x-real-ip': ip } })).status, 200);
  assert.equal((await h.request(call(), { headers: { 'x-real-ip': '192.0.2.3' } })).status, 429);
});

test('a direct health probe needs no spoofable proxy client header', async t => {
  const h = await setup(t, { env: { RPC_TRUST_PROXY_IPS: '127.0.0.1' } });
  assert.deepEqual((await h.request(null, { path: '/healthz', method: 'GET', origin: null })).body, { ok: true });
  assert.equal(h.fetchCount(), 0);
});

test('IPv6 clients share a /64 quota and mapped IPv4 uses the same IPv4 identity', () => {
  assert.equal(ipQuotaKey('2001:db8:1:2::1'), ipQuotaKey('2001:db8:1:2::aaaa'));
  assert.notEqual(ipQuotaKey('2001:db8:1:2::1'), ipQuotaKey('2001:db8:1:3::1'));
  assert.equal(canonicalIp('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(canonicalIp('::ffff:7f00:1'), '127.0.0.1');
  assert.equal(canonicalIp('fe80::1%1'), null);
});

test('bounded IP registry fails closed instead of growing without limit', async t => {
  const h = await setup(t, { env: { RPC_TRUST_PROXY_IPS: '127.0.0.1', RPC_MAX_IP_ENTRIES: '10' } });
  for (let i = 1; i <= 10; i++) assert.equal((await h.request(call(), { headers: { 'x-real-ip': `192.0.2.${i}` } })).status, 200);
  assert.equal((await h.request(call(), { headers: { 'x-real-ip': '192.0.2.11' } })).status, 429);
});

test('upstream concurrency is reserved before dispatch and released after completion', async t => {
  let release, arrived;
  const reached = new Promise(resolve => { arrived = resolve; });
  const hold = new Promise(resolve => { release = resolve; });
  const h = await setup(t, { env: { RPC_MAX_UPSTREAM: '1', RPC_MAX_UPSTREAM_PER_IP: '1' }, upstream: async (request, response) => { arrived(); await hold; reply(response, { jsonrpc: '2.0', id: request.id, result: 1 }); } });
  const first = h.request(); await reached;
  assert.equal((await h.request()).status, 503); assert.equal(h.fetchCount(), 1);
  release(); assert.equal((await first).status, 200); await tick();
  assert.equal((await h.request()).status, 200); assert.equal(h.fetchCount(), 2);
});

test('a chunked upload exceeding its cap is rejected without an upstream call', async t => {
  const h = await setup(t, { env: { RPC_MAX_BODY_BYTES: '1024' } });
  const result = await new Promise((resolve, reject) => {
    const request = http.request(`${h.url}/rpc`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject); request.write('x'.repeat(800)); request.end('x'.repeat(800));
  });
  assert.equal(result, 413); assert.equal(h.fetchCount(), 0);
});

test('slow request bodies time out without occupying capacity indefinitely', async t => {
  const h = await setup(t, { env: { RPC_REQUEST_TIMEOUT_MS: '100', RPC_MAX_REQUESTS: '1' } });
  const result = await new Promise((resolve, reject) => {
    const request = http.request(`${h.url}/rpc`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject); request.write('{');
  });
  assert.equal(result, 408); assert.equal(h.fetchCount(), 0);
  assert.equal((await h.request()).status, 200);
});
