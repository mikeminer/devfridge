import RAPIER from '@dimforge/rapier3d-compat';

export interface CastMember {
  tier: number; id: string; name: string; color: string; emoji: string;
  glb: string; png: string; wav: string; voice: string; sfx: string; theme: string; line: string;
  token: null | { mint: string; symbol: string; decimals: number; program: string };
  clips: Record<string, string>; expressions: string[];
}
export const STEP = 1 / 60;
export const DOOR_LINE = 7.65;
export const SPAWN_Y = 8.45;
export const HALF_WIDTH = 2.95;
// The brief's literal width multipliers exceed the container at tier 7.
// These preserve its progression, calibrated to the playable six-unit interior.
export const RADII = [.27, .35, .44, .55, .67, .8, .94, 1.08, 1.24, 1.4];
export const SHELVES = [
  { x: -1.88, y: 5.85, width: 2.04 },
  { x: 1.84, y: 4.12, width: 2.12 },
  { x: -1.83, y: 2.5, width: 2.14 },
];
export function dailySeed(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => Number(parts.find(p => p.type === name)!.value);
  return Math.floor((Date.UTC(part('year'), part('month') - 1, part('day')) - Date.UTC(2026, 0, 1)) / 86400000) + 1;
}
export function seededRandom(seed: number) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function validateCast(value: unknown): CastMember[] {
  const cast = (value as { cast?: CastMember[] })?.cast;
  if (!Array.isArray(cast) || cast.length < 10) throw new Error('The cast needs at least ten characters.');
  const ids = new Set();
  cast.forEach((c, i) => {
    if (c.tier !== i + 1 || !c.id || ids.has(c.id)) throw new Error('Cast tiers must be ordered and IDs unique.');
    ids.add(c.id);
    for (const field of ['glb', 'png', 'wav', 'voice', 'sfx', 'theme', 'name', 'emoji', 'color'] as const) {
      if (typeof c[field] !== 'string' || !c[field]) throw new Error(`Missing ${field} for ${c.id}`);
    }
  });
  return cast;
}
export interface Piece {
  id: number; tier: number; radius: number; body: RAPIER.RigidBody;
  previous: { x: number; y: number; z: number }; born: number; danger: number;
}
export type GameEvent = { type: 'drop' | 'merge' | 'over' | 'win'; id?: number; tier?: number; x?: number; y?: number; combo?: number };
export interface Replay { version: 1; seed: number; favourite: number; inputs: { tick: number; x: number }[] }
let initialized: Promise<void> | undefined;
export function initPhysics() { return initialized ??= RAPIER.init(); }

/** Ranked client and verifier cross the same serialization boundary after every accepted drop. */
export function checkpointPhysics(game: MergeGame) {
  const handles = [...game.pieces.values()].map(piece => ({piece,handle:piece.body.handle}));
  const restored = RAPIER.World.restoreSnapshot(game.world.takeSnapshot());
  if (!restored) throw new Error('Could not restore ranked physics checkpoint.');
  game.world.free(); game.world = restored;
  for (const {piece,handle} of handles) piece.body = restored.getRigidBody(handle);
}

export class MergeGame {
  world: RAPIER.World;
  pieces = new Map<number, Piece>();
  score = 0; combo = 0; merges = 0; tick = 0; nextId = 1; lastDrop = -100;
  lastMerge = -1000; status: 'playing' | 'over' | 'won' = 'playing';
  discovered = new Set<number>(); events: GameEvent[] = []; queue: number[] = [];
  inputs: Replay['inputs'] = []; random: () => number;
  constructor(public seed: number, public favourite = 1) {
    if (!Number.isInteger(favourite) || favourite < 1 || favourite > 10) throw new Error('Invalid favourite tier.');
    this.random = seededRandom(seed);
    this.world = new RAPIER.World({ x: 0, y: -12, z: 0 });
    this.world.timestep = STEP;
    this.box(0, 1.08, 6, .18);
    this.box(-3.1, 5, .25, 9.5); this.box(3.1, 5, .25, 9.5);
    SHELVES.forEach(s => this.box(s.x, s.y, s.width, .08));
    // CICCIA is a kitchen avatar; the final boss must still be earned by merging.
    this.queue.push(favourite === 10 ? 1 : favourite); for (let i = 0; i < 5; i++) this.queue.push(this.roll());
  }
  private box(x: number, y: number, w: number, h: number) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, 1.5).setTranslation(x, y, 0).setFriction(.48));
  }
  private roll() { const r = this.random(); return r < .48 ? 1 : r < .8 ? 2 : 3; }
  get ready() { return this.status === 'playing' && this.tick - this.lastDrop >= 28 && this.pieces.size < 40; }
  get next() { return this.queue[0]; }
  get highest() { return Math.max(1, ...this.discovered); }
  clampX(x: number, tier = this.next) { const r = RADII[tier - 1]; return Math.max(-HALF_WIDTH + r, Math.min(HALF_WIDTH - r, x)); }
  spawn(tier: number, x: number, y: number): Piece {
    const radius = RADII[tier - 1];
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, 0).enabledTranslations(true, true, false).lockRotations().setLinearDamping(.38).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setRestitution(.12).setFriction(.42).setDensity(1), body);
    const piece = { id: this.nextId++, tier, radius, body, previous: { x, y, z: 0 }, born: this.tick, danger: 0 };
    this.pieces.set(piece.id, piece); return piece;
  }
  drop(x: number) {
    if (!this.ready || !Number.isFinite(x)) return false;
    x = Math.round(this.clampX(x) * 1000) / 1000;
    const tier = this.queue.shift()!; this.queue.push(this.roll());
    const piece = this.spawn(tier, x, SPAWN_Y);
    this.lastDrop = this.tick; this.inputs.push({ tick: this.tick, x });
    this.events.push({ type: 'drop', id: piece.id, tier, x, y: SPAWN_Y });
    return true;
  }
  step() {
    if (this.status !== 'playing') return;
    this.tick++;
    this.pieces.forEach(p => p.previous = { ...p.body.translation() });
    this.world.step();
    const merged = new Set<number>();
    const pieces = [...this.pieces.values()];
    for (let i = 0; i < pieces.length; i++) {
      const a = pieces[i]; if (merged.has(a.id) || a.tier >= 9) continue;
      for (let j = i + 1; j < pieces.length; j++) {
        const b = pieces[j]; if (b.tier !== a.tier || merged.has(b.id)) continue;
        let touching = false;
        this.world.contactPair(a.body.collider(0), b.body.collider(0), manifold => { if (manifold.numSolverContacts() > 0) touching = true; });
        if (!touching) continue;
        const pa = a.body.translation(), pb = b.body.translation();
        const x = this.clampX((pa.x + pb.x) / 2, a.tier + 1), y = (pa.y + pb.y) / 2;
        merged.add(a.id); merged.add(b.id);
        this.world.removeRigidBody(a.body); this.world.removeRigidBody(b.body);
        this.pieces.delete(a.id); this.pieces.delete(b.id);
        const result = this.spawn(a.tier + 1, x, y);
        this.combo = this.tick - this.lastMerge <= 90 ? this.combo + 1 : 1;
        this.lastMerge = this.tick; this.merges++;
        this.score += 10 * 2 ** (result.tier - 1) * this.combo;
        this.discovered.add(a.tier); this.discovered.add(result.tier);
        this.events.push({ type: 'merge', id: result.id, tier: result.tier, x, y, combo: this.combo });
        if (result.tier === 9) { this.status = 'won'; this.discovered.add(10); this.events.push({ type: 'win' }); return; }
        break;
      }
    }
    for (const p of this.pieces.values()) {
      const pos = p.body.translation(); const vel = p.body.linvel();
      const restingOverLine = pos.y + p.radius > DOOR_LINE && this.tick - p.born > 85 && Math.hypot(vel.x, vel.y) < .35;
      p.danger = restingOverLine ? p.danger + STEP : 0;
      if (p.danger >= 1.4) { this.status = 'over'; this.events.push({ type: 'over' }); return; }
    }
    // Reaching the safety cap ends only after the final piece has had time to settle.
    if (this.pieces.size >= 40 && this.tick - this.lastDrop > 180) { this.status = 'over'; this.events.push({ type: 'over' }); }
  }
  replay(): Replay { return { version: 1, seed: this.seed, favourite: this.favourite, inputs: this.inputs.map(i => ({ ...i })) }; }
  dispose() { this.world.free(); this.pieces.clear(); }
}

export function shareText(seed: number, discovered: Set<number>, score: number, cast: CastMember[], link: string, mode = 'Local practice') {
  return `DevFridge Cold Storage #${seed}\n${cast.slice(0, 10).map(c => discovered.has(c.tier) ? c.emoji : '⬛').join('')}\n${score.toLocaleString('en-US')} pts · ${mode}\n${link}`;
}
