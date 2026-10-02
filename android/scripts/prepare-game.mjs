import { cp, mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { patchGateForAndroid } from './patch-gate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = resolve(process.argv[2] || join(root, '../devfridge/scan/public/world/game-v2'));
const destination = join(root, 'app/src/main/assets/game');
const html = await readFile(join(source, 'index.html'), 'utf8');
if (!html.includes('gate-2.js') || !html.includes('world/game-v2')) throw Error('Expected the current Cold Storage v2 distribution.');
const bundle = await readFile(join(source, 'assets/cold-storage.js'), 'utf8');
for (const marker of ['wallet-standard:app-ready', 'mobile-layout', 'visibilitychange']) {
  if (!bundle.includes(marker)) throw Error(`Required game capability is missing: ${marker}`);
}
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
const androidGate = patchGateForAndroid((await readFile(join(source, 'assets/gate-2.js'), 'utf8')).replaceAll('\r\n', '\n'));
await writeFile(join(destination, 'assets/gate-2.js'), androidGate);
await cp(join(root, 'mobile/native-bridge.js'), join(destination, 'native-bridge.js'));
await cp(join(root, 'mobile/adaptive-coach.js'), join(destination, 'adaptive-coach.js'));
await cp(join(root, 'mobile/registration-handoff.js'), join(destination, 'registration-handoff.js'));
await cp(join(root, 'mobile/android.css'), join(destination, 'android.css'));
const mobileHtml = html.replace('Cold Storage v2 — 18+, server-recorded scores, no cash prizes.', 'DevFridge World — 18+, token timelock access and optional paid TopShelf registration with seasonal token prizes.')
  .replace('</head>', '<link rel="stylesheet" href="/world/game-v2/android.css" />\n<script src="/world/game-v2/native-bridge.js"></script>\n<script src="/world/game-v2/adaptive-coach.js"></script>\n<script src="/world/game-v2/registration-handoff.js"></script>\n</head>');
await writeFile(join(destination, 'index.html'), mobileHtml);
const files = [];
async function inventory(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await inventory(file);
    else files.push({ path: relative(source, file).replaceAll('\\', '/'), bytes: (await stat(file)).size, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
  }
}
await inventory(source);
await writeFile(join(root, 'game-provenance.json'), JSON.stringify({ source: 'devfridge/scan/public/world/game-v2', copiedAt: new Date().toISOString(), files, androidOverrides: [{ path: 'assets/gate-2.js', reason: 'Bounded network requests, visible retryable errors, date validation and accurate TopShelf disclosures', sha256: createHash('sha256').update(androidGate).digest('hex') }, { path: 'index.html', reason: 'Native bridge scripts, Android styling and accurate TopShelf metadata', sha256: createHash('sha256').update(mobileHtml).digest('hex') }, { path: 'adaptive-coach.js', reason: 'On-device adaptive gameplay coaching; local run history and feedback only', sha256: createHash('sha256').update(await readFile(join(root, 'mobile/adaptive-coach.js'))).digest('hex') }, { path: 'android.css', reason: 'Native touch-target styling, SKR Aurora cosmetic, and adaptive-coach UI', sha256: createHash('sha256').update(await readFile(join(root, 'mobile/android.css'))).digest('hex') }] }, null, 2) + '\n');
console.log(`Bundled ${files.length} game files (${(files.reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)} MiB). Original game JavaScript is unchanged.`);
