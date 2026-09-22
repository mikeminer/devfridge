const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateProject, loadProjects } = require('../lib/hackathon-projects.cjs');
function project() {
  return { schemaVersion: 1, slug: 'test-game', name: 'Test Game', pitch: 'Collect cold crates.', community: 'Test community', playUrl: 'https://game.devfridge.cool/', repositoryUrl: 'https://github.com/builder/game', demoUrl: 'https://youtu.be/demo', submissionUrl: 'https://github.com/builder/game/blob/abc/SUBMISSION.md', buildLogUrl: 'https://github.com/builder/game/blob/abc/BUILD_LOG.md', verificationUrl: 'https://github.com/builder/game/blob/abc/VERIFICATION.md', commit: 'a'.repeat(40), access: 'Labelled fixture, free practice. No real locks.', limitations: 'Phone and Phantom tests pending. Local unverified scores.', practiceAvailable: true };
}
test('complete metadata is accepted without executing or fetching a submitted game', () => {
  assert.equal(validateProject(project(), 'test-game.json').name, 'Test Game');
});
test('reject unsafe links, markup, unknown approval flags and incomplete evidence', () => {
  for (const change of [
    { playUrl: 'javascript:alert(1)' }, { playUrl: 'http://game.devfridge.cool' },
    { playUrl: 'https://user:password@game.devfridge.cool/' }, { playUrl: 'https://127.0.0.1/' },
    { playUrl: 'https://localhost/' }, { playUrl: 'https://service.internal/' },
    { playUrl: 'https://game.devfridge.cool:444/' }, { playUrl: 'https://example.com/' },
    { name: '<script>alert(1)</script>' }, { name: 'a\nb' }, { pitch: 'x'.repeat(241) },
    { approved: true }, { commit: 'HEAD' }, { commit: '0'.repeat(40) }, { practiceAvailable: false },
    { repositoryUrl: 'https://github.com/YOUR-ACCOUNT/YOUR-GAME' },
    { schemaVersion: 2 }, { slug: '../outside' }, { slug: 'fridge-run' }, { demoUrl: '' },
  ]) assert.throws(() => validateProject({ ...project(), ...change }, 'test-game.json'), JSON.stringify(change));
  const missing = project(); delete missing.verificationUrl;
  assert.throws(() => validateProject(missing, 'test-game.json'));
  assert.throws(() => validateProject(project(), 'other.json'));
});
test('gallery ingestion accepts a new entry, updates it, and removes it without page edits', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hackathon-projects-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(loadProjects(dir), []);
  const file = path.join(dir, 'test-game.json');
  fs.writeFileSync(file, JSON.stringify(project()));
  assert.equal(loadProjects(dir)[0].slug, 'test-game');
  fs.writeFileSync(file, JSON.stringify({ ...project(), name: 'Updated game' }));
  assert.equal(loadProjects(dir)[0].name, 'Updated game');
  fs.unlinkSync(file);
  assert.deepEqual(loadProjects(dir), []);
});
test('bad JSON, duplicate demos, oversized files and non-JSON entries block publication', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hackathon-projects-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'test-game.json');
  fs.writeFileSync(file, '{'); assert.throws(() => loadProjects(dir));
  fs.writeFileSync(file, ' '.repeat(16385)); assert.throws(() => loadProjects(dir), /16 KiB/);
  fs.writeFileSync(file, JSON.stringify(project()));
  const duplicate = path.join(dir, 'second-game.json');
  fs.writeFileSync(duplicate, JSON.stringify({ ...project(), slug: 'second-game' }));
  assert.throws(() => loadProjects(dir), /duplicate/);
  fs.unlinkSync(duplicate);
  fs.writeFileSync(path.join(dir, 'script.js'), 'throw new Error("must not execute")');
  assert.throws(() => loadProjects(dir), /only regular JSON/);
});
