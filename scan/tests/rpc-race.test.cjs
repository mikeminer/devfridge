const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetcher) {
  const timeouts = [], exports = {};
  const context = { exports, require, process: { env: {} }, URL, fetch: fetcher,
    AbortController, AbortSignal: { timeout(ms) { timeouts.push(ms); return new AbortController().signal; }, any: AbortSignal.any.bind(AbortSignal) } };
  vm.runInNewContext(ts.transpileModule(readFileSync(require.resolve('../lib/rpc.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return { rpcRace: exports.rpcRace, timeouts };
}
test('ordinary RPC timeout stays 6s and losing requests are cancelled after success', async () => {
  const signals = [], pending = [];
  const { rpcRace, timeouts } = load((url, options) => {
    signals.push(options.signal);
    if (signals.length === 2) return Promise.resolve({ ok: true, json: async () => ({ result: 'winner' }) });
    return new Promise((_, reject) => { pending.push(url); options.signal.addEventListener('abort', () => reject(Error('cancelled'))); });
  });
  assert.equal(await rpcRace('getAccountInfo', []), 'winner');
  assert.ok(timeouts.every(t => t === 6000)); assert.equal(signals.filter(s => s.aborted).length, signals.length - 1);
});
test('full account queries can use 30s without changing ordinary RPC defaults', async () => {
  const { rpcRace, timeouts } = load(async () => ({ ok: true, json: async () => ({ result: [] }) }));
  await rpcRace('getProgramAccounts', [], 30000); assert.ok(timeouts.every(t => t === 30000));
});
test('provider errors do not win and total failure rejects', async () => {
  let call = 0;
  const { rpcRace } = load(async () => ({ ok: true, json: async () => ++call === 1 ? { error: { message: 'unavailable' } } : { result: 42 } }));
  assert.equal(await rpcRace('getAccountInfo', []), 42);
  const failed = load(async () => ({ ok: false, status: 503, json: async () => ({}) }));
  await assert.rejects(failed.rpcRace('getAccountInfo', []));
});
