import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist/vendor', { recursive: true });
const feed = JSON.parse(await readFile('vault.json', 'utf8'));
if (feed.repo !== 'mikeminer/devfridge' || feed.files.length < 52) throw new Error('Incomplete DevFridge knowledge fallback');
for (const file of ['index.html', 'app.js', 'styles.css', 'vault.json', 'LICENSE', 'NOTICE.md']) await copyFile(file, join('dist', file));
for (const [source, target] of [
  ['three/build/three.module.js', 'three.module.js'],
  ['three/examples/jsm/controls/OrbitControls.js', 'OrbitControls.js'],
  ['three/LICENSE', 'three-LICENSE'],
  ['lucide/dist/umd/lucide.min.js', 'lucide.min.js'],
  ['lucide/LICENSE', 'lucide-LICENSE'],
]) await copyFile(join('node_modules', source), join('dist/vendor', target));
console.log(`Built Synapse with ${feed.files.length} fallback notes and local graph libraries.`);
