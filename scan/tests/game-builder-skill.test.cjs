const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'skills/devfridge-game-builder');
const output = path.join(root, 'scan/public/world/skill/downloads');
test('published skill resources and archives match their maintained sources and checksums', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
  const zip = fs.readFileSync(path.join(output, `${manifest.name}.zip`));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(crypto.createHash('sha256').update(zip).digest('hex'), manifest.sha256);
  assert.deepEqual(fs.readFileSync(path.join(output, `${manifest.name}.skill`)), zip);
  for (const file of manifest.files) {
    const original = fs.readFileSync(path.join(source, file.path), 'utf8').replace(/\r\n/g, '\n');
    const published = fs.readFileSync(path.join(output, manifest.name, file.path), 'utf8');
    assert.equal(published, original, file.path);
    assert.equal(crypto.createHash('sha256').update(published).digest('hex'), file.sha256, file.path);
  }
  const skill = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8');
  for (const match of skill.matchAll(/\]\(([^)]+)\)/g)) if (!match[1].includes('://')) assert.ok(fs.existsSync(path.join(source, match[1])), match[1]);
});
test('skill exact-lock tests run in the standard repository suite', async () => {
  await import('../../skills/devfridge-game-builder/assets/timelock-gate.test.mjs');
});
