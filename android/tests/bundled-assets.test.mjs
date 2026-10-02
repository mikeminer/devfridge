import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = new URL('../app/src/main/assets/game/', import.meta.url);
test('the shipped game bundle matches the recorded upstream file', async () => {
  const provenance = JSON.parse(await readFile(new URL('../game-provenance.json', import.meta.url), 'utf8'));
  const entry = provenance.files.find(file => file.path === 'assets/cold-storage.js');
  const bundle = await readFile(new URL(entry.path, base));
  assert.equal(createHash('sha256').update(bundle).digest('hex'), entry.sha256);
  const html = await readFile(new URL('index.html', base), 'utf8');
  assert.ok(html.indexOf('native-bridge.js') < html.indexOf('gate-2.js'), 'register native wallet before the game loads');
});

test('every character has its required model, portrait and audio packaged', async () => {
  const { cast } = JSON.parse(await readFile(new URL('cast.json', base), 'utf8'));
  assert.equal(cast.length, 10);
  for (const character of cast) {
    for (const key of ['glb', 'png', 'wav', 'voice', 'theme']) {
      assert.ok(character[key], `${character.id}: ${key}`);
      await access(new URL(character[key].replace(/^\/+/, ''), base));
    }
  }
  await access(new URL('vendor/devfridge-sdk.js', base));
  await access(new URL('vendor/meshopt_decoder.module.js', base));
});
