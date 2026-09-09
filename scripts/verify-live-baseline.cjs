// One-off pre-merge audit. A future intentional site change can legitimately differ.
// Usage: node scripts/verify-live-baseline.cjs [baseline.json]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[2] || 'integrations/deployment/live-baseline-2026-09-09.json'), 'utf8'));
const failures = [];
for (const item of manifest.files) {
  const file = path.resolve(root, item.path);
  if (!file.startsWith(root + path.sep)) throw new Error('Baseline path outside repository');
  try {
    let bytes = fs.readFileSync(file);
    if (item.verification === 'utf8-lf') bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    if (item.verification === 'vercel-knowledge-guard') {
      const data = JSON.parse(bytes.toString('utf8'));
      if (data.ignoreCommand !== 'node ../scripts/knowledge/skip-site-build.mjs') throw new Error('Missing knowledge build guard');
      delete data.ignoreCommand;
      const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
      bytes = Buffer.from(JSON.stringify(sorted(data)));
    }
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== item.sha256) failures.push(item.path);
  } catch { failures.push(item.path); }
}
if (failures.length) { console.error('Baseline differences:\n' + failures.join('\n')); process.exitCode = 1; }
else console.log(`Verified ${manifest.files.length} production source files; knowledge-only build guards retained.`);
