import RAPIER from "@dimforge/rapier3d-compat";

export const STEP = 1 / 60;
export const DOOR_LINE = 7.65;
export const SPAWN_Y = 8.45;
export const HALF_WIDTH = 2.95;
export const RADII = [0.27, 0.35, 0.44, 0.55, 0.67, 0.8, 0.94, 1.08, 1.24, 1.4];
export const SHELVES = [
  { x: -1.88, y: 5.85, width: 2.04 },
  { x: 1.84, y: 4.12, width: 2.12 },
  { x: -1.83, y: 2.5, width: 2.14 },
];

export function dailySeed(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name) => Number(parts.find((p) => p.type === name).value);
  return Math.floor((Date.UTC(part("year"), part("month") - 1, part("day")) - Date.UTC(2026, 0, 1)) / 86400000) + 1;
}

export function seededRandom(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let initialized;
export function initPhysics() {
  return (initialized ??= RAPIER.init());
}

export class MergeGame {
  constructor(seed, favourite = 1) {
    this.seed = seed;
    this.favourite = favourite;
    this.random = seededRandom(seed);
    this.world = new RAPIER.World({ x: 0, y: -12, z: 0 });
    this.world.timestep = STEP;
    this.pieces = new Map();
    this.score = 0;
    this.combo = 0;
    this.merges = 0;
    this.tick = 0;
    this.nextId = 1;
    this.lastDrop = -100;
    this.lastMerge = -1000;
    this.status = "playing";
    this.discovered = new Set();
    this.events = [];
    this.queue = [];
    this.box(0, 1.08, 6, 0.18);
    this.box(-3.1, 5, 0.25, 9.5);
    this.box(3.1, 5, 0.25, 9.5);
    SHELVES.forEach((s) => this.box(s.x, s.y, s.width, 0.08));
    this.queue.push(favourite === 10 ? 1 : favourite);
    for (let i = 0; i < 5; i++) this.queue.push(this.roll());
  }
  box(x, y, w, h) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, 1.5).setTranslation(x, y, 0).setFriction(0.48));
  }
  roll() {
    const r = this.random();
    return r < 0.48 ? 1 : r < 0.8 ? 2 : 3;
  }
  get ready() {
    return this.status === "playing" && this.tick - this.lastDrop >= 28 && this.pieces.size < 40;
  }
  get next() {
    return this.queue[0];
  }
  clampX(x, tier = this.next) {
    const r = RADII[tier - 1];
    return Math.max(-HALF_WIDTH + r, Math.min(HALF_WIDTH - r, x));
  }
  spawn(tier, x, y) {
    const radius = RADII[tier - 1];
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, 0)
        .enabledTranslations(true, true, false)
        .lockRotations()
        .setLinearDamping(0.38)
        .setCcdEnabled(true),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setRestitution(0.12).setFriction(0.42).setDensity(1), body);
    const piece = { id: this.nextId++, tier, radius, body, born: this.tick, danger: 0 };
    this.pieces.set(piece.id, piece);
    return piece;
  }
  drop(x) {
    if (!this.ready || !Number.isFinite(x)) return false;
    x = Math.round(this.clampX(x) * 1000) / 1000;
    const tier = this.queue.shift();
    this.queue.push(this.roll());
    const piece = this.spawn(tier, x, SPAWN_Y);
    this.lastDrop = this.tick;
    this.events.push({ type: "drop", id: piece.id, tier, x, y: SPAWN_Y });
    return true;
  }
  step() {
    if (this.status !== "playing") return;
    this.tick++;
    this.world.step();
    const merged = new Set();
    const pieces = [...this.pieces.values()];
    for (let i = 0; i < pieces.length; i++) {
      const a = pieces[i];
      if (merged.has(a.id) || a.tier >= 9) continue;
      for (let j = i + 1; j < pieces.length; j++) {
        const b = pieces[j];
        if (b.tier !== a.tier || merged.has(b.id)) continue;
        let touching = false;
        this.world.contactPair(a.body.collider(0), b.body.collider(0), (manifold) => {
          if (manifold.numSolverContacts() > 0) touching = true;
        });
        if (!touching) continue;
        const pa = a.body.translation();
        const pb = b.body.translation();
        const x = this.clampX((pa.x + pb.x) / 2, a.tier + 1);
        const y = (pa.y + pb.y) / 2;
        merged.add(a.id);
        merged.add(b.id);
        this.world.removeRigidBody(a.body);
        this.world.removeRigidBody(b.body);
        this.pieces.delete(a.id);
        this.pieces.delete(b.id);
        const result = this.spawn(a.tier + 1, x, y);
        this.combo = this.tick - this.lastMerge <= 90 ? this.combo + 1 : 1;
        this.lastMerge = this.tick;
        this.merges++;
        this.score += 10 * 2 ** (result.tier - 1) * this.combo;
        this.discovered.add(a.tier);
        this.discovered.add(result.tier);
        this.events.push({ type: "merge", id: result.id, tier: result.tier, x, y, combo: this.combo });
        if (result.tier === 9) {
          this.status = "won";
          this.discovered.add(10);
          this.events.push({ type: "win" });
          return;
        }
        break;
      }
    }
    for (const p of this.pieces.values()) {
      const pos = p.body.translation();
      const vel = p.body.linvel();
      const restingOverLine = pos.y + p.radius > DOOR_LINE && this.tick - p.born > 85 && Math.hypot(vel.x, vel.y) < 0.35;
      p.danger = restingOverLine ? p.danger + STEP : 0;
      if (p.danger >= 1.4) {
        this.status = "over";
        this.events.push({ type: "over" });
        return;
      }
    }
    if (this.pieces.size >= 40 && this.tick - this.lastDrop > 180) {
      this.status = "over";
      this.events.push({ type: "over" });
    }
  }
  dispose() {
    this.world.free();
    this.pieces.clear();
  }
}
