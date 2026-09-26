const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { registerHooks } = require('node:module');
registerHooks({resolve(specifier, context, nextResolve) {
  if(specifier === 'next/server') return nextResolve('next/server.js', context);
  return nextResolve(specifier, context);
}});
const {NextRequest} = require('next/server');
const {middleware} = require('../middleware.ts');
const {GET} = require('../app/hackathon/projects/fridge-run/route.ts');
const {GET: getFeed} = require('../app/hackathon/projects.json/route.ts');
const root = path.join(__dirname, '../public/hackathon/projects/fridge-run');

test('project directory, game and every bundled script/style use the hackathon host routing', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map(match=>match[1].slice(2));
  assert.equal(assets.length, 2);
  for(const route of ['/projects','/projects.json','/projects/fridge-run/index.html',...assets.map(asset=>`/projects/fridge-run/${asset}`)]) {
    const req = new NextRequest(`https://hackathon.devfridge.cool${route}`, {headers:{host:'hackathon.devfridge.cool'}});
    assert.equal(new URL(middleware(req).headers.get('x-middleware-rewrite')).pathname, `/hackathon${route}`);
  }
  for(const asset of assets) assert.ok(fs.statSync(path.join(root,asset)).isFile());
  assert.match(html, /href="\.\/index\.html" aria-label="Fridge Run home"/);
});

test('public feed returns the curated registry as JSON with read-only CORS', async () => {
  const previous = process.cwd();
  let response;
  try {
    process.chdir(path.join(__dirname, '..'));
    response = getFeed();
  } finally {
    process.chdir(previous);
  }
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const body = await response.json();
  const { publishedProjects } = require('../lib/hackathon-feed.cjs');
  assert.deepEqual(body, publishedProjects(require('../data/projects.json')));
});
test('short game URL redirects to index with query intact for either path form', () => {
  for(const prefix of ['', '/hackathon']) {
    const response=GET(new NextRequest(`https://hackathon.devfridge.cool${prefix}/projects/fridge-run?ref=test`));
    assert.equal(response.status,307);
    assert.equal(new URL(response.headers.get('location')).pathname,`${prefix}/projects/fridge-run/index.html`);
    assert.equal(new URL(response.headers.get('location')).search,'?ref=test');
  }
});
