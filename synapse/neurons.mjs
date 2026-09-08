import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const AXON_STEPS = 14;

// A single mesh per note keeps picking, colour changes and disposal inexpensive.
export function neuronGeometry(radius, seed = 0, compact = false) {
  const random = seededRandom(seed), parts = [], synapses = [];
  const soma = new THREE.SphereGeometry(radius, compact ? 12 : 18, 12);
  const positions = soma.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(positions, i);
    const organic = 1 + .12 * Math.sin(p.x / radius * 3 + seed) * Math.cos(p.y / radius * 2);
    positions.setXYZ(i, p.x * organic, p.y * organic * 1.28, p.z * organic * .85);
  }
  soma.computeVertexNormals(); parts.push(soma);
  const count = compact ? 4 : 5;
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, angle = i * 2.399963 + random() * .8;
    const direction = new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle));
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const root = direction.clone().multiplyScalar(radius * .55);
    const joint = direction.clone().multiplyScalar(radius * (2.1 + random())).addScaledVector(side, radius * (random() - .5));
    const tip = direction.clone().multiplyScalar(radius * (3.7 + random())).addScaledVector(side, radius * (random() - .5));
    parts.push(taperedBranch([root, joint, tip], radius * .38, radius * .10, compact ? 7 : 10));
    for (const sign of [-1, 1]) {
      const fork = tip.clone().addScaledVector(direction, radius * 1.1).addScaledVector(side, sign * radius * (.9 + random()));
      const end = fork.clone().addScaledVector(direction, radius * (1 + random())).addScaledVector(side, sign * radius * .65);
      parts.push(taperedBranch([tip, fork, end], radius * .11, radius * .025, compact ? 5 : 8));
      synapses.push(end.toArray());
      if (!compact) {
        const twig = fork.clone().addScaledVector(side, -sign * radius * 1.2).addScaledVector(direction, radius * .7);
        parts.push(taperedBranch([fork, fork.clone().lerp(twig, .5).addScaledVector(direction, radius * .2), twig], radius * .05, radius * .012, 4));
      }
    }
  }
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  geometry.userData.synapses = synapses;
  geometry.computeBoundingSphere();
  return geometry;
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

function taperedBranch(points, start, end, segments) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, segments, start, 5, false);
  const position = geometry.attributes.position;
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments, center = curve.getPointAt(t), scale = (start + (end - start) * t) / start;
    for (let side = 0; side <= 5; side++) {
      const index = ring * 6 + side;
      const p = new THREE.Vector3().fromBufferAttribute(position, index).sub(center).multiplyScalar(scale).add(center);
      position.setXYZ(index, p.x, p.y, p.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function tissuePosition(seed) {
  const random = seededRandom(seed);
  return new THREE.Vector3((random() - .5) * 270, (random() - .5) * 160, (random() - .5) * 210);
}

export function synapseTerminal(object, toward) {
  const direction = toward.clone().sub(object.position).normalize();
  let best = null, score = -Infinity;
  for (const terminal of object.geometry.userData.synapses ?? []) {
    const local = new THREE.Vector3(...terminal);
    const dot = local.clone().normalize().dot(direction);
    if (dot > score) { score = dot; best = local; }
  }
  return best ? best.multiplyScalar(object.scale.x).add(object.position) : object.position.clone();
}

// Write into an existing line buffer; no geometry allocation during simulation.
export function writeAxon(buffer, offset, source, target, seed = 0) {
  const dx = target.x - source.x, dy = target.y - source.y, dz = target.z - source.z;
  const length = Math.hypot(dx, dy, dz);
  const bend = Math.min(14, length * .16) * (seed % 2 ? -1 : 1);
  const xy = Math.hypot(dx, dy);
  const bx = xy > .001 ? -dy / xy * bend : bend;
  const by = xy > .001 ? dx / xy * bend : 0;
  const bz = bend * .4 * Math.sin(seed);
  for (let step = 0; step < AXON_STEPS; step++) {
    for (const t of [step / AXON_STEPS, (step + 1) / AXON_STEPS]) {
      const arc = 4 * t * (1 - t);
      buffer[offset++] = source.x + dx * t + bx * arc;
      buffer[offset++] = source.y + dy * t + by * arc;
      buffer[offset++] = source.z + dz * t + bz * arc;
    }
  }
  return offset;
}
