import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialNoteId, fittedDistance, nearestTap, isTap } from '../mobile.mjs';

test('phones and desktop open the whole network, while explicit note links still work', () => {
  assert.equal(initialNoteId(true, '', null), null);
  assert.equal(initialNoteId(false, '', null), null);
  assert.equal(initialNoteId(true, '/docs/world.md', null), '/docs/world.md');
  assert.equal(initialNoteId(true, '', '/docs/program.md'), '/docs/program.md');
});
test('the entire graph fits both axes on narrow phones and landscape screens', () => {
  for (const [width, height] of [[320,568], [390,844], [430,932], [844,390]]) {
    const aspect = width / (height - 210);
    const distance = fittedDistance(110, aspect, 52);
    const angularRadius = Math.asin(110 / distance);
    const vertical = 26 * Math.PI / 180;
    assert.ok(angularRadius < vertical, `vertical fit at ${width}x${height}`);
    assert.ok(angularRadius < Math.atan(Math.tan(vertical) * aspect), `horizontal fit at ${width}x${height}`);
  }
});
test('small nodes have forgiving tap targets without selecting a distant or hidden node', () => {
  const nodes = [{id:'visible',x:100,y:100,z:0}, {id:'hidden',x:112,y:100,z:2}, {id:'next',x:150,y:100,z:0}];
  assert.equal(nearestTap(nodes, 117, 103), 'visible');
  assert.equal(nearestTap(nodes, 151, 102), 'next');
  assert.equal(nearestTap(nodes, 210, 100), null);
});
test('rotating and pinching do not accidentally open the reader', () => {
  assert.equal(isTap({x:100,y:100}, {x:103,y:104}, false), true);
  assert.equal(isTap({x:100,y:100}, {x:140,y:100}, false), false);
  assert.equal(isTap({x:100,y:100}, {x:100,y:100}, true), false);
  assert.equal(isTap(null, {x:100,y:100}, false), false);
});
