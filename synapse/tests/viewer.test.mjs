import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function section(start, end) { return app.slice(app.indexOf(`function ${start}(`), app.indexOf(`function ${end}(`)); }
const context = vm.createContext({ Date, URL });
vm.runInContext(section('buildObsidianGraph', 'populateGroupFilter') + section('renderMarkdown', 'updateStats') + section('escapeHtml', 'safeHref').split('window.addEventListener')[0] + section('safeHref', 'updateNoteList') + section('nodeMatches', 'onPointerMove'), context);
const feed = JSON.parse(readFileSync(new URL('../vault.json', import.meta.url), 'utf8'));
const graph = context.buildObsidianGraph(feed.files, { path: 'knowledge' });

test('every public note appears exactly once', () => {
  const notes = graph.nodes.filter(n => n.kind === 'note');
  assert.equal(notes.length, feed.files.length);
  assert.equal(new Set(notes.map(n => n.id)).size, feed.files.length);
});
test('network collections remain distinct with all 23 assets', () => {
  assert.equal(graph.nodes.filter(n => n.type === 'Asset' && n.group === 'Solana assets').length, 12);
  assert.equal(graph.nodes.filter(n => n.type === 'Asset' && n.group === 'Robinhood assets').length, 11);
});
test('relative investor and asset links resolve to their exact notes', () => {
  assert.ok(graph.links.some(l => l.source === '/investor/index.md' && l.target === '/investor/risks.md'));
  assert.ok(graph.links.some(l => l.source.includes('devfridge-pasta') && l.target === '/docs/program.md') || graph.links.some(l => l.source.includes('devfridge-pasta') && l.target === '/docs/tokenomics.md'));
  assert.ok(graph.links.every(l => graph.nodes.some(n => n.id === l.source) && graph.nodes.some(n => n.id === l.target)));
});
test('full token address search finds the exact PASTA asset', () => {
  const pasta = graph.nodes.find(n => n.type === 'Asset' && n.title.includes('PASTA'));
  assert.ok(context.nodeMatches(pasta, '39kmex4hvrw9qbbihspbrq9xexuf18grnp6gl61ppump'));
});
test('script content and unsafe link schemes cannot execute in notes', () => {
  const html = context.renderMarkdown('<script>alert(1)</script>\n\n[bad](javascript:alert) [bad2](data:text/html,test) [good](https://docs.devfridge.cool)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(html.includes('href="https://docs.devfridge.cool"'));
  for (const url of ['javascript:alert(1)', '//bad.test', 'java\nscript:alert(1)', 'javascript&#58;alert', '\\evil.test']) assert.equal(context.safeHref(url), false);
});
test('tables, code blocks, and Markdown metadata stay readable', () => {
  const html = context.renderMarkdown('| Supply | Value |\n| --- | --- |\n| Token | 100 |\n\n```json\n{"supply":100}\n```');
  assert.ok(html.includes('<table>')); assert.ok(html.includes('<pre>'));
  const parsed = context.parseFrontmatter('---\ntitle: "Token"\ntags: ["solana", "investors"]\n---\n# Token');
  assert.equal(parsed.frontmatter.title, 'Token'); assert.equal(parsed.frontmatter.tags.length, 2);
});
