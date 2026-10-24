import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createFrameRecorder } from './frame-recorder.mjs';
import { evaluatePerformance, REQUIRED_CHECKS } from './performance-gate.mjs';
import { runCapture, matches, validateProfile, sha256 } from './scenario-runner.mjs';
import { validateBrowserManifest, fetchPinnedAssets, fulfillPinnedRequest } from './capture-release.mjs';

const HASH = 'a'.repeat(64), NOW = Date.UTC(2026, 9, 24, 12), serial = 'c'.repeat(64);
function telemetry(fps = 60) {
  const durationMs = 35000;
  const frames = Array.from({ length: fps * 35 }, (_, index) => ({ t: (index + .2) * 1000 / fps, frameId: index + 1, active: true }));
  return { schemaVersion: 1, sessionId: 'synthetic-test-only', source: 'committed-render-frames', startedAt: new Date(NOW - durationMs).toISOString(), endedAt: new Date(NOW).toISOString(), durationMs, frames, faults: [] };
}
function report(fps = 60) {
  return { schemaVersion: 1, fixture: true, platform: 'seeker', profileSha256: 'b'.repeat(64), build: { sha256: HASH, buildId: 'synthetic-build' },
    device: { class: 'physical-seeker', physical: true, collection: 'adb', modelConfirmedSeeker: true, installedArtifactSha256: HASH, serialSha256: serial, model: 'MOCK Seeker', os: 'MOCK Android', browser: 'MOCK WebView', renderer: 'MOCK GPU', observationId: 'synthetic-observation' },
    settings: { quality: 'high', dpr: 1, resolution: '1080x1920' }, warmupMs: 5000, minimumMeasurementMs: 30000, telemetry: telemetry(fps),
    scenario: { id: 'synthetic', worstCase: 'controlled synthetic workload, not device evidence', inputEvents: [{ atMs: 1, source: 'adb-input', action: { kind: 'tap', x: 1, y: 1, financial: false } }] },
    thermal: { soakMs: 600000, startedAtMs: NOW - 635000, artifactSha256: HASH, serialSha256: serial, workload: 'MOCK', observation: 'synthetic only' },
    checklist: Object.fromEntries(REQUIRED_CHECKS.map(key => [key, { status: 'passed', artifactSha256: HASH, serialSha256: serial, evidence: 'MOCK fixture only', observedAt: new Date(NOW).toISOString() }])) };
}
const gate = value => evaluatePerformance(value, { artifactSha256: HASH, platform: 'seeker', now: NOW });

test('50 FPS per complete second passes the numerical threshold; fixture can never authorize release', () => {
  const result = gate(report(50));
  assert.equal(result.performancePassed, true); assert.equal(result.minFps, 50); assert.equal(result.windowCount, 30);
  assert.equal(result.releaseReady, false); assert.deepEqual(result.reasons, ['Fixture or unclassified recording cannot authorize a release']);
  assert.equal(gate(report(49)).performancePassed, false);
});

test('empty, short, paused, hidden, stale, dropped or uncertain frame evidence is blocked', () => {
  const edits = [r => { r.telemetry.frames = []; }, r => { r.telemetry.frames[0] = null; }, r => { r.telemetry.frames[r.telemetry.frames.length - 1] = null; }, r => { r.telemetry.durationMs = 34000; }, r => { r.telemetry.frames[400].active = false; }, r => { r.telemetry.faults.push('visibility hidden'); }, r => { r.telemetry.frames.splice(700, 20); }, r => { r.telemetry.source = 'requestAnimationFrame-timer'; }, r => { r.telemetry.frames[300].frameId += 1; }];
  for (const edit of edits) { const r = report(); edit(r); assert.equal(gate(r).performancePassed, false); }
  const old = report(); old.telemetry.startedAt = new Date(NOW - 90000000).toISOString(); old.telemetry.endedAt = new Date(NOW - 89965000).toISOString(); assert.ok(gate(old).reasons.some(reason => reason.includes('stale')));
});

test('one slow window is not hidden by a high average or explicit warmup', () => {
  const r = report(60);
  r.telemetry.frames = r.telemetry.frames.filter(frame => frame.t < 12000 || frame.t >= 13000 || frame.frameId % 3 !== 0).map((frame, index) => ({ ...frame, frameId: index + 1 }));
  const result = gate(r); assert.equal(result.minFps, 40); assert.equal(result.performancePassed, false);
  const cold = report(); cold.telemetry.frames = cold.telemetry.frames.filter(frame => frame.t >= 5000 || frame.frameId % 2 === 0).map((frame, index) => ({ ...frame, frameId: index + 1 }));
  assert.equal(gate(cold).performancePassed, true);
});

test('rolling windows expose a slowdown hidden across two otherwise valid second boundaries', () => {
  const r = report(50);
  for (const frame of r.telemetry.frames) {
    const second = Math.floor(frame.t / 1000), offset = frame.t % 1000;
    if (second === 12) frame.t = 12000 + offset * .9;
    if (second === 13) frame.t = 13100 + offset * .9;
  }
  const result = gate(r);
  assert.ok(result.windows.every(count => count >= 50));
  assert.ok(result.rollingMinFps < 50); assert.equal(result.performancePassed, false);
});

test('candidate, hardware, settings, checklist and thermal provenance cannot be substituted', () => {
  for (const mutate of [r => { r.build.sha256 = 'd'.repeat(64); }, r => { r.device.class = 'desktop-browser'; }, r => { r.device.physical = false; }, r => { delete r.settings; }, r => { delete r.checklist.walletCancel; }, r => { r.thermal.soakMs = 599999; }, r => { r.checklist.coldStart.serialSha256 = 'f'.repeat(64); }]) {
    const r = report(); mutate(r); assert.ok(gate(r).reasons.length > 1);
  }
  for (const soakMs of [undefined, null, NaN, Infinity, '600000', 'not-a-number', 600000.5]) {
    const r = report(); r.thermal.soakMs = soakMs;
    assert.ok(gate(r).reasons.some(reason => reason.includes('thermal-soak')));
  }
});

test('frame observer records committed frames only and retains interruption/overflow faults', () => {
  let time = 0;
  const recorder = createFrameRecorder({ sessionId: 'fixture', now: () => time, wallNow: () => NOW + time, maxFrames: 2 });
  const state = { phase: 'gameplay', paused: false, foreground: true, visibility: 'visible' };
  time = 10; recorder.frame(1, state); time = 30; recorder.frame(2, state); recorder.interruption('hidden'); time = 50; recorder.frame(4, state);
  const output = recorder.stop(); assert.equal(output.frames.length, 2); assert.ok(output.faults.includes('hidden')); assert.ok(output.faults.includes('Frame buffer overflow')); assert.ok(output.faults.some(item => item.includes('render commit')));
  time = 70; recorder.frame(5, state); assert.equal(output.frames.length, 2);
});

function png(color) {
  const crc = buffer => { let c = -1; for (const byte of buffer) { c ^= byte; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ -1) >>> 0; };
  const chunk = (name, data) => { const type = Buffer.from(name), body = Buffer.concat([type, data]), header = Buffer.alloc(4), end = Buffer.alloc(4); header.writeUInt32BE(data.length); end.writeUInt32BE(crc(body)); return Buffer.concat([header, body, end]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1080); ihdr.writeUInt32BE(1920, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + 1080 * 3, color); row[0] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(1920).fill(row)))), chunk('IEND', Buffer.alloc(0))]);
}
function fixtureProfile() {
  const tap = { kind: 'tap', x: 1, y: 1, financial: false };
  return { schemaVersion: 1, captureStore: true, platform: 'browser', buildId: 'synthetic-build', performance: { id: 'worst-case', kind: 'gameplay', worstCase: 'synthetic only', timeoutMs: 1000, warmupMs: 5000, measurementMs: 30000, actions: [tap], ready: [{ path: 'phase', equals: 'gameplay' }, { path: 'visibleChallenges', gte: 1 }], inputs: [{ atMs: 0, action: tap }] }, stages: ['one', 'two', 'three', 'four'].map(id => ({ id, kind: 'gameplay', caption: 'SYNTHETIC TEST ONLY', timeoutMs: 1000, actions: [tap], ready: [{ path: 'phase', equals: 'gameplay' }, { path: 'visibleChallenges', gte: 1 }] })) };
}
function fixtureDriver({ ready = true, duplicate = false } = {}) {
  let time = 0, shots = 0, recordStart;
  return { fixture: true, inputSource: 'browser-input', now: () => time, wallNow: () => NOW + time, sleep: async ms => { time += Math.max(1, ms); }, identity: async () => ({ buildId: 'synthetic-build', settings: { quality: 'test', dpr: 1, resolution: '1080x1920' } }), device: async () => ({ class: 'fixture', collection: 'browser-runtime', model: 'SYNTHETIC', os: 'SYNTHETIC', browser: 'SYNTHETIC', renderer: 'SYNTHETIC', observationId: 'fixture' }), readState: async () => ({ phase: 'gameplay', paused: false, foreground: true, visibility: 'visible', financialApprovalPending: false, visibleChallenges: ready ? 1 : 0 }), input: async () => {}, startRecording: async () => { recordStart = time; }, stopRecording: async () => { const data = telemetry(); data.startedAt = new Date(NOW + recordStart).toISOString(); data.endedAt = new Date(NOW + time).toISOString(); return data; }, screenshot: async () => png(duplicate ? 50 : 50 + shots++), close: async () => {} };
}

test('scenario runner drives inputs and captures four ready raw frames with immutable hashes and fixture status', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-fixture-'));
  try {
    const profile = fixtureProfile(), out = path.join(root, 'run');
    const result = await runCapture({ profile, profileBytes: Buffer.from(JSON.stringify(profile)), artifactSha256: HASH, driver: fixtureDriver(), outDir: out });
    assert.equal(result.captures.length, 4); assert.equal(result.fixture, true); assert.equal(result.performanceAssessment.performancePassed, true); assert.equal(result.performanceAssessment.releaseReady, false);
    assert.equal(result.composed.status, 'not-run'); assert.equal(result.humanVisualReview, 'required');
    for (const capture of result.captures) assert.equal(sha256(await fs.readFile(path.join(out, capture.filename))), capture.sha256);
    await assert.rejects(runCapture({ profile, profileBytes: Buffer.from('{}'), artifactSha256: HASH, driver: fixtureDriver(), outDir: out }), /existing artifacts/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('missing actual readiness and duplicate pixels fail instead of capturing empty launch frames', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-reject-'));
  try {
    const profile = fixtureProfile();
    for (const [id, driver, pattern] of [['missing', fixtureDriver({ ready: false }), /Readiness timeout/], ['duplicate', fixtureDriver({ duplicate: true }), /Duplicate capture pixels/]]) {
      const outDir = path.join(root, id);
      await assert.rejects(runCapture({ profile, profileBytes: Buffer.from('{}'), artifactSha256: HASH, driver, outDir }), pattern);
      assert.equal(JSON.parse(await fs.readFile(path.join(outDir, 'capture-failure.json'))).status, 'blocked');
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('a workload disappearing after initial readiness blocks the performance run', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-workload-'));
  try {
    const profile = fixtureProfile(), driver = fixtureDriver(), read = driver.readState;
    driver.readState = async () => ({ ...await read(), visibleChallenges: driver.now() > 1000 ? 0 : 1 });
    await assert.rejects(runCapture({ profile, profileBytes: Buffer.from('{}'), artifactSha256: HASH, driver, outDir: path.join(root, 'run') }), /declared visible workload/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('explicit performance-only mode needs no screenshots, font or compositor', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'performance-only-'));
  try {
    const profile = fixtureProfile(); profile.captureStore = false; profile.stages = [];
    const driver = fixtureDriver(); driver.screenshot = () => { throw new Error('Screenshots must not be requested'); };
    const outDir = path.join(root, 'run');
    const result = await runCapture({ profile, profileBytes: Buffer.from(JSON.stringify(profile)), artifactSha256: HASH, driver, outDir, compose: () => { throw new Error('Composition must not be requested'); } });
    assert.equal(result.captures.length, 0); assert.equal(result.composed.status, 'not-requested');
    assert.equal(result.performanceAssessment.performancePassed, true); assert.equal(result.performanceAssessment.releaseReady, false);
    assert.equal(result.humanVisualReview, 'not-applicable-no-images');
    await fs.access(path.join(outDir, 'performance.json')); await assert.rejects(fs.access(path.join(outDir, 'captions.json')));
    const invalid = fixtureProfile(); invalid.captureStore = false; assert.throws(() => validateProfile(invalid), /stages/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('profile is generic, has bounded readiness, rejects wallet actions and does not execute predicates', () => {
  validateProfile(fixtureProfile());
  const bad = fixtureProfile(); bad.performance.inputs[0].action.financial = true; assert.throws(() => validateProfile(bad), /non-financial/);
  assert.equal(matches({ phase: 'gameplay', visibleChallenges: 2 }, [{ path: 'visibleChallenges', gte: 1 }]), true);
  assert.equal(matches({}, [{ path: '__proto__.constructor', equals: 'bad' }]), false);
});

test('browser manifest requires a pinned entrypoint and unique exact same-origin resources', () => {
  const profile = { url: 'https://example.test/', buildId: 'synthetic' };
  const manifest = { buildId: 'synthetic', entrypoint: profile.url, files: [{ url: profile.url, sha256: sha256(Buffer.from('fixture HTML')), contentType: 'text/html' }] };
  assert.equal(validateBrowserManifest(manifest, profile), manifest);
  for (const mutate of [m => { delete m.entrypoint; }, m => { m.files[0].url = 'https://elsewhere.test/'; }, m => { m.files.push({ ...m.files[0] }); }, m => { m.files.push({ ...m.files[0], url: 'https://example.test/duplicate' }); }, m => { m.files[0].contentType = 'text/javascript'; }]) {
    const copy = structuredClone(manifest); mutate(copy); assert.throws(() => validateBrowserManifest(copy, profile));
  }
});

test('runtime receives pinned verified bytes and rejects unlisted executable or write requests', async () => {
  const bytes = Buffer.from('<!doctype html>SYNTHETIC TEST ONLY');
  const manifest = { files: [{ url: 'https://example.test/', sha256: sha256(bytes), contentType: 'text/html' }] };
  let liveBytes = bytes;
  const request = { get: async () => ({ status: () => 200, headers: () => ({}), body: async () => liveBytes }) };
  const pinned = await fetchPinnedAssets(manifest, request);
  liveBytes = Buffer.from('changed after fetch');
  const faults = []; let served;
  const route = (url, method = 'GET') => ({ request: () => ({ url: () => url, method: () => method }), fulfill: async response => { served = response; }, abort: async () => { served = 'aborted'; } });
  await fulfillPinnedRequest(route('https://example.test/'), pinned, faults);
  assert.deepEqual(served.body, bytes); assert.equal(served.headers['cache-control'], 'no-store');
  await fulfillPinnedRequest(route('https://example.test/unlisted.js'), pinned, faults); assert.equal(served, 'aborted');
  await fulfillPinnedRequest(route('https://example.test/', 'POST'), pinned, faults); assert.equal(served, 'aborted'); assert.equal(faults.length, 2);
  await assert.rejects(fetchPinnedAssets(manifest, request), /exact browser candidate/);
});
