import {initPhysics, MergeGame, type Replay} from './core';
export const MAX_RUN_TICKS = 216_000;
export function checkedReplay(value: unknown, endTick: unknown): {replay: Replay; ticks: number} {
  const r = value as Replay;
  if (!r || r.version !== 1 || !Number.isSafeInteger(r.seed) || r.seed < 1 || r.seed > 0xffffffff || !Number.isInteger(r.favourite) || r.favourite < 1 || r.favourite > 10 || !Array.isArray(r.inputs) || !r.inputs.length || r.inputs.length > 8000 || !Number.isSafeInteger(endTick) || Number(endTick) < 1 || Number(endTick) > MAX_RUN_TICKS) throw Error('Invalid or oversized replay');
  let previous = -28;
  const inputs = r.inputs.map(input => {
    if (!input || !Number.isSafeInteger(input.tick) || input.tick < 0 || input.tick >= Number(endTick) || input.tick - previous < 28 || !Number.isFinite(input.x) || Math.abs(input.x) > 3 || Math.abs(input.x * 1000 - Math.round(input.x * 1000)) > 1e-7) throw Error('Invalid replay input');
    previous = input.tick; return {tick:input.tick, x:input.x};
  });
  return {replay:{version:1,seed:r.seed,favourite:r.favourite,inputs},ticks:Number(endTick)};
}
export async function verifyReplay(value: unknown, ticks: unknown, budgetMs = 35000) {
  const input = checkedReplay(value,ticks); await initPhysics();
  const game = new MergeGame(input.replay.seed,input.replay.favourite), start = performance.now();
  let cursor = 0;
  try {
    while (game.tick < input.ticks && game.status === 'playing') {
      const next = input.replay.inputs[cursor];
      if (next?.tick === game.tick) {
        if (!game.drop(next.x) || game.inputs[game.inputs.length-1].x !== next.x) throw Error('Impossible drop');
        cursor++;
      }
      game.step(); game.events.length = 0;
      if (game.tick % 600 === 0 && performance.now() - start > budgetMs) throw Error('Replay verification timed out');
    }
    if (game.tick !== input.ticks || cursor !== input.replay.inputs.length || game.status === 'playing') throw Error('Replay is not a completed run');
    return {score:game.score,status:game.status,ticks:game.tick};
  } finally {game.dispose();}
}
