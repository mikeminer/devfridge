import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Materials = Record<'paint' | 'ivory' | 'metal' | 'dark' | 'rubber' | 'glass' | 'light' | 'red' | 'wood' | 'road', THREE.MeshStandardMaterial>;

export function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object);
  return object;
}

export function rounded(parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0, radius = .06) {
  return mesh(parent, new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3)), material, x, y, z);
}

function cylinder(parent: THREE.Object3D, radius: number, height: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(parent, new THREE.CylinderGeometry(radius, radius, height, 24), material, x, y, z);
}

function ring(parent: THREE.Object3D, radius: number, tube: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(parent, new THREE.TorusGeometry(radius, tube, 8, 32), material, x, y, z);
}

function label(parent: THREE.Object3D, text: string, width: number, height: number, x: number, y: number, z: number) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e5dfc9'; context.fillRect(0, 0, 256, 128);
  context.fillStyle = '#263127'; context.font = 'bold 68px monospace'; context.textAlign = 'center'; context.fillText(text, 128, 84);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .65 });
  return mesh(parent, new THREE.PlaneGeometry(width, height), material, x, y, z);
}

/** Original articulated model: painted shell, exposed joints, visor and boot soles. */
function robot(parent: THREE.Object3D, m: Materials) {
  const actor = new THREE.Group(); parent.add(actor);
  rounded(actor, .72, .62, .48, m.ivory, 0, 1.07, 0, .16);
  rounded(actor, .49, .29, .045, m.paint, 0, 1.1, .258);
  label(actor, '01', .25, .125, 0, 1.1, .284);
  cylinder(actor, .21, .12, m.dark, 0, .73);
  rounded(actor, .45, .17, .36, m.metal, 0, .67);
  cylinder(actor, .13, .12, m.metal, 0, 1.43);
  mesh(actor, new THREE.SphereGeometry(.36, 32, 20), m.ivory, 0, 1.75).scale.set(1.08, .93, .94);
  rounded(actor, .58, .24, .15, m.glass, 0, 1.77, .26, .1);
  for (const side of [-1, 1]) {
    rounded(actor, .1, .04, .025, m.light, side * .135, 1.79, .344);
    const ear = cylinder(actor, .12, .07, m.metal, side * .38, 1.75); ear.rotation.z = Math.PI / 2;
    const bolt = cylinder(actor, .055, .012, m.dark, side * .423, 1.75); bolt.rotation.z = Math.PI / 2;
    rounded(actor, .13, .37, .18, m.dark, side * .19, 1.1, -.31);
    cylinder(actor, .1, .38, m.metal, side * .19, 1.13, -.36);
  }
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .19, .64, 0); actor.add(leg); legs.push(leg);
    mesh(leg, new THREE.SphereGeometry(.115, 16, 12), m.metal);
    rounded(leg, .18, .22, .2, m.ivory, 0, -.17, 0);
    mesh(leg, new THREE.SphereGeometry(.105, 16, 12), m.dark, 0, -.31);
    rounded(leg, .2, .19, .21, m.paint, 0, -.43);
    rounded(leg, .27, .13, .4, m.rubber, 0, -.57, .075);
    rounded(leg, .27, .06, .34, m.metal, 0, -.515, .05);
    const arm = new THREE.Group(); arm.position.set(side * .44, 1.29, 0); actor.add(arm); arms.push(arm);
    mesh(arm, new THREE.SphereGeometry(.14, 16, 12), m.metal);
    rounded(arm, .19, .25, .22, m.ivory, 0, -.2);
    mesh(arm, new THREE.SphereGeometry(.1, 16, 12), m.dark, 0, -.35);
    rounded(arm, .17, .22, .2, m.paint, 0, -.48);
    rounded(arm, .18, .16, .19, m.dark, 0, -.64);
    for (const z of [-.04, .04]) rounded(arm, .035, .13, .04, m.metal, side * .095, -.65, z);
  }
  actor.scale.setScalar(1.18);
  return { actor, animate: (time: number, running: boolean) => {
    const pace = running ? Math.sin(time * 5) * .38 : Math.sin(time * 1.4) * .035;
    legs.forEach((leg, i) => { leg.rotation.x = pace * (i ? -1 : 1); });
    arms.forEach((arm, i) => { arm.rotation.x = pace * (i ? 1 : -1); arm.rotation.z = (i ? -1 : 1) * .08; });
    actor.position.y = running ? Math.abs(Math.sin(time * 5)) * .035 : Math.sin(time * 1.4) * .018;
  } };
}

/** Compact sports car with wheel treads, brake hubs, glazing, lamps and spoiler. */
function car(parent: THREE.Object3D, m: Materials) {
  const actor = new THREE.Group(); parent.add(actor);
  rounded(actor, 1.1, .22, 2.25, m.dark, 0, .32, 0, .1);
  rounded(actor, 1.22, .34, 2.15, m.paint, 0, .52, 0, .16);
  rounded(actor, 1.08, .11, .82, m.paint, 0, .73, .57, .06).rotation.x = -.08;
  rounded(actor, .86, .37, .94, m.glass, 0, .88, -.18, .16);
  rounded(actor, .86, .05, .55, m.paint, 0, 1.055, -.27);
  for (const x of [-.16, .16]) rounded(actor, .085, .015, .77, m.ivory, x, .796, .56, .004).rotation.x = -.08;
  for (const side of [-1, 1]) {
    rounded(actor, .12, .08, .24, m.metal, side * .66, .84, .05);
    rounded(actor, .3, .07, .05, m.light, side * .38, .6, 1.082);
    rounded(actor, .33, .06, .04, m.red, side * .37, .61, -1.083);
    rounded(actor, .04, .18, .04, m.metal, side * .4, .85, -.91);
    rounded(actor, .035, .035, .18, m.metal, side * .607, .63, -.24);
    for (const z of [-.72, .69]) {
      const wheel = new THREE.Group(); wheel.position.set(side * .6, .32, z); actor.add(wheel);
      const tire = cylinder(wheel, .285, .2, m.rubber); tire.rotation.z = Math.PI / 2;
      const hub = cylinder(wheel, .19, .215, m.metal); hub.rotation.z = Math.PI / 2;
      const brake = cylinder(wheel, .135, .22, m.dark); brake.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const spoke = rounded(wheel, .225, .025, .32, m.metal, 0, 0, 0, .008); spoke.rotation.x = i * Math.PI / 5;
      }
      for (const x of [-.065, 0, .065]) { const tread = ring(wheel, .282, .009, m.dark, x); tread.rotation.y = Math.PI / 2; }
    }
  }
  rounded(actor, 1.22, .065, .26, m.dark, 0, .96, -.93);
  rounded(actor, .55, .11, .04, m.dark, 0, .44, 1.095);
  label(actor, 'DF', .23, .1, 0, .54, 1.11);
  actor.scale.setScalar(.9);
  return actor;
}

function crate(parent: THREE.Object3D, m: Materials, x: number, z: number, size = .75) {
  const group = new THREE.Group(); group.position.set(x, .03, z); parent.add(group);
  rounded(group, size, size, size, m.wood, 0, size / 2, 0, .025);
  for (const side of [-1, 1]) {
    rounded(group, size + .035, .055, size + .035, m.metal, 0, size * (side < 0 ? .13 : .87), 0, .01);
    rounded(group, .055, size, size + .04, m.metal, side * size * .34, size / 2, 0, .01);
  }
  return group;
}

function arch(parent: THREE.Object3D, m: Materials, z: number) {
  for (const x of [-1.75, 1.75]) {
    rounded(parent, .32, 2.65, .42, m.metal, x, 1.32, z);
    rounded(parent, .045, 2.2, .045, m.light, x * .9, 1.34, z + .23, .01);
    rounded(parent, .6, .13, .66, m.dark, x, .065, z);
  }
  rounded(parent, 3.8, .38, .46, m.dark, 0, 2.63, z);
  label(parent, 'DEVFRIDGE', 1.5, .28, 0, 2.65, z + .24);
}

export function buildConcept(world: THREE.Group, genre: string, m: Materials) {
  rounded(world, 7.3, .4, 7.3, m.wood, 0, -.28, 0, .12);
  rounded(world, 7.18, .09, 7.18, m.metal, 0, -.035, 0, .05);
  rounded(world, 6.98, .035, 6.98, m.road, 0, .027, 0, .015);
  for (const x of [-3.48, 3.48]) for (const z of [-3.48, 3.48]) cylinder(world, .04, .02, m.metal, x, .025, z);
  const drift = genre === 'drift', arena = genre === 'arena' || genre === 'season';
  if (drift) {
    const island = cylinder(world, 1.18, .14, m.wood, 0, .1);
    island.receiveShadow = true;
    cylinder(world, 1.08, .035, m.dark, 0, .19);
    const badge = label(world, 'DF / 01', 1.5, .65, 0, .215, 0); badge.rotation.x = -Math.PI / 2;
    for (const radius of [1.4, 3.06]) {
      const border = ring(world, radius, .025, m.ivory, 0, .061); border.rotation.x = -Math.PI / 2;
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const dash = rounded(world, .035, .007, .19, m.ivory, Math.sin(a) * 2.23, .061, Math.cos(a) * 2.23, .003); dash.rotation.y = a + Math.PI / 2;
    }
    const actor = car(world, m);
    for (const x of [-3.15, 3.15]) for (const z of [-2.9, 2.9]) {
      rounded(world, .35, .05, .35, m.rubber, x, .08, z);
      mesh(world, new THREE.ConeGeometry(.13, .44, 20), m.paint, x, .31, z);
      cylinder(world, .079, .08, m.ivory, x, .32, z);
    }
    return (t: number) => { const a = .3 + t * .25; actor.position.set(Math.sin(a) * 2.22, .065, Math.cos(a) * 2.22); actor.rotation.y = a + Math.PI / 2 + .12; };
  }
  const unit = robot(world, m); unit.actor.position.z = .55; unit.actor.rotation.y = .28;
  if (arena) {
    const boundary = ring(world, 2.3, .025, m.light, 0, .062); boundary.rotation.x = -Math.PI / 2;
    for (const side of [-1, 1]) {
      crate(world, m, side * 2.55, -2, .95);
      rounded(world, .45, 1.8, .45, m.metal, side * 2.8, .9, 1.9);
      mesh(world, new THREE.SphereGeometry(.18, 20, 12), m.light, side * 2.8, 1.95, 1.9);
    }
    const drone = new THREE.Group(); world.add(drone);
    mesh(drone, new THREE.SphereGeometry(.38, 24, 16), m.metal).scale.set(1.2, .8, 1);
    const bumper = ring(drone, .45, .055, m.dark); bumper.rotation.x = Math.PI / 2;
    mesh(drone, new THREE.SphereGeometry(.13, 16, 12), m.red, 0, 0, .34);
    return (t: number) => { unit.animate(t, false); drone.position.set(Math.sin(t * .3) * 1.7, 1.45 + Math.sin(t) * .15, -1.6); drone.rotation.y = Math.sin(t * .3) * .3; };
  }
  arch(world, m, -2.7);
  for (const x of [-1.1, 1.1]) for (let i = 0; i < 7; i++) rounded(world, .035, .008, .5, m.ivory, x, .055, -2.4 + i * .82, .002);
  crate(world, m, -2.5, -.1, .9); crate(world, m, 2.5, -1.7, .7);
  crate(world, m, 2.5, 1.6, .55);
  const pickups: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const coin = cylinder(world, .16, .055, m.paint, .5, .62, -1.1 - i * .55); coin.rotation.x = Math.PI / 2; coin.userData.animated = true; pickups.push(coin);
  }
  return (t: number) => { unit.animate(t, true); pickups.forEach((coin, i) => { coin.rotation.z = t + i; }); };
}

export type { Materials };

/** Batch rigid parts per material while preserving articulated parent groups. */
export function batchRigidParts(group: THREE.Object3D) {
  for (const child of [...group.children]) if (child instanceof THREE.Group) batchRigidParts(child);
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || child.userData.animated) continue;
    const batch = batches.get(child.material) ?? []; batch.push(child); batches.set(child.material, batch);
  }
  for (const [material, objects] of batches) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      object.updateMatrix();
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      return geometry.applyMatrix4(object.matrix);
    });
    const geometry = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    if (!geometry) continue;
    objects.forEach(object => { group.remove(object); object.geometry.dispose(); });
    mesh(group, geometry, material);
  }
}
