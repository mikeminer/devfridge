const PONS_ORIGIN = 'https://www.ponsfamily.com';

export function isAllowedPonsImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  // Pons' generated social card is a landscape preview, not the token artwork.
  if (/\/opengraph-image(?:\/|$)/i.test(url.pathname)) return false;
  if (url.hostname === 'ponsfamily.com' || url.hostname === 'www.ponsfamily.com') return true;
  return url.hostname === 'dbk-vercel.vercel.app' && /^\/api\/ipfs\/content\/[^/]+/.test(url.pathname);
}

function imageUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, PONS_ORIGIN);
    return isAllowedPonsImageUrl(url) ? url : null;
  } catch { return null; }
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>'};
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
  });
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}

export function parsePonsLogo(html: string, address: string): URL | null {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(script[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try {
      const pending: unknown[] = [JSON.parse(script[2])];
      while (pending.length) {
        const value = pending.pop();
        if (Array.isArray(value)) { pending.push(...value); continue; }
        if (!value || typeof value !== 'object') continue;
        const record = value as Record<string, unknown>;
        const subjects = Array.isArray(record.about) ? record.about : [record.about];
        for (const subject of subjects) {
          if (!subject || typeof subject !== 'object') continue;
          const token = subject as Record<string, unknown>;
          if (typeof token.identifier !== 'string' || token.identifier.toLowerCase() !== address.toLowerCase()) continue;
          const url = imageUrl(token.image);
          if (url) return url;
        }
        if (record['@graph']) pending.push(record['@graph']);
      }
    } catch { /* Malformed metadata must not prevent another valid record from loading. */ }
  }
  // Older Pons pages exposed the artwork directly in og:image.
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const meta = attributes(tag[0]);
    if (meta.property?.toLowerCase() !== 'og:image') continue;
    const url = imageUrl(meta.content);
    if (url) return url;
  }
  return null;
}
