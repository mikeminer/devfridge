// Pure adaptive controller: callers apply settings and log returned events.
// Example caps, not promises about any device. Replace with measured game-specific tiers.
export const DEFAULT_QUALITY_TIERS = Object.freeze([
  { detailedCharacters: 7, crowd: 32, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 5, crowd: 32, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 32, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 22, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 16, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 14, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 10, shadowMap: 1024, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 10, shadowMap: 512, dpr: 1.5 },
  { detailedCharacters: 4, crowd: 10, shadowMap: 512, dpr: 1.25 },
  { detailedCharacters: 4, crowd: 10, shadowMap: 512, dpr: 1 },
].map(Object.freeze));

export function createQualityGovernor({ tierCount = DEFAULT_QUALITY_TIERS.length, initialTier = 0, nowMs = 0 } = {}) {
  if (!Number.isInteger(tierCount) || tierCount < 1 || !Number.isInteger(initialTier) || initialTier < 0 || initialTier >= tierCount || !Number.isFinite(nowMs) || nowMs < 0) throw Error('Invalid quality configuration');
  return Object.freeze({ tierCount, tier: initialTier, elapsedMs: 0, frames: 0, goodWindows: 0, skipWindows: 0, stepUpProbe: false, blockStepUpUntil: 0, lastNowMs: nowMs });
}

/** Feed one rendered frame interval using a monotonic clock (performance.now()).
 * >250 ms gaps do not count towards the 3 s measured window. Never catch up hidden frames.
 * Returns a fresh frozen state and optional event; never logs or mutates scene objects.
 */
export function observeFrame(state, frameMs, nowMs) {
  if (!state || !Number.isFinite(frameMs) || frameMs < 0 || !Number.isFinite(nowMs) || nowMs < state.lastNowMs) throw Error('Invalid frame interval or non-monotonic clock');
  const next = { ...state, lastNowMs: nowMs };
  if (frameMs === 0 || frameMs > 250) return { state: Object.freeze(next), event: null, sample: null };
  next.elapsedMs += frameMs; next.frames++;
  if (next.elapsedMs < 3000 - 1e-6) return { state: Object.freeze(next), event: null, sample: null };
  const fps = next.frames * 1000 / next.elapsedMs;
  next.elapsedMs = 0; next.frames = 0;
  if (next.skipWindows > 0) {
    next.skipWindows--; next.goodWindows = 0;
    return { state: Object.freeze(next), event: null, sample: { fps, skipped: true } };
  }
  let event = null;
  if (fps < 50 - 1e-9) {
    next.goodWindows = 0;
    const failedStepUp = next.stepUpProbe;
    if (failedStepUp) next.blockStepUpUntil = nowMs + 30_000;
    next.stepUpProbe = false;
    if (next.tier < next.tierCount - 1) {
      next.tier++; next.skipWindows = 1;
      event = { from: state.tier, to: next.tier, direction: 'down', fps, reason: failedStepUp ? 'failed-step-up' : 'slow-window' };
    }
  } else {
    // The first measured window after the settling window decides a step-up probe.
    next.stepUpProbe = false;
    next.goodWindows = fps > 58 + 1e-9 ? next.goodWindows + 1 : 0;
    if (next.goodWindows >= 2 && next.tier > 0 && nowMs >= next.blockStepUpUntil) {
      next.tier--; next.goodWindows = 0; next.skipWindows = 1; next.stepUpProbe = true;
      event = { from: state.tier, to: next.tier, direction: 'up', fps, reason: 'two-good-windows' };
    }
  }
  return { state: Object.freeze(next), event, sample: { fps, skipped: false } };
}

export function formatQualityChange(gameName, event) {
  if (typeof gameName !== 'string' || !gameName.trim() || /[\r\n\[\]]/.test(gameName)) throw Error('Use a plain game name');
  if (!event) return null;
  return `[${gameName}] quality ${event.from} -> ${event.to}: ${event.fps.toFixed(1)} fps (${event.reason})`;
}
