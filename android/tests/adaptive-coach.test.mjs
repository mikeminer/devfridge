import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../mobile/adaptive-coach.js', import.meta.url), 'utf8');
function coach(language = 'en') {
  const window = { __dfNativePort: {}, top: null };
  window.top = window;
  const context = { window, location: { origin: 'https://world.devfridge.cool' }, navigator: { language },
    document: { documentElement: { lang: language }, body: {}, getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {} }, MutationObserver: class { observe() {} },
  };
  vm.runInNewContext(code, context);
  return window.DevFridgeAdaptiveCoach;
}

test('on-device coach adapts its eligible tip to collection progress and recent scores', () => {
  const select = coach().chooseTip;
  assert.equal(select(300, 2, [], {}).id, 'discover');
  assert.equal(select(100, 8, [200, 220], {}).id, 'reset');
  assert.equal(select(300, 8, [100, 110], {}).id, 'pace');
});

test('voluntary helpful feedback changes later selection, with localized advice', () => {
  const select = coach('it-IT').chooseTip;
  const initial = select(300, 2, [], {}).id;
  assert.equal(initial, 'discover');
  const adapted = select(300, 2, [], { discover: { helpful: 0, unhelpful: 8 } });
  assert.equal(adapted.id, 'spacing');
  assert.match(adapted.text[1], /Lascia libera/);
});
