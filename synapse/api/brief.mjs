import { readFile } from 'node:fs/promises';
import { buildBrief, renderHTML, renderMarkdown, llmsText, SNAPSHOT_URL, ORIGIN } from '../brief.mjs';

export async function briefResponse(request, { fetcher = fetch, fallbackReader = () => readFile(new URL('../snapshot.json', import.meta.url), 'utf8'), now = Date.now() } = {}) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const format = new URL(request.url).searchParams.get('format') ?? 'html';
  if (!['html', 'md', 'json', 'llms'].includes(format)) return new Response('Not found', { status: 404 });
  let brief;
  if (format !== 'llms') {
    try {
      const response = await fetcher(SNAPSHOT_URL, { signal: AbortSignal.timeout(2500), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Source unavailable');
      brief = buildBrief(await response.json(), { now });
    } catch {
      try { brief = buildBrief(JSON.parse(await fallbackReader()), { now, fallback: true }); }
      catch { return new Response('Evidence temporarily unavailable. Read https://github.com/mikeminer/devfridge/tree/master/knowledge', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    }
  }
  const body = format === 'llms' ? llmsText : format === 'md' ? renderMarkdown(brief) : format === 'json' ? JSON.stringify(brief) : renderHTML(brief);
  const type = { html: 'text/html', md: 'text/markdown', json: 'application/json', llms: 'text/plain' }[format];
  return new Response(request.method === 'HEAD' ? null : body, { headers: {
    'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': brief?.fallback ? 'public, s-maxage=30' : 'public, s-maxage=300',
    'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*',
    'X-Synapse-Snapshot': brief?.snapshot_attempted_at ?? 'guide', 'X-Synapse-Source': brief?.fallback ? 'saved-fallback' : 'github',
    Link: `<${ORIGIN}/brief.md>; rel="alternate"; type="text/markdown", <${ORIGIN}/brief.json>; rel="alternate"; type="application/json"`
  } });
}

export default { fetch: request => briefResponse(request) };
