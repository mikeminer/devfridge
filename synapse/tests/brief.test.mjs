import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildBrief, renderHTML, renderMarkdown, exactSupply, PASTA, SNAPSHOT_URL } from '../brief.mjs';
import { briefResponse } from '../api/brief.mjs';

const snapshot = JSON.parse(readFileSync(new URL('../snapshot.json', import.meta.url), 'utf8'));
const now = Date.parse(snapshot.attempted_at) + 1000;
const make = value => buildBrief(value, { now });
const dependencies = { now, fetcher: async url => { assert.equal(url, SNAPSHOT_URL); return Response.json(snapshot); } };

test('previous encoded root note links open the same note in the mobile graph', () => {
  const source = readFileSync(new URL('../brief-ui.js', import.meta.url), 'utf8');
  for (const hash of ['#%2Fassets%2Fsolana%2Fexample.md', '#/investor/index.md', '#solana', '#ai']) {
    let destination = null;
    runInNewContext(source, { location: { hash, replace: value => { destination = value; } }, document: { querySelector: () => null, querySelectorAll: () => [] } });
    assert.equal(destination, hash.startsWith('#%') || hash.startsWith('#/') ? '/graph.html' + hash : null);
  }
});

test('initial HTML includes every address, evidence dates, and no graph dependency', () => {
  const brief = make(snapshot), html = renderHTML(brief);
  assert.equal(brief.assets.length, 23);
  for (const asset of snapshot.registry.data) assert.ok(html.includes(asset.address));
  for (const doc of Object.keys(snapshot.documents)) assert.ok(html.includes(doc));
  assert.ok(html.includes(snapshot.attempted_at));
  assert.ok(html.includes('Locked % / unlocks'));
  assert.ok(html.includes('href="/brief.md"'));
  assert.ok(html.includes('application/ld+json'));
  assert.ok(!html.includes('three.module.js'));
  assert.ok(Buffer.byteLength(html) < 80000);
  assert.ok(Buffer.byteLength(renderMarkdown(brief)) < 35000);
});

test('missing market data is unknown; missing authorities never become renounced', () => {
  const copy = structuredClone(snapshot);
  copy.assets['solana:' + PASTA] = {};
  const brief = make(copy), pasta = brief.assets.find(a => a.address === PASTA);
  assert.equal(pasta.largest_indexed_pool, null);
  assert.equal(pasta.total_supply, null);
  assert.equal(pasta.chain_observation.status, 'unavailable');
  const md = renderMarkdown(brief).split('### ')[1];
  assert.ok(md.includes('Mint authority: Not observed'));
  assert.ok(md.includes('Largest indexed pool liquidity: Not observed'));
});

test('source age and prior source failures remain stale even after a new snapshot attempt', () => {
  const copy = structuredClone(snapshot);
  copy.attempted_at = new Date(now).toISOString();
  copy.assets['solana:' + PASTA].market.fetched_at = '2020-01-01T00:00:00Z';
  copy.assets['solana:' + PASTA].chain.status = 'stale';
  const pasta = make(copy).assets.find(a => a.address === PASTA);
  assert.equal(pasta.market_observation.status, 'stale');
  assert.equal(pasta.chain_observation.status, 'stale');
  assert.ok(renderHTML(make(copy)).includes('STALE · 2020-01-01'));
});

test('supply retains exact base-unit precision beyond safe JS integers', () => {
  assert.equal(exactSupply({ supply_base_units: '123456789123456789123456789', decimals: 18 }), '123456789.123456789123456789');
  assert.equal(exactSupply({ supply_base_units: '1000000000', decimals: 6 }), '1000');
  assert.equal(exactSupply({ supply_base_units: '0', decimals: 6 }), '0');
  assert.equal(exactSupply({ supply_base_units: '1000', decimals: 0 }), '1000');
  assert.equal(exactSupply({}), null);
});

test('source text is escaped and unsafe URLs cannot become executable links', () => {
  const copy = structuredClone(snapshot);
  copy.registry.data[0].name = '<script>alert(1)</script>';
  copy.assets[copy.registry.data[0].id].market.source = 'javascript:alert(1)';
  const html = renderHTML(make(copy));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('Connect and CEO contacts appear in the initial HTML, Markdown and JSON with source dates', () => {
  const brief = make(snapshot), html = renderHTML(brief), markdown = renderMarkdown(brief);
  for (const text of [html, markdown, JSON.stringify(brief)]) {
    assert.ok(text.includes('anonimocommando'));
    assert.ok(text.includes('pappardelle.sol'));
    assert.ok(text.includes('CEO'));
    assert.ok(text.includes('https://t.me/anonimocommando'));
    assert.ok(text.includes(snapshot.contacts.connect.fetched_at));
  }
  const old = structuredClone(snapshot);
  old.contacts.connect.status = 'stale';
  old.contacts.team.fetched_at = '2020-01-01T00:00:00Z';
  assert.equal(make(old).contacts.connect.status, 'stale');
  assert.equal(make(old).contacts.team.status, 'stale');
  delete old.contacts;
  assert.equal(make(old).contacts.team.status, 'unavailable');
  assert.ok(!renderHTML(make(old)).includes('pappardelle.sol'));
});

test('contact labels cannot inject HTML or executable links', () => {
  const copy = structuredClone(snapshot);
  copy.contacts.connect.data.entries[0] = {label:'<script>bad()</script>', group:'test', url:'javascript:bad()'};
  copy.contacts.team.data.members[0].name = '<img src=x onerror=bad()>';
  const html = renderHTML(make(copy));
  assert.ok(!html.includes('<script>bad()'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('href="javascript:'));
});

test('HTML, Markdown and JSON endpoints serve the same dated evidence without JavaScript', async () => {
  for (const [format, type] of [['html', 'text/html'], ['md', 'text/markdown'], ['json', 'application/json']]) {
    const response = await briefResponse(new Request(`https://synapse.devfridge.cool/api/brief?format=${format}`), dependencies);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    assert.equal(response.headers.get('x-synapse-snapshot'), snapshot.attempted_at);
    assert.equal(response.headers.get('x-synapse-source'), 'github');
    assert.ok((await response.text()).includes(PASTA));
  }
});

test('upstream failure returns an explicitly labelled dated fallback with shorter caching', async () => {
  const response = await briefResponse(new Request('https://synapse.devfridge.cool/'), { now, fetcher: async () => { throw new Error('offline'); }, fallbackReader: async () => JSON.stringify(snapshot) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-synapse-source'), 'saved-fallback');
  assert.ok(response.headers.get('vercel-cdn-cache-control').includes('s-maxage=30'));
  assert.ok((await response.text()).includes('Saved fallback · live feed unavailable'));
});

test('missing live and fallback evidence fails closed; unsupported methods are read-only', async () => {
  const failed = async () => { throw new Error('unavailable'); };
  const result = await briefResponse(new Request('https://synapse.devfridge.cool/'), { fetcher: failed, fallbackReader: failed });
  assert.equal(result.status, 503);
  assert.equal((await briefResponse(new Request('https://synapse.devfridge.cool/', { method: 'POST' }), dependencies)).status, 405);
  assert.equal((await briefResponse(new Request('https://synapse.devfridge.cool/?format=other'), dependencies)).status, 404);
  assert.equal(await (await briefResponse(new Request('https://synapse.devfridge.cool/', { method: 'HEAD' }), dependencies)).text(), '');
});
