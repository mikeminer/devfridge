const test = require('node:test');
const assert = require('node:assert/strict');
const {registerHooks} = require('node:module');
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') return nextResolve('next/server.js', context);
  if (specifier.endsWith('/lib/topshelf/logo')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
}});
const {NextRequest} = require('next/server');
const {GET} = require('../app/api/world/topshelf/logo/route.ts');
const token = '0x5c845330b41D9Bef68B46DC254353A770f44dee8';
const artwork = 'https://dbk-vercel.vercel.app/api/ipfs/content/bafybeiexample?variant=card';
const html = `<script type="application/ld+json">${JSON.stringify([{'@type':'WebPage',about:{identifier:token.toLowerCase(),image:artwork}}])}</script>`;
const request = () => new NextRequest(`https://world.devfridge.cool/api/world/topshelf/logo?token=${token}&v=2`);
const imageBytes = new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80]);

test('actual Pons artwork survives apex redirects and is cached as an image', async t => {
  const calls=[];
  t.mock.method(globalThis,'fetch',async (url,options) => {
    calls.push({url:String(url),options});
    if (calls.length===1) return new Response(null,{status:308,headers:{location:`https://ponsfamily.com/launchpad/${token}`}});
    if (calls.length===2) return new Response(html);
    return new Response(imageBytes,{headers:{'content-type':'image/webp'}});
  });
  const response=await GET(request());
  assert.equal(response.headers.get('x-topshelf-logo'),'pons');
  assert.equal(response.headers.get('content-type'),'image/webp');
  assert.match(response.headers.get('cache-control'),/s-maxage=86400/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),imageBytes);
  assert.equal(calls.at(-1).url,artwork);
  assert.ok(calls.every(({options})=>options.cache==='no-store' && options.redirect==='manual' && options.signal));
});

test('a temporary upstream failure is not cached and the next request recovers', async t => {
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=> {
    calls++;
    if(calls===1) return new Response('Unavailable',{status:503});
    if(calls===2) return new Response(html);
    return new Response(imageBytes,{headers:{'content-type':'image/webp'}});
  });
  const failed=await GET(request());
  assert.equal(failed.headers.get('x-topshelf-logo'),'fallback');
  assert.equal(failed.headers.get('cache-control'),'no-store');
  assert.match(await failed.text(),/<svg/);
  const recovered=await GET(request());
  assert.equal(recovered.headers.get('x-topshelf-logo'),'pons');
});

test('untrusted image redirects are rejected before fetching their target', async t => {
  const urls=[];
  t.mock.method(globalThis,'fetch',async url=> {
    urls.push(String(url));
    if(urls.length===1) return new Response(html);
    return new Response(null,{status:302,headers:{location:'http://127.0.0.1/internal'}});
  });
  const response=await GET(request());
  assert.equal(response.headers.get('x-topshelf-logo'),'fallback');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(urls.length,2);
  assert.ok(!urls.some(url=>url.includes('127.0.0.1')));
});

test('HTML, active SVG, and oversized images cannot be proxied as logos', async t => {
  for(const [body,headers] of [
    ['<html>Error</html>',{'content-type':'text/html'}],
    ['<svg onload="alert(1)"/>',{'content-type':'image/svg+xml'}],
    [imageBytes,{'content-type':'image/webp','content-length':String(5*1024*1024)}],
  ]) {
    let calls=0;
    const mock=t.mock.method(globalThis,'fetch',async()=>++calls===1 ? new Response(html) : new Response(body,{headers}));
    const response=await GET(request());
    assert.equal(response.headers.get('x-topshelf-logo'),'fallback');
    assert.equal(response.headers.get('cache-control'),'no-store');
    mock.mock.restore();
  }
});

test('timeouts return only an uncached fallback', async t => {
  t.mock.method(globalThis,'fetch',async()=>{throw new DOMException('Timed out','TimeoutError');});
  const response=await GET(request());
  assert.equal(response.headers.get('x-topshelf-logo'),'fallback');
  assert.equal(response.headers.get('cache-control'),'no-store');
});

test('invalid token input never reaches Pons', async t => {
  const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected fetch');});
  const response=await GET(new NextRequest('https://world.devfridge.cool/api/world/topshelf/logo?token=invalid'));
  assert.equal(response.status,400);
  assert.equal(fetch.mock.callCount(),0);
});
