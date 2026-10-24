/** Call frame() once AFTER a real rendered gameplay frame, never from a timer.
 * This observer does not advance, freeze or grant access to the game.
 */
export function createFrameRecorder({ sessionId, now = () => performance.now(), wallNow = () => Date.now(), maxFrames = 120000 } = {}) {
  if (typeof sessionId !== 'string' || !sessionId || !Number.isInteger(maxFrames) || maxFrames < 1) throw new Error('A session ID and positive frame capacity are required');
  const start = now();
  const startedAt = new Date(wallNow()).toISOString();
  const frames = [];
  const faults = [];
  let previousId = null;
  let previousTime = -1;
  let stopped = false;
  function frame(frameId, state) {
    if (stopped) return;
    const t = now() - start;
    if (!Number.isSafeInteger(frameId) || (previousId !== null && frameId !== previousId + 1)) faults.push('Missing, duplicate or reordered render commit');
    if (!Number.isFinite(t) || t <= previousTime) faults.push('Non-monotonic frame clock');
    if (!state || state.phase !== 'gameplay' || state.paused !== false || state.foreground !== true || state.visibility !== 'visible') faults.push('Frame outside foreground active gameplay');
    previousId = frameId;
    previousTime = t;
    if (frames.length >= maxFrames) { faults.push('Frame buffer overflow'); return; }
    frames.push({ t, frameId, active: state?.phase === 'gameplay' && state?.paused === false && state?.foreground === true && state?.visibility === 'visible' });
  }
  function interruption(reason) {
    faults.push(typeof reason === 'string' && reason ? reason : 'Unclassified recording interruption');
  }
  function snapshot() {
    return { schemaVersion: 1, sessionId, source: 'committed-render-frames', startedAt, endedAt: new Date(wallNow()).toISOString(), durationMs: now() - start, frames: frames.map(value => ({ ...value })), faults: [...new Set(faults)] };
  }
  return Object.freeze({ frame, interruption, snapshot, stop() { const result = snapshot(); stopped = true; return result; } });
}
