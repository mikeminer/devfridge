import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/src/main/assets/game/assets/gate-2.js', import.meta.url), 'utf8');
function fixture(post, get = async () => ({ ok: true, json: async () => ({}) })) {
  const nodes = new Map();
  for (const id of ['world-gate', 'app', 'g-y', 'g-m', 'g-d', 'g-ok', 'g-err', 'g-enter']) {
    nodes.set(id, { value: '', hidden: false, disabled: false, setAttribute() {} });
  }
  nodes.get('app').hidden = true;
  nodes.get('g-y').value = '1990';
  nodes.get('g-m').value = '1';
  nodes.get('g-d').value = '15';
  nodes.get('g-ok').checked = true;
  const timers = new Set(), posts = [], storage = new Map();
  const ready = vm.runInNewContext(`(async () => {${source}\n})()`, {
    document: { getElementById: id => nodes.get(id) }, navigator: { language: 'en' },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    AbortController,
    setTimeout: fn => { timers.add(fn); return fn; }, clearTimeout: fn => timers.delete(fn),
    fetch: async (url, options) => {
      assert.equal(url, '/api/world/compliance');
      if (options.method === 'POST') { posts.push(options); return post(options); }
      return get(options);
    },
  });
  return { nodes, timers, posts, storage, ready, enter: () => nodes.get('g-enter').onclick() };
}

test('a rejected HTTPS request displays an error and permits retry without granting access', async () => {
  const f = fixture(async () => { throw new TypeError('Failed to fetch'); });
  await f.ready;
  await f.enter();
  assert.match(f.nodes.get('g-err').textContent, /Cannot connect securely/);
  assert.equal(f.nodes.get('g-err').hidden, false);
  assert.equal(f.nodes.get('g-enter').disabled, false);
  assert.equal(f.nodes.get('app').hidden, true);
  assert.equal(f.storage.size, 0);
  await f.enter();
  assert.equal(f.posts.length, 2);
  assert.equal(f.timers.size, 0);
});

test('a stalled submission times out, restores the button and prevents duplicate requests', async () => {
  const f = fixture(({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')))));
  await f.ready;
  const pending = f.enter();
  assert.equal(f.nodes.get('g-enter').disabled, true);
  assert.equal(f.nodes.get('g-enter').textContent, 'Connecting…');
  await f.enter();
  assert.equal(f.posts.length, 1);
  for (const timer of [...f.timers]) timer();
  await pending;
  assert.match(f.nodes.get('g-err').textContent, /too long/);
  assert.equal(f.nodes.get('g-enter').disabled, false);
  assert.equal(f.nodes.get('app').hidden, true);
});

test('a stalled initial status check becomes a visible retryable error', async () => {
  const f = fixture(() => {}, ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')))));
  assert.equal(f.nodes.get('g-enter').disabled, true);
  for (const timer of [...f.timers]) timer();
  await f.ready;
  assert.match(f.nodes.get('g-err').textContent, /too long/);
  assert.equal(f.nodes.get('g-enter').disabled, false);
  assert.equal(typeof f.nodes.get('g-enter').onclick, 'function');
});

test('invalid calendar dates and a missing age declaration never send a submission', async () => {
  const f = fixture(() => { throw Error('Unexpected POST'); });
  await f.ready;
  f.nodes.get('g-m').value = '2'; f.nodes.get('g-d').value = '31';
  await f.enter();
  assert.match(f.nodes.get('g-err').textContent, /valid date/);
  f.nodes.get('g-y').value = '';
  await f.enter();
  assert.match(f.nodes.get('g-err').textContent, /valid date/);
  f.nodes.get('g-ok').checked = false;
  await f.enter();
  assert.match(f.nodes.get('g-err').textContent, /Confirm/);
  assert.equal(f.posts.length, 0);
});

test('server refusal remains visible and does not unlock the game', async () => {
  const f = fixture(async () => ({ ok: false, status: 403, json: async () => ({ error: 'Access denied' }) }));
  await f.ready; await f.enter();
  assert.equal(f.nodes.get('g-err').textContent, 'Access denied');
  assert.equal(f.nodes.get('app').hidden, true);
  assert.equal(f.storage.size, 0);
});
