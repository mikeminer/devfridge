import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { shouldSkip } from './skip-site-build.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-build-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (path, data) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), data); };
  const commit = () => { git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'fixture'); };
  git('init'); write('README.md', 'base'); write('scan/vercel.json', '{"framework":"nextjs"}'); commit();
  return { root, write, commit };
}

test('daily knowledge updates skip websites', t => {
  const f = fixture(t); f.write('knowledge/index.md', 'updated'); f.commit(); assert.equal(shouldSkip(f.root), true);
});
test('application changes still build alongside knowledge', t => {
  const f = fixture(t); f.write('knowledge/index.md', 'updated'); f.write('scan/app/page.tsx', 'changed'); f.commit(); assert.equal(shouldSkip(f.root), false);
});
test('guard installation skips without deploying older application source', t => {
  const f = fixture(t); f.write('scan/vercel.json', JSON.stringify({ framework: 'nextjs', ignoreCommand: 'node ../scripts/knowledge/skip-site-build.mjs' })); f.write('team/vercel.json', '{"ignoreCommand":"node ../scripts/knowledge/skip-site-build.mjs"}'); f.commit(); assert.equal(shouldSkip(f.root), true);
});
test('other configuration changes require a build', t => {
  const f = fixture(t); f.write('scan/vercel.json', JSON.stringify({ framework: 'other', ignoreCommand: 'node ../scripts/knowledge/skip-site-build.mjs' })); f.commit(); assert.equal(shouldSkip(f.root), false);
});
test('missing history defaults to building', t => {
  const f = fixture(t); assert.equal(shouldSkip(f.root), false);
});
