import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildBrief, renderHTML, renderMarkdown, llmsText, ORIGIN } from './brief.mjs';

await mkdir('dist/vendor', { recursive: true });
const feed = JSON.parse(await readFile('vault.json', 'utf8'));
if (feed.repo !== 'mikeminer/devfridge' || feed.files.length < 52) throw new Error('Incomplete DevFridge knowledge fallback');
for (const file of ['app.js', 'mobile.mjs', 'neurons.mjs', 'styles.css', 'vault.json', 'brief.css', 'brief-ui.js', 'LICENSE', 'NOTICE.md']) await copyFile(file, join('dist', file));
await copyFile('index.html', 'dist/graph.html');
const snapshot = JSON.parse(await readFile('snapshot.json', 'utf8'));
const brief = buildBrief(snapshot, { fallback: true });
await writeFile('dist/index.html', renderHTML(brief));
await writeFile('dist/brief.md', renderMarkdown(brief));
await writeFile('dist/brief.json', JSON.stringify(brief));
await writeFile('dist/llms.txt', llmsText);
// Vercel serves existing static files before rewrites. Leave these paths to the
// function in production so a dated build cannot shadow the daily GitHub feed.
if (process.argv.includes('--vercel')) {
  for (const file of ['index.html', 'brief.md', 'brief.json', 'llms.txt']) await rm(join('dist', file), { force: true });
}
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/graph.html', '/brief.md', '/brief.json'].map(path => `<url><loc>${ORIGIN}${path}</loc></url>`).join('')}</urlset>`);
for (const [source, target] of [
  ['three/build/three.module.js', 'three.module.js'],
  ['three/examples/jsm/controls/OrbitControls.js', 'OrbitControls.js'],
  ['three/examples/jsm/utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js'],
  ['three/LICENSE', 'three-LICENSE'],
  ['lucide/dist/umd/lucide.min.js', 'lucide.min.js'],
  ['lucide/LICENSE', 'lucide-LICENSE'],
]) await copyFile(join('node_modules', source), join('dist/vendor', target));
console.log(`Built Synapse with ${feed.files.length} fallback notes and local graph libraries.`);
