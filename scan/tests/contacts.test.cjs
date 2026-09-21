const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../lib/contacts.ts'), 'utf8');

test('Connect lists the official community and game destinations exactly once', () => {
  const links = [...source.matchAll(/href: "([^"]+)"/g)].map(match => match[1]);
  for (const url of [
    'https://t.me/pastaHQ',
    'https://www.youtube.com/@devfridge',
    'https://colosseum.com/arena/projects/devfridge-world',
    'https://playtoearn.com/blockchaingame/devfridge-world',
    'https://world.devfridge.cool/android',
  ]) {
    assert.equal(links.filter(link => link === url).length, 1, url);
  }
  assert.doesNotMatch(source, /pastamemelovers/i);
});
