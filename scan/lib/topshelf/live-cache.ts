import type { MergeGame } from "./engine/core";
import type { RunTicket } from "./score-protocol";

const MAX = 150;
const worlds = new Map<string, { rev: number; game: MergeGame; at: number }>();

function id(t: RunTicket) {
  return `${t.contract}:${t.runId}`;
}

function evict() {
  while (worlds.size > MAX) {
    let oldest: string | null = null;
    let at = Infinity;
    for (const [k, v] of worlds) {
      if (v.at < at) {
        at = v.at;
        oldest = k;
      }
    }
    if (!oldest) break;
    worlds.get(oldest)?.game.dispose();
    worlds.delete(oldest);
  }
}

export function takeCachedWorld(t: RunTicket, revision: number): MergeGame | null {
  const key = id(t);
  const hit = worlds.get(key);
  if (!hit || hit.rev !== revision) return null;
  worlds.delete(key);
  return hit.game;
}

export function rememberWorld(t: RunTicket, revision: number, game: MergeGame) {
  const key = id(t);
  const prev = worlds.get(key);
  if (prev && prev.game !== game) prev.game.dispose();
  worlds.set(key, { rev: revision, game, at: Date.now() });
  evict();
}

export function forgetWorld(t: RunTicket) {
  const key = id(t);
  const prev = worlds.get(key);
  prev?.game.dispose();
  worlds.delete(key);
}

export function cachedWorldCount() {
  return worlds.size;
}
