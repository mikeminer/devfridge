import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_QUALITY_TIERS, createQualityGovernor, observeFrame, formatQualityChange } from './quality-governor.mjs';
function window(state, fps) {
  const frameMs = 1000 / fps;
  let result;
  for (let frame = 0; frame < Math.ceil(3 * fps); frame++) {
    result = observeFrame(state, frameMs, state.lastNowMs + frameMs);
    state = result.state;
  }
  assert.ok(result.sample, 'completed a measurement window');
  return result;
}

test('3 s windows step down below 50, skip a settling window, and do not mutate input', () => {
  const initial = createQualityGovernor();
  const result = window(initial, 40);
  assert.equal(initial.tier, 0);
  assert.equal(result.state.tier, 1);
  assert.equal(result.event.reason, 'slow-window');
  const settle = window(result.state, 40);
  assert.equal(settle.event, null); assert.equal(settle.sample.skipped, true);
  assert.equal(window(settle.state, 40).state.tier, 2);
});

test('exactly 50 does not step down, exactly 58 does not count as a good window', () => {
  let state = createQualityGovernor({ initialTier: 2 });
  state = window(state, 50).state;
  state = window(state, 58).state;
  state = window(state, 58).state;
  assert.equal(state.tier, 2); assert.equal(state.goodWindows, 0);
});

test('two consecutive good windows step up; ordinary windows reset the streak', () => {
  let state = createQualityGovernor({ initialTier: 2 });
  state = window(state, 60).state;
  state = window(state, 55).state;
  state = window(state, 60).state;
  assert.equal(state.tier, 2);
  const result = window(state, 60);
  assert.equal(result.state.tier, 1); assert.equal(result.state.stepUpProbe, true);
  assert.equal(result.event.direction, 'up');
});

test('failed step-up blocks further step-ups for 30 seconds', () => {
  let state = createQualityGovernor({ initialTier: 2 });
  state = window(window(state, 60).state, 60).state;
  state = window(state, 40).state; // settling window is ignored
  const failed = window(state, 40);
  assert.equal(failed.event.reason, 'failed-step-up');
  assert.equal(failed.state.tier, 2);
  const blockedUntil = failed.state.lastNowMs + 30_000;
  assert.equal(failed.state.blockStepUpUntil, blockedUntil);
  state = failed.state;
  for (let i = 0; i < 9; i++) {
    state = window(state, 60).state;
    assert.equal(state.tier, 2);
  }
  // Floating time can miss the exact boundary by microseconds; advance the clock safely.
  state = observeFrame(state, 1000, blockedUntil + 1).state;
  assert.equal(window(state, 60).state.tier, 1);
});

test('large and zero gaps do not affect measured fps, 250 ms is measured', () => {
  const initial = createQualityGovernor();
  let state = observeFrame(initial, 3001, 3001).state;
  assert.equal(state.frames, 0); assert.equal(state.elapsedMs, 0);
  state = observeFrame(state, 0, 3001).state;
  assert.equal(state.frames, 0);
  state = observeFrame(state, 250, 3251).state;
  assert.equal(state.frames, 1); assert.equal(state.elapsedMs, 250);
  assert.throws(() => observeFrame(state, -1, 3252));
  assert.throws(() => observeFrame(state, 16, 3000));
});

test('tier bounds, log prefix, and degradation order remain stable', () => {
  assert.equal(window(createQualityGovernor({ tierCount: 1 }), 40).state.tier, 0);
  assert.equal(window(window(createQualityGovernor(), 60).state, 60).state.tier, 0);
  assert.equal(DEFAULT_QUALITY_TIERS[2].crowd, 32);
  assert.equal(DEFAULT_QUALITY_TIERS[6].shadowMap, 1024);
  assert.equal(DEFAULT_QUALITY_TIERS[7].dpr, 1.5);
  assert.equal(DEFAULT_QUALITY_TIERS.at(-1).dpr, 1);
  assert.match(formatQualityChange('Sample Game', { from: 1, to: 2, fps: 40, reason: 'slow-window' }), /^\[Sample Game\]/);
  assert.throws(() => formatQualityChange('Injected\nLog', {}));
});
