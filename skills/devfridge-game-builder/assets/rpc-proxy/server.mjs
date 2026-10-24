import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { canonicalIp, ipQuotaKey, PolicyError, readConfig, validateCall } from './policy.mjs';

const envelope = (id, code, message, data) => ({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function readBody(request, limit, timeoutMs) {
  return new Promise((resolveBody, reject) => {
    let bytes = 0, done = false; const chunks = [];
    const finish = (error, result) => {
      if (done) return; done = true; clearTimeout(timer);
      request.off('data', data); request.off('end', end); request.off('aborted', aborted); request.off('error', aborted);
      if (error) { request.pause(); reject(error); } else resolveBody(result);
    };
    const data = chunk => { bytes += chunk.length; if (bytes > limit) finish(new PolicyError(-32010, 'Request body is too large.')); else chunks.push(chunk); };
    const end = () => finish(null, Buffer.concat(chunks).toString('utf8'));
    const aborted = () => finish(new PolicyError(-32011, 'Request body was interrupted.'));
    const timer = setTimeout(() => finish(new PolicyError(-32011, 'Request body timed out.')), timeoutMs);
    timer.unref(); request.on('data', data); request.on('end', end); request.on('aborted', aborted); request.on('error', aborted);
  });
}

function redactor(upstream) {
  const url = new URL(upstream);
  const secrets = new Set([upstream, ...url.searchParams.values(), ...url.pathname.split('/').filter(Boolean)]);
  for (const value of [...secrets]) {
    secrets.add(encodeURIComponent(value));
    try { secrets.add(decodeURIComponent(value)); } catch { /* A malformed escape stays opaque. */ }
  }
  const values = [...secrets].filter(value => value.length > 0).sort((a, b) => b.length - a.length).map(value => ({
    value,
    // Short route prefixes such as /v2 must not corrupt an unrelated base58 key.
    // Still suppress a short credential as a complete token/string in results.
    boundary: value.length < 8 ? new RegExp(`(?<![A-Za-z0-9_-])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_-])`, 'g') : null,
  }));
  return result => {
    let nodes = 0;
    const visit = (value, depth = 0) => {
      if (++nodes > 50000 || depth > 48) throw Error('Invalid upstream data.');
      if (typeof value === 'string') { for (const secret of values) value = secret.boundary ? value.replace(secret.boundary, '[redacted]') : value.split(secret.value).join('[redacted]'); return value; }
      if (Array.isArray(value)) return value.map(item => visit(item, depth + 1));
      if (plainObject(value)) {
        const out = Object.create(null);
        for (const [key, item] of Object.entries(value)) out[visit(key, depth + 1)] = visit(item, depth + 1);
        return out;
      }
      return value;
    };
    return visit(result);
  };
}

function bucket(capacity, now) { return { tokens: capacity, last: now }; }
function refill(state, capacity, rate, now) {
  state.tokens = Math.min(capacity, state.tokens + Math.max(0, now - state.last) * rate / 60000); state.last = now;
}

/** Network dependencies are injectable for local tests only; no request can select them. */
export function createRpcProxy({ config = readConfig(), fetchImpl = fetch, clock = () => performance.now(), logger = () => {} } = {}) {
  const ips = new Map(); const global = bucket(config.globalBurst, clock());
  let requests = 0, upstreamActive = 0, nextCleanup = 0;
  const scrub = redactor(config.upstream);
  const emit = event => { try { logger(event); } catch { /* A logger must not alter request outcome. */ } };
  function stateFor(ip, now) {
    if (now >= nextCleanup) {
      for (const [key, value] of ips) if (!value.active && !value.upstream && now - value.used > 120000) ips.delete(key);
      nextCleanup = now + 30000;
    }
    if (!ips.has(ip)) {
      if (ips.size >= config.maxIpEntries) return null;
      ips.set(ip, { ...bucket(config.ipBurst, now), active: 0, upstream: 0, used: now });
    }
    const state = ips.get(ip); state.used = now; return state;
  }
  function consume(state, amount, now) {
    refill(global, config.globalBurst, config.globalRate, now);
    refill(state, config.ipBurst, config.ipRate, now);
    if (global.tokens < amount || state.tokens < amount) return false;
    global.tokens -= amount; state.tokens -= amount; return true;
  }
  async function forward(call, connectionSignal) {
    const timed = AbortSignal.timeout(config.upstreamTimeoutMs);
    const signal = AbortSignal.any([timed, connectionSignal]);
    const unknown = call.method === 'sendTransaction' ? { outcome: 'unknown', retryable: false } : undefined;
    try {
      const response = await fetchImpl(config.upstream, {
        method: 'POST', redirect: 'error', credentials: 'omit', signal,
        headers: { 'content-type': 'application/json', accept: 'application/json', 'accept-encoding': 'identity' },
        body: JSON.stringify(call),
      });
      if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw Error(); }
      const declared = response.headers.get('content-length');
      if (declared && (!/^\d+$/.test(declared) || Number(declared) > config.maxResponseBytes)) { await response.body?.cancel(); throw Error(); }
      if (!response.body) throw Error();
      const reader = response.body.getReader();
      // Fixed storage also bounds memory if an upstream emits many tiny chunks.
      const bytes = Buffer.allocUnsafe(config.maxResponseBytes); let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          if (size + value.byteLength > config.maxResponseBytes) { await reader.cancel(); throw Error(); }
          bytes.set(value, size); size += value.byteLength;
        }
      } finally { reader.releaseLock(); }
      const payload = JSON.parse(bytes.toString('utf8', 0, size));
      if (!plainObject(payload) || payload.jsonrpc !== '2.0' || payload.id !== call.id || (Object.hasOwn(payload, 'result') === Object.hasOwn(payload, 'error'))) throw Error();
      if (Object.hasOwn(payload, 'error')) {
        const code = Number.isSafeInteger(payload.error?.code) ? payload.error.code : -32002;
        // Never return a provider's error message/data/body, even on HTTP 200.
        return envelope(call.id, code, 'The upstream RPC could not complete this request.', unknown);
      }
      return { jsonrpc: '2.0', id: call.id, result: scrub(payload.result) };
    } catch {
      return envelope(call.id, -32001, 'RPC is temporarily unavailable. Check status before retrying a transaction.', unknown);
    }
  }

  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: config.requestTimeoutMs, headersTimeout: config.requestTimeoutMs }, async (request, response) => {
    const started = clock(); let state, admitted = false, reserved = 0, callCount = 0, mayHaveSent = false;
    const connection = new AbortController();
    response.on('close', () => { if (!response.writableFinished) connection.abort(); });
    const respond = (status, body, extra = {}) => {
      if (response.destroyed || response.writableEnded) return;
      const encoded = status === 204 ? '' : JSON.stringify(body);
      response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra });
      response.end(encoded);
      if (status >= 400 && !request.complete) response.once('finish', () => request.destroy());
    };
    try {
      const peer = canonicalIp(request.socket.remoteAddress); if (!peer) return respond(403, { error: 'Client address unavailable.' });
      let client = peer;
      const health = request.method === 'GET' && request.url === '/healthz';
      if (!health && config.trustedProxies.has(peer)) {
        // A configured edge must overwrite X-Real-IP and prevent direct public access.
        const forwarded = request.headers['x-real-ip'];
        if (typeof forwarded !== 'string' || !canonicalIp(forwarded)) return respond(400, { error: 'Invalid proxy client address.' });
        client = canonicalIp(forwarded);
      }
      state = stateFor(ipQuotaKey(client), started);
      if (!state || !consume(state, 1, started)) return respond(429, { error: 'Request budget exceeded.' }, { 'retry-after': '60' });
      if (requests >= config.maxRequests || state.active >= config.maxRequestsPerIp) return respond(503, { error: 'Request capacity reached.' }, { 'retry-after': '1' });
      requests++; state.active++; admitted = true;
      if (health) return respond(200, { ok: true });
      if (request.url !== '/rpc') return respond(404, { error: 'Not found.' });
      const origin = request.headers.origin;
      const native = origin === undefined;
      if (typeof origin !== 'string' && !native) return respond(403, { error: 'Origin is not allowed.' });
      if (native ? !config.allowNative : !config.origins.has(origin)) return respond(403, { error: 'Origin is not allowed.' });
      if (!native) { response.setHeader('access-control-allow-origin', origin); response.setHeader('vary', 'Origin'); }
      if (request.method === 'OPTIONS') {
        const wantedHeaders = String(request.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(item => item.trim()).filter(Boolean);
        if (native || request.headers['access-control-request-method'] !== 'POST' || wantedHeaders.some(header => header !== 'content-type')) return respond(403, { error: 'Preflight is not permitted.' });
        return respond(204, null, { 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '300' });
      }
      if (request.method !== 'POST') return respond(405, { error: 'Use POST.' }, { allow: 'POST, OPTIONS' });
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '') || request.headers['content-encoding']) return respond(415, { error: 'Use uncompressed application/json.' });
      const length = request.headers['content-length'];
      if (length && (!/^\d+$/.test(length) || Number(length) > config.maxBodyBytes)) return respond(413, { error: 'Request body is too large.' });
      let payload;
      try { payload = JSON.parse(await readBody(request, config.maxBodyBytes, config.requestTimeoutMs)); }
      catch (error) {
        if (error instanceof PolicyError) return respond(error.code === -32010 ? 413 : 408, envelope(null, error.code, error.message));
        return respond(400, envelope(null, -32700, 'Invalid JSON.'));
      }
      const isBatch = Array.isArray(payload); const batch = isBatch ? payload : [payload];
      if (!batch.length || batch.length > config.maxBatch) return respond(400, envelope(null, -32600, 'Batch size is not permitted.'));
      let calls;
      try {
        calls = batch.map(call => validateCall(call, config, native));
        const ids = calls.map(call => `${typeof call.request.id}:${call.request.id}`);
        if (new Set(ids).size !== ids.length) throw new PolicyError(-32600, 'Batch IDs must be unique.');
      } catch (error) {
        const reason = error instanceof PolicyError ? error : new PolicyError();
        return respond(400, envelope(null, reason.code, reason.message));
      }
      callCount = calls.length;
      if (!consume(state, calls.reduce((total, call) => total + call.cost, 0), clock())) return respond(429, envelope(null, -32005, 'RPC request budget exceeded.'), { 'retry-after': '60' });
      if (upstreamActive + calls.length > config.maxUpstream || state.upstream + calls.length > config.maxUpstreamPerIp) return respond(503, envelope(null, -32006, 'RPC capacity reached.'), { 'retry-after': '1' });
      upstreamActive += calls.length; state.upstream += calls.length; reserved = calls.length;
      mayHaveSent = calls.some(call => call.request.method === 'sendTransaction');
      const results = await Promise.all(calls.map(call => forward(call.request, connection.signal)));
      // The total batch also has a byte cap, not only each individual upstream body.
      const result = isBatch ? results : results[0];
      if (Buffer.byteLength(JSON.stringify(result)) > config.maxResponseBytes) return respond(502, envelope(null, -32001, 'RPC response exceeded the limit. Check transaction status before retrying.', calls.some(call => call.request.method === 'sendTransaction') ? { outcome: 'unknown', retryable: false } : undefined));
      respond(200, result);
    } catch { respond(500, envelope(null, -32603, 'RPC gateway could not complete the request.', mayHaveSent ? { outcome: 'unknown', retryable: false } : undefined)); }
    finally {
      if (reserved) { upstreamActive -= reserved; state.upstream -= reserved; }
      if (admitted) { requests--; state.active--; }
      emit({ event: 'rpc-gateway', status: response.statusCode, calls: callCount, durationMs: Math.max(0, Math.round(clock() - started)) });
    }
  });
  server.maxHeadersCount = 30; server.keepAliveTimeout = 5000; server.maxRequestsPerSocket = 100; server.maxConnections = config.maxRequests * 4;
  server.setTimeout(Math.max(config.requestTimeoutMs, config.upstreamTimeoutMs) + 1000, socket => socket.destroy());
  server.on('clientError', (_error, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); });
  server.on('upgrade', (_request, socket) => socket.destroy());
  server.on('connect', (_request, socket) => socket.destroy());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('This template requires the tested Node.js 24 release line.');
    const config = readConfig();
    const server = createRpcProxy({ config });
    server.on('error', () => { console.error('RPC gateway could not start. Check server configuration and listening port.'); process.exitCode = 1; });
    server.listen(config.port, config.host, () => console.info('RPC gateway listening; /healthz is liveness only. Upstream details are never logged.'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(() => process.exit(0)); setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 10000).unref(); });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
