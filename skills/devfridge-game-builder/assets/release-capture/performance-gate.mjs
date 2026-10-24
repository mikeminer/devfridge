#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_CHECKS = ['coldStart', 'upgradeWithoutDataLoss', 'pauseResume', 'backgroundForeground', 'screenLock', 'processRestart', 'walletConnect', 'walletCancel', 'walletReturn', 'networkLoss', 'thermalWorstCase'];
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = value => typeof value === 'string' && value.trim() && !/[<>]/.test(value);

/** Assess reported evidence, not an anti-forgery attestation or a GPU benchmark. */
export function evaluatePerformance(report, { artifactSha256, platform, now = Date.now(), maxAgeHours = 24 } = {}) {
  const reasons = [];
  const performanceReasons = [];
  const fail = reason => reasons.push(reason);
  const perfFail = reason => { performanceReasons.push(reason); fail(reason); };
  if (!report || report.schemaVersion !== 1) return { schemaVersion: 1, status: 'blocked', releaseReady: false, performancePassed: false, reasons: ['Unsupported or missing evidence schema'], minFps: null, windowCount: 0 };
  if (!hash(artifactSha256) || report.build?.sha256 !== artifactSha256) fail('Evidence does not match the exact candidate artifact SHA-256');
  if (!['browser', 'seeker'].includes(platform) || report.platform !== platform) fail('Evidence platform does not match release target');
  if (report.fixture !== false) fail('Fixture or unclassified recording cannot authorize a release');
  if (!hash(report.profileSha256) || !nonempty(report.build?.buildId) || !nonempty(report.scenario?.id) || !nonempty(report.scenario?.worstCase)) fail('Missing build, profile or worst-case scenario provenance');
  if (!Array.isArray(report.scenario?.inputEvents) || report.scenario.inputEvents.length === 0 || report.scenario.inputEvents.some(event => !Number.isFinite(event.atMs) || event.atMs < 0 || !['browser-input', 'adb-input'].includes(event.source) || !event.action || event.action.financial !== false || !['click', 'key', 'tap', 'swipe'].includes(event.action.kind))) fail('No valid recorded real-input scenario');
  if (!report.settings || typeof report.settings !== 'object' || !nonempty(report.settings.quality) || !Number.isFinite(report.settings.dpr) || report.settings.dpr <= 0 || !nonempty(report.settings.resolution)) fail('Missing measured graphics settings');
  const device = report.device;
  if (!device || !nonempty(device.model) || !nonempty(device.os) || !nonempty(device.browser) || !nonempty(device.renderer) || !nonempty(device.observationId)) fail('Missing hardware/browser/renderer identity');
  if (platform === 'seeker' && (!device || device.class !== 'physical-seeker' || device.physical !== true || device.collection !== 'adb' || device.installedArtifactSha256 !== artifactSha256 || device.modelConfirmedSeeker !== true || !hash(device.serialSha256))) fail('A Seeker release requires observed physical Seeker evidence for the installed candidate; desktop/emulator evidence is insufficient');
  if (platform === 'browser' && !['browser-runtime', 'adb'].includes(device?.collection)) fail('Unsupported browser evidence collector');
  const start = Date.parse(report.telemetry?.startedAt);
  const end = Date.parse(report.telemetry?.endedAt);
  const freshness = Math.min(Number(maxAgeHours), 24) * 3600000;
  if (!Number.isFinite(now) || !Number.isFinite(freshness) || freshness <= 0 || !Number.isFinite(start) || !Number.isFinite(end) || end < start || end > now + 60000 || now - end > freshness) fail('Evidence is stale, future-dated or lacks valid timing');
  const telemetry = report.telemetry || {};
  const warmup = report.warmupMs;
  const duration = telemetry.durationMs;
  const minimum = Math.max(30000, Number(report.minimumMeasurementMs) || 0);
  if (!Number.isFinite(warmup) || warmup < 5000 || !Number.isFinite(duration) || duration - warmup < minimum) perfFail('Recording needs explicit warmup of at least 5 seconds and at least 30 seconds of measured active play');
  if (Number.isFinite(duration) && Number.isFinite(start) && Number.isFinite(end) && Math.abs(end - start - duration) > 2000) perfFail('Wall and monotonic recording durations disagree');
  if (telemetry.source !== 'committed-render-frames' || !nonempty(telemetry.sessionId) || !Array.isArray(telemetry.faults) || telemetry.faults.length) perfFail('Unsupported or interrupted render recording');
  const frames = telemetry.frames;
  const buckets = [];
  let rollingMinFps = null, rollingWindowCount = 0;
  const windows = Number.isFinite(duration) && Number.isFinite(warmup) ? Math.floor((duration - warmup) / 1000) : 0;
  if (!Array.isArray(frames) || !frames.length || frames.length > 120000) perfFail('No usable render samples or unsupported recording size');
  else {
    let previous = null;
    for (const frame of frames) {
      if (!frame || !Number.isFinite(frame.t) || frame.t < 0 || frame.t > duration || !Number.isSafeInteger(frame.frameId) || frame.active !== true) { perfFail('Malformed or non-active foreground frame'); break; }
      if (previous && (frame.t <= previous.t || frame.t - previous.t > 250 || frame.frameId !== previous.frameId + 1)) { perfFail('Missing, reordered or >250 ms frame gap; do not erase stalls or background intervals'); break; }
      previous = frame;
    }
    if (!frames[0] || !frames.at(-1) || !Number.isFinite(frames[0]?.t) || !Number.isFinite(frames.at(-1)?.t) || frames[0].t > 250 || duration - frames.at(-1).t > 250) perfFail('Unobserved start or tail of recording');
    if (windows > 0 && windows <= 3600) {
      buckets.push(...Array(windows).fill(0));
      for (const frame of frames.filter(frame => frame && Number.isFinite(frame.t))) {
        const bucket = Math.floor((frame.t - warmup) / 1000);
        if (bucket >= 0 && bucket < windows) buckets[bucket]++;
      }
      if (buckets.some(fps => fps < 50)) perfFail('At least one measured one-second window is below 50 FPS');
      // Also slide past every frame boundary: aligned buckets must not conceal
      // a slow interval straddling two adjacent seconds. 0.1 microsecond handles
      // floating point equality, not actual render-time jitter.
      const times = frames.filter(frame => frame && Number.isFinite(frame.t)).map(frame => frame.t);
      const anchors = [warmup, ...times.filter(t => t >= warmup && t + 1000 + 0.0001 <= duration).map(t => t + 0.0001)];
      let left = 0, right = 0;
      rollingMinFps = Infinity;
      for (const anchor of anchors) {
        while (left < times.length && times[left] < anchor) left++;
        if (right < left) right = left;
        while (right < times.length && times[right] < anchor + 1000) right++;
        rollingMinFps = Math.min(rollingMinFps, right - left); rollingWindowCount++;
      }
      if (rollingMinFps < 50) perfFail('A rolling one-second window straddling measurement buckets is below 50 FPS');
    } else perfFail('No complete valid measurement windows');
  }
  if (platform === 'seeker') {
    const thermal = report.thermal;
    if (!thermal || !Number.isSafeInteger(thermal.soakMs) || thermal.soakMs < 600000 || !Number.isFinite(thermal.startedAtMs) || thermal.startedAtMs > start || start - thermal.startedAtMs < thermal.soakMs || start - thermal.startedAtMs > 3600000 || thermal.artifactSha256 !== artifactSha256 || thermal.serialSha256 !== device?.serialSha256 || !nonempty(thermal.workload) || !nonempty(thermal.observation)) fail('Missing representative thermal-soak evidence for this candidate/device (at least 10 minutes)');
    for (const key of REQUIRED_CHECKS) {
      const check = report.checklist?.[key];
      if (check?.status !== 'passed' || check.artifactSha256 !== artifactSha256 || check.serialSha256 !== device?.serialSha256 || !nonempty(check.evidence) || !Number.isFinite(Date.parse(check.observedAt)) || now - Date.parse(check.observedAt) > freshness || Date.parse(check.observedAt) > now + 60000) fail('Missing fresh physical Seeker checklist evidence: ' + key);
    }
  }
  const releaseReady = reasons.length === 0;
  return { schemaVersion: 1, status: releaseReady ? 'passed' : 'blocked', releaseReady, performancePassed: performanceReasons.length === 0, artifactSha256: report.build?.sha256 || null, platform: report.platform, reasons: [...new Set(reasons)], minFps: buckets.length ? Math.min(...buckets, rollingMinFps ?? Infinity) : null, windowCount: buckets.length, windows: buckets, rollingWindowCount, rollingMinFps };
}

function main(argv) {
  if (!argv.length || argv.includes('--help')) { console.log('Usage: node performance-gate.mjs --report performance.json --artifact-sha256 <64hex> --platform browser|seeker [--max-age-hours 24]\nExit 0 only when fresh candidate-bound release evidence passes. Fixtures never authorize a release.'); return; }
  const args = Object.fromEntries(Array.from({ length: Math.ceil(argv.length / 2) }, (_, i) => [argv[i * 2], argv[i * 2 + 1]]));
  try {
    const file = args['--report'];
    if (!file || fs.statSync(file).size > 32 * 1024 * 1024) throw new Error('Missing or oversized report');
    const result = evaluatePerformance(JSON.parse(fs.readFileSync(file, 'utf8')), { artifactSha256: args['--artifact-sha256'], platform: args['--platform'], maxAgeHours: Number(args['--max-age-hours'] || 24) });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.releaseReady ? 0 : 1;
  } catch { console.log(JSON.stringify({ schemaVersion: 1, status: 'blocked', releaseReady: false, reasons: ['Unreadable or malformed performance report'] })); process.exitCode = 1; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
