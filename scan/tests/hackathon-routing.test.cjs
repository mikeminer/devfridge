const test = require('node:test');
const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') return nextResolve('next/server.js', context);
  return nextResolve(specifier, context);
} });
const { NextRequest } = require('next/server');
const { middleware } = require('../middleware.ts');
function route(host, path) {
  const response = middleware(new NextRequest(`https://${host}${path}`, {headers:{host}}));
  const target=response.headers.get('x-middleware-rewrite');
  return target ? new URL(target) : null;
}
test('hackathon routes pages, documents and image metadata without losing query parameters', () => {
  for(const [path, expected] of [['/','/hackathon'],['/handbook/start','/hackathon/handbook/start'],['/kit/handbook.md','/hackathon/kit/handbook.md'],['/llms.txt','/hackathon/llms.txt'],['/sitemap.xml','/hackathon/sitemap.xml'],['/robots.txt','/hackathon/robots.txt'],['/opengraph-image','/hackathon/opengraph-image'],['/hackathon/handbook/build','/hackathon/handbook/build']]) {
    const result=route('hackathon.devfridge.cool',`${path}?ref=builder`);
    assert.equal(result.pathname,expected); assert.equal(result.search,'?ref=builder');
  }
});
test('hackathon leaves shared APIs and framework assets available', () => {
  for(const path of ['/api/sdk/check','/_next/static/chunk.js','/_next/image?url=test','/favicon.ico']) assert.equal(route('hackathon.devfridge.cool',path),null);
});
test('existing ecosystem hosts retain their routes', () => {
  assert.equal(route('world.devfridge.cool','/skill').pathname,'/world/skill');
  assert.equal(route('docs.devfridge.cool','/program').pathname,'/docs/program');
  assert.equal(route('sdk.devfridge.cool','/').pathname,'/sdk');
  assert.equal(route('ecosystem.devfridge.cool','/solana').pathname,'/ecosystem/solana');
  assert.equal(route('scan.devfridge.cool','/badge'),null);
  assert.equal(route('hackathon.example.com','/'),null);
});
