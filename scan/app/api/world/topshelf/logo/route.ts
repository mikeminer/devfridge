import {NextRequest} from 'next/server';
import {isAddress} from 'ethers';
import {isAllowedPonsImageUrl, parsePonsLogo} from '../../../../../lib/topshelf/logo';

export const runtime = 'nodejs';
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);

function fallback(address: string) {
  const letters = address.slice(2, 4).toUpperCase();
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="#172a27"/><circle cx="128" cy="128" r="86" fill="#c8ff5c"/><text x="128" y="151" text-anchor="middle" font-family="system-ui,sans-serif" font-size="70" font-weight="800" fill="#172a27">${letters}</text></svg>`, {
    headers: {'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store', 'X-TopShelf-Logo': 'fallback'},
  });
}

// Validate every redirect too: upstream metadata must not turn this into an open proxy.
async function fetchTrusted(url: URL, signal: AbortSignal, allowed: (url: URL) => boolean) {
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!allowed(url)) throw new Error('Untrusted Pons URL');
    const response = await fetch(url, {
      headers: {'User-Agent': 'DevFridge-TopShelf/1.0'},
      cache: 'no-store', redirect: 'manual', signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Missing redirect location');
      url = new URL(location, url);
    } else {
      return response;
    }
  }
  throw new Error('Too many redirects');
}

async function readLimited(response: Response, limit: number) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Pons response too large');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty Pons response');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {await reader.cancel(); throw new Error('Pons response too large');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
  return bytes;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('token') || '';
  if (!isAddress(address)) return new Response('Invalid token address', {status: 400});
  try {
    const signal = AbortSignal.timeout(10000);
    const pagePath = `/launchpad/${address}`;
    const page = await fetchTrusted(new URL(pagePath, 'https://www.ponsfamily.com'), signal, url =>
      url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['ponsfamily.com', 'www.ponsfamily.com'].includes(url.hostname) &&
      url.pathname.toLowerCase() === pagePath.toLowerCase());
    if (!page.ok) return fallback(address);
    const html = new TextDecoder().decode(await readLimited(page, 2 * 1024 * 1024));
    const imageUrl = parsePonsLogo(html, address);
    if (!imageUrl) return fallback(address);
    const image = await fetchTrusted(new URL(imageUrl), signal, isAllowedPonsImageUrl);
    if (!image.ok) return fallback(address);
    const type = (image.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(type)) {await image.body?.cancel(); return fallback(address);}
    const bytes = await readLimited(image, 4 * 1024 * 1024);
    if (!bytes.length) return fallback(address);
    return new Response(bytes, {headers: {
      'Content-Type': type, 'Cache-Control': CACHE, 'X-Content-Type-Options': 'nosniff', 'X-TopShelf-Logo': 'pons',
    }});
  } catch {return fallback(address);}
}
