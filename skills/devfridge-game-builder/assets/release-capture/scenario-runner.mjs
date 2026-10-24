import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { evaluatePerformance } from './performance-gate.mjs';

export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export function matches(state, conditions) {
  return Array.isArray(conditions) && conditions.length > 0 && conditions.every(condition => {
    const keys = typeof condition.path === 'string' ? condition.path.split('.') : [];
    if (!keys.length || keys.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) return false;
    let value = state;
    for (const key of keys) { if (!value || !Object.hasOwn(value, key)) return false; value = value[key]; }
    if (Object.hasOwn(condition, 'equals')) return value === condition.equals;
    if (Object.hasOwn(condition, 'gte')) return Number.isFinite(value) && value >= condition.gte;
    if (Object.hasOwn(condition, 'gt')) return Number.isFinite(value) && value > condition.gt;
    return false;
  });
}

export function validateAction(action) {
  if (!action || action.financial !== false || !['click', 'key', 'tap', 'swipe'].includes(action.kind)) throw new Error('Only explicitly non-financial real input actions are supported');
  if (action.kind === 'click' && (typeof action.selector !== 'string' || !action.selector || action.selector.length > 300)) throw new Error('Click requires a bounded selector');
  if (action.kind === 'key' && (typeof action.key !== 'string' || !/^[A-Za-z0-9+_-]{1,40}$/.test(action.key))) throw new Error('Invalid key');
  if (action.holdMs !== undefined && (!Number.isInteger(action.holdMs) || action.holdMs < 0 || action.holdMs > 1000)) throw new Error('Key hold must be bounded to 0–1000 ms');
  if (action.kind === 'tap' && ![action.x, action.y].every(value => Number.isInteger(value) && value >= 0 && value <= 10000)) throw new Error('Invalid tap coordinates');
  if (action.kind === 'swipe' && (![action.x, action.y, action.toX, action.toY].every(value => Number.isInteger(value) && value >= 0 && value <= 10000) || !Number.isInteger(action.durationMs) || action.durationMs < 1 || action.durationMs > 1000)) throw new Error('Invalid swipe');
}

export function validateProfile(profile) {
  if (!profile || profile.schemaVersion !== 1 || !['browser', 'seeker'].includes(profile.platform) || !profile.buildId || /[<>]/.test(profile.buildId)) throw new Error('Complete the profile identity and target first');
  if (typeof profile.captureStore !== 'boolean') throw new Error('Choose captureStore true for requested Store images, or false for performance evidence only');
  if (!Array.isArray(profile.stages) || (!profile.captureStore && profile.stages.length !== 0)) throw new Error('Performance-only profiles must use stages: []');
  if (profile.captureStore && (profile.stages.length < 4 || profile.stages.length > 8 || new Set(profile.stages.map(stage => stage.id)).size !== profile.stages.length)) throw new Error('Capture 4–8 uniquely named stages');
  if (profile.captureStore && !profile.stages.some(stage => stage.kind === 'gameplay')) throw new Error('At least one stage must show actual gameplay');
  for (const stage of [...profile.stages, profile.performance]) {
    if (!stage || !/^[a-z0-9-]{1,60}$/.test(stage.id || '') || !Array.isArray(stage.ready) || !stage.ready.length || !Number.isInteger(stage.timeoutMs) || stage.timeoutMs < 100 || stage.timeoutMs > 120000) throw new Error('Each stage needs an ID, state predicates and a bounded timeout');
    if (stage.kind === 'gameplay' && !stage.ready.some(rule => rule.path === 'phase' && rule.equals === 'gameplay')) throw new Error('Gameplay capture requires gameplay state');
    if (stage.kind === 'gameplay' && stage.ready.length < 2) throw new Error('Add a game-specific visible-readiness predicate, not only phase');
    for (const action of stage.actions || []) validateAction(action);
  }
  for (const stage of profile.stages) if (typeof stage.caption !== 'string' || !stage.caption.trim() || stage.caption.length > 110) throw new Error('Every capture needs a short truthful caption');
  const perf = profile.performance;
  if (!Number.isInteger(perf.warmupMs) || perf.warmupMs < 5000 || !Number.isInteger(perf.measurementMs) || perf.measurementMs < 30000 || perf.warmupMs + perf.measurementMs > 600000 || !perf.worstCase || perf.kind !== 'gameplay') throw new Error('Performance needs 5s+ warmup, 30s+ measured play and an identified worst-case workload');
  if (!Array.isArray(perf.inputs) || !perf.inputs.length) throw new Error('Configure an actual gameplay input schedule');
  let previous = -1;
  for (const item of perf.inputs) {
    if (!Number.isFinite(item.atMs) || item.atMs < 0 || item.atMs < previous || item.atMs >= perf.warmupMs + perf.measurementMs) throw new Error('Input times must be ordered and within the recording');
    validateAction(item.action); previous = item.atMs;
  }
}

async function safeState(driver) {
  const state = await driver.readState();
  if (!state || state.financialApprovalPending !== false || state.foreground !== true || state.visibility !== 'visible') throw new Error('Unexpected wallet approval, background activity or missing live-state evidence');
  return state;
}

export async function waitReady(driver, stage) {
  const deadline = driver.now() + stage.timeoutMs;
  while (driver.now() <= deadline) {
    const state = await safeState(driver);
    if (matches(state, stage.ready)) return state;
    await driver.sleep(Math.min(100, Math.max(1, deadline - driver.now())));
  }
  throw new Error('Readiness timeout: ' + stage.id);
}

export function pngSize(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || buffer.subarray(12, 16).toString() !== 'IHDR') throw new Error('Driver did not return an unmodified PNG capture');
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (!width || !height || width > 10000 || height > 10000) throw new Error('Unsupported screenshot dimensions');
  return { width, height };
}

export async function runCapture({ profile, profileBytes, artifactSha256, driver, outDir, checklist = {}, thermal = {}, compose }) {
  validateProfile(profile);
  if (!/^[a-f0-9]{64}$/.test(artifactSha256)) throw new Error('Exact candidate SHA-256 required');
  const output = path.resolve(outDir);
  try { await fs.lstat(output); throw new Error('Choose a new output directory; existing artifacts are never overwritten'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(output, { recursive: true });
  try {
  const inputEvents = [];
  const settingsTimeline = [];
  const start = driver.now();
  const input = async action => { await safeState(driver); await driver.input(action); inputEvents.push({ atMs: driver.now() - start, action, source: driver.inputSource, observedAt: new Date(driver.wallNow()).toISOString() }); };
  const identity = await driver.identity();
  if (identity.buildId !== profile.buildId) throw new Error('Running build identity does not match the capture profile');
  const device = await driver.device(artifactSha256);
  const perf = profile.performance;
  for (const action of perf.actions || []) await input(action);
  await waitReady(driver, perf);
  await driver.startRecording();
  const recordStart = driver.now();
  let cursor = 0;
  while (driver.now() - recordStart < perf.warmupMs + perf.measurementMs) {
    const elapsed = driver.now() - recordStart;
    const state = await safeState(driver);
    if (state.phase !== 'gameplay' || state.paused !== false) throw new Error('Benchmark left active gameplay; retain a failed run and rerun after fixing the scenario');
    if (!matches(state, perf.ready)) throw new Error('Benchmark left its declared visible workload; do not benchmark an empty scene after readiness');
    if (state.settings && JSON.stringify(settingsTimeline.at(-1)?.settings) !== JSON.stringify(state.settings)) settingsTimeline.push({ atMs: elapsed, settings: state.settings });
    while (cursor < perf.inputs.length && perf.inputs[cursor].atMs <= elapsed) await input(perf.inputs[cursor++].action);
    await driver.sleep(Math.min(100, perf.warmupMs + perf.measurementMs - (driver.now() - recordStart)));
  }
  const telemetry = await driver.stopRecording();
  const performance = { schemaVersion: 1, fixture: driver.fixture !== false, platform: profile.platform, profileSha256: sha256(profileBytes), build: { sha256: artifactSha256, buildId: profile.buildId }, device, settings: identity.settings, settingsTimeline, scenario: { id: perf.id, worstCase: perf.worstCase, inputEvents }, warmupMs: perf.warmupMs, minimumMeasurementMs: perf.measurementMs, telemetry, checklist, thermal };
  const assessment = evaluatePerformance(performance, { artifactSha256, platform: profile.platform, now: driver.wallNow() });
  await fs.writeFile(path.join(output, 'performance.json'), JSON.stringify(performance, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'performance-assessment.json'), JSON.stringify(assessment, null, 2) + '\n');
  const captures = [];
  for (const stage of profile.stages) {
    for (const action of stage.actions || []) await input(action);
    const deadline = driver.now() + stage.timeoutMs;
    let taken = false;
    while (driver.now() <= deadline) {
      const before = await waitReady(driver, { ...stage, timeoutMs: Math.max(1, deadline - driver.now()) });
      const pixels = await driver.screenshot();
      const after = await safeState(driver);
      if (!matches(after, stage.ready)) { await driver.sleep(50); continue; }
      const size = pngSize(pixels);
      const digest = sha256(pixels);
      if (captures.some(capture => capture.sha256 === digest)) throw new Error('Duplicate capture pixels; supply distinct real game states');
      const filename = `${stage.id}-raw.png`;
      await fs.writeFile(path.join(output, filename), pixels, { flag: 'wx' });
      captures.push({ id: stage.id, filename, sha256: digest, ...size, caption: stage.caption, conditions: stage.ready, before, after, observedAt: new Date(driver.wallNow()).toISOString() });
      taken = true; break;
    }
    if (!taken) throw new Error('Game state changed before a valid screenshot: ' + stage.id);
  }
  if (profile.captureStore) {
    const captions = captures.map((capture, index) => ({ image: capture.filename, caption: capture.caption, output: `${String(index + 1).padStart(2, '0')}-${capture.id}.jpg` }));
    await fs.writeFile(path.join(output, 'captions.json'), JSON.stringify(captions, null, 2) + '\n');
  }
  const composed = profile.captureStore ? (compose ? await compose(output) : { status: 'not-run' }) : { status: 'not-requested' };
  const manifest = { schemaVersion: 1, fixture: driver.fixture !== false, build: performance.build, profileSha256: performance.profileSha256, platform: profile.platform, device, captures, inputEvents, composed, performanceAssessment: assessment, humanVisualReview: profile.captureStore ? 'required' : 'not-applicable-no-images' };
  await fs.writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
  } catch (error) {
    await fs.writeFile(path.join(output, 'capture-failure.json'), JSON.stringify({ schemaVersion: 1, status: 'blocked', fixture: driver.fixture !== false, observedAt: new Date(driver.wallNow()).toISOString(), reason: String(error.message).replace(/https?:\/\/\S+/g, '[URL redacted]'), artifactSha256 }, null, 2) + '\n', { flag: 'wx' });
    throw error;
  }
}
