import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const AXON_STEPS = 10;

// A single mesh per note keeps picking, colour changes and disposal inexpensive.
export function neuronGeometry(radius, seed = 0, compact = false) {
  const parts = [];
  const soma = new THREE.SphereGeometry(radius, compact ? 12 : 16, 10);
  soma.scale(1.1, .88, 1);
  parts.push(soma);
  const phase = (seed >>> 0) / 4294967296 * Math.PI * 2;
  const count = compact ? 5 : 6;
  const up = new THREE.Vector3(0, 1, 0);
  const segment = (from, to, startRadius, endRadius) => {
    const delta = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(endRadius, startRadius, delta.length(), 5, 1, false);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, delta.normalize()));
    geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    parts.push(geometry);
  };
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count;
    const angle = i * 2.399963 + phase;
    const direction = new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle));
    const sideways = new THREE.Vector3().crossVectors(direction, Math.abs(y) > .8 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    const root = direction.clone().multiplyScalar(radius * .65);
    const joint = direction.clone().multiplyScalar(radius * 1.75).addScaledVector(sideways, radius * .18 * Math.sin(i + phase));
    const tip = direction.clone().multiplyScalar(radius * (2.6 + .3 * Math.sin(i + phase))).addScaledVector(sideways, radius * .45);
    segment(root, joint, radius * .32, radius * .17);
    segment(joint, tip, radius * .17, radius * .075);
    for (const side of [-1, 1]) {
      const fork = tip.clone().addScaledVector(direction, radius * .55).addScaledVector(sideways, side * radius * .55);
      const end = fork.clone().addScaledVector(direction, radius * .5).addScaledVector(sideways, side * radius * .35);
      segment(tip, fork, radius * .075, radius * .04);
      segment(fork, end, radius * .04, radius * .012);
    }
  }
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  geometry.computeBoundingSphere();
  return geometry;
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
