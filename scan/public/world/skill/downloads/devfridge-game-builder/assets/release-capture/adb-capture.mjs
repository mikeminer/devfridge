/** USB/device adapter: observed installed APK, real input and native screenshot.
 * Reads a game-owned, locally enabled evidence export; never injects gameplay.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { sha256 } from './scenario-runner.mjs';
const execute = promisify(execFile);

export async function createAdbDriver({ profile, artifactSha256, adb = 'adb', serial }) {
  if (!serial || !/^[A-Za-z0-9._:-]+$/.test(serial) || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(profile.package || '')) throw new Error('Select one actual device serial and the final package explicitly');
  if (!profile.expectedSeekerModel || /[<>]/.test(profile.expectedSeekerModel)) throw new Error('Record and confirm the actual Seeker model before testing');
  const args = ['-s', serial];
  const run = async (command, binary = false) => (await execute(adb, [...args, ...command], { encoding: binary ? 'buffer' : 'utf8', timeout: 15000, maxBuffer: binary ? 256 * 1024 * 1024 : 32 * 1024 * 1024 })).stdout;
  const model = (await run(['shell', 'getprop', 'ro.product.model'])).trim();
  const os = (await run(['shell', 'getprop', 'ro.build.version.release'])).trim();
  const hardware = (await run(['shell', 'getprop', 'ro.hardware'])).trim();
  const emulator = (await run(['shell', 'getprop', 'ro.kernel.qemu'])).trim();
  if (model !== profile.expectedSeekerModel || emulator === '1' || /ranchu|goldfish/i.test(hardware)) throw new Error('Connected hardware is not the confirmed physical Seeker');
  const packagePaths = (await run(['shell', 'pm', 'path', profile.package])).trim().split(/\r?\n/);
  if (packagePaths.length !== 1 || !/^package:\/data\/app\/[A-Za-z0-9_./=+~-]+\.apk$/.test(packagePaths[0])) throw new Error('Cannot establish one installed candidate APK; split/system/unknown installs need a separate verified adapter');
  const installed = await run(['exec-out', 'cat', packagePaths[0].slice(8)], true);
  if (sha256(installed) !== artifactSha256) throw new Error('Installed APK differs from the candidate');
  const evidencePath = `/sdcard/Android/data/${profile.package}/files/release-capture/latest.json`;
  const read = async () => {
    const snapshot = JSON.parse(await run(['exec-out', 'cat', evidencePath]));
    if (snapshot.schemaVersion !== 1 || snapshot.buildId !== profile.buildId || !Number.isFinite(Date.parse(snapshot.observedAt)) || Math.abs(Date.now() - Date.parse(snapshot.observedAt)) > 2000) throw new Error('Native evidence export is missing, stale or from another build');
    return snapshot;
  };
  let base, hostStart;
  const driver = {
    fixture: false, inputSource: 'adb-input', now: () => performance.now(), wallNow: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    identity: async () => { const snapshot = await read(); return { buildId: snapshot.buildId, settings: snapshot.settings, renderer: snapshot.renderer }; },
    readState: async () => {
      const snapshot = await read();
      const activity = await run(['shell', 'dumpsys', 'activity', 'activities']);
      const focused = activity.split(/\r?\n/).some(line => /mResumedActivity|topResumedActivity|mFocusedApp/.test(line) && line.includes(profile.package + '/'));
      return { ...snapshot.state, foreground: focused && snapshot.state?.foreground === true };
    },
    device: async () => { const snapshot = await read(); return { class: 'physical-seeker', physical: true, collection: 'adb', modelConfirmedSeeker: true, model, os, hardware, browser: snapshot.browser, renderer: snapshot.renderer, observationId: crypto.randomUUID(), serialSha256: sha256(Buffer.from(serial)), installedArtifactSha256: artifactSha256 }; },
    startRecording: async () => { base = (await read()).telemetry; hostStart = performance.now(); if (!base || !base.sessionId) throw new Error('Enable the game-owned frame observer before starting this test'); },
    stopRecording: async () => {
      const target = base.durationMs + performance.now() - hostStart;
      const deadline = performance.now() + 5000;
      let final;
      do { final = (await read()).telemetry; if (final?.sessionId !== base.sessionId) throw new Error('Native recording session changed'); if (final.durationMs >= target) break; await driver.sleep(100); } while (performance.now() < deadline);
      if (!final || final.durationMs < target) throw new Error('Native export did not observe the complete run');
      const startedAtMs = Date.parse(base.startedAt) + base.durationMs;
      return { ...final, startedAt: new Date(startedAtMs).toISOString(), endedAt: new Date(startedAtMs + target - base.durationMs).toISOString(), durationMs: target - base.durationMs, frames: final.frames.filter(frame => frame.t >= base.durationMs && frame.t <= target).map(frame => ({ ...frame, t: frame.t - base.durationMs })) };
    },
    input: async action => {
      if (action.kind === 'tap') await run(['shell', 'input', 'tap', String(action.x), String(action.y)]);
      else if (action.kind === 'swipe') await run(['shell', 'input', 'swipe', String(action.x), String(action.y), String(action.toX), String(action.toY), String(action.durationMs)]);
      else if (action.kind === 'key' && ['BACK', 'ENTER', 'SPACE', 'DPAD_LEFT', 'DPAD_RIGHT', 'DPAD_UP', 'DPAD_DOWN'].includes(action.key)) await run(['shell', 'input', 'keyevent', 'KEYCODE_' + action.key]);
      else throw new Error('Native capture uses explicit tap/swipe or approved key codes, not browser selectors');
    },
    screenshot: () => run(['exec-out', 'screencap', '-p'], true),
    close: async () => {},
  };
  return driver;
}
