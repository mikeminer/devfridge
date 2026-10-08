const assert = require('node:assert/strict');
const test = require('node:test');
const {parsePonsLogo, isAllowedPonsImageUrl} = require('../lib/topshelf/logo.ts');

const address = '0x5c845330b41D9Bef68B46DC254353A770f44dee8';
const artwork = 'https://dbk-vercel.vercel.app/api/ipfs/content/bafybeiaxz7e3ykrzfpal2czkg7gwkoj7afue6ypkrxvy36bjbu3wo6ltq4?variant=card';
const socialCard = `https://ponsfamily.com/launchpad/${address}/opengraph-image?26df21197a51b7f7`;
const structured = value => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

// Public TMC page metadata shape observed on 2026-10-08; no executable page scripts.
const tokenPage = {
  '@context': 'https://schema.org', '@type': 'WebPage',
  primaryImageOfPage: {'@type': 'ImageObject', contentUrl: artwork},
  about: {'@type': 'Thing', name: 'Trust Me Capital', alternateName: 'TMC', identifier: address.toLowerCase(), image: artwork},
};

test('current Pons metadata supplies token artwork instead of its social card', () => {
  const html = `<meta property="og:image" content="${socialCard}">` + structured([tokenPage, {'@type': 'BreadcrumbList'}]);
  assert.equal(parsePonsLogo(html, address)?.href, artwork);
});

test('reads address-matched JSON-LD arrays and graphs without accepting another token image', () => {
  const otherToken = {...tokenPage, about: {...tokenPage.about, identifier: '0x0000000000000000000000000000000000000000'}};
  assert.equal(parsePonsLogo(structured(otherToken), address), null);
  assert.equal(parsePonsLogo(structured({'@graph': [otherToken, tokenPage]}), address)?.href, artwork);
  assert.equal(parsePonsLogo(structured({...tokenPage, about: [otherToken.about, tokenPage.about]}), address)?.href, artwork);
  assert.equal(parsePonsLogo(structured({primaryImageOfPage: tokenPage.primaryImageOfPage}), address), null);
});

test('malformed and untrusted metadata can fall through to a valid legacy image', () => {
  const html = '<script type="application/ld+json">{broken}</script>' +
    structured({...tokenPage, about: {...tokenPage.about, image: 'https://attacker.example/logo.png'}}) +
    '<meta content="https://ponsfamily.com/token.png?size=256&amp;v=&#50;" property="og:image">';
  assert.equal(parsePonsLogo(html, address)?.href, 'https://ponsfamily.com/token.png?size=256&v=2');
  assert.equal(parsePonsLogo("<META CONTENT='/token.png' PROPERTY='og:image'>", address)?.href, 'https://www.ponsfamily.com/token.png');
  assert.equal(parsePonsLogo('<meta property=og:image content=https://www.ponsfamily.com/token.png>', address)?.href, 'https://www.ponsfamily.com/token.png');
});

test('only exact HTTPS artwork origins and supported CDN paths are allowed', () => {
  for (const value of [artwork, 'https://ponsfamily.com/logo.png', 'https://www.ponsfamily.com/logo.png']) {
    assert.equal(isAllowedPonsImageUrl(new URL(value)), true, value);
  }
  for (const value of [
    socialCard, socialCard.replace('ponsfamily.com', 'www.ponsfamily.com'),
    'http://ponsfamily.com/logo.png', 'https://ponsfamily.com:8443/logo.png',
    'https://user:password@ponsfamily.com/logo.png', 'https://www.ponsfamily.com.attacker.example/logo.png',
    'https://dbk-vercel.vercel.app/logo.png', 'https://dbk-vercel.vercel.app/api/ipfs/content/',
    'https://dbk-vercel.vercel.app/api/ipfs/content/../../private', 'https://127.0.0.1/logo.png',
  ]) assert.equal(isAllowedPonsImageUrl(new URL(value)), false, value);
});

test('missing artwork or a social-card-only page keeps the local fallback', () => {
  for (const html of ['', '<meta property="og:image" content="javascript:alert(1)">', `<meta property="og:image" content="${socialCard}">`]) {
    assert.equal(parsePonsLogo(html, address), null);
  }
});
