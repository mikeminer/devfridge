import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { neuronGeometry, writeAxon, AXON_STEPS, synapseTerminal, tissuePosition } from '../neurons.mjs';

test('neurons have branching silhouettes, finite geometry and a smaller phone mesh', () => {
  const desktop = neuronGeometry(4, 123), phone = neuronGeometry(4, 123, true);
  for (const geometry of [desktop, phone]) {
    assert.ok(geometry.boundingSphere.radius > 20);
    assert.ok(geometry.boundingSphere.radius < 40);
    assert.ok(geometry.attributes.position.count < 7000);
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
    assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
    assert.equal(geometry.attributes.normal.count, geometry.attributes.position.count);
  }
  assert.ok(phone.attributes.position.count < desktop.attributes.position.count);
  desktop.dispose(); phone.dispose();
});

test('network fibres attach to actual dendrite terminals after translation and selection scaling', () => {
  const geometry = neuronGeometry(4, 123, true);
  const object = new THREE.Mesh(geometry); object.position.set(30, 20, -10); object.scale.setScalar(1.82);
  const endpoint = synapseTerminal(object, new THREE.Vector3(100, 0, 0));
  const terminals = geometry.userData.synapses.map(p => new THREE.Vector3(...p).multiplyScalar(1.82).add(object.position));
  assert.ok(terminals.some(p => p.distanceTo(endpoint) < .00001));
  assert.ok(endpoint.distanceTo(object.position) > 20);
  geometry.dispose(); object.material.dispose();
});

test('neurons fill a reproducible 3D volume instead of sitting on a spherical shell', () => {
  const samples = Array.from({length:52}, (_,i) => tissuePosition(i * 7919));
  for (const axis of ['x','y','z']) assert.ok(Math.max(...samples.map(p=>p[axis])) - Math.min(...samples.map(p=>p[axis])) > 100);
  const radii=samples.map(p=>p.length());
  assert.ok(Math.max(...radii)-Math.min(...radii)>50);
  assert.deepEqual(tissuePosition(123).toArray(), tissuePosition(123).toArray());
});

test('the cell body remains pickable with the graph raycaster', () => {
  const geometry = neuronGeometry(4, 42, true), material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.nodeId = '/assets/solana/pasta.md';
  mesh.updateMatrixWorld();
  const hits = new THREE.Raycaster(new THREE.Vector3(0, 0, 40), new THREE.Vector3(0, 0, -1)).intersectObject(mesh);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].object.userData.nodeId, '/assets/solana/pasta.md');
  geometry.dispose(); material.dispose();
});

test('curved fibres preserve exact endpoints and update in place as nodes move', () => {
  const values = new Float32Array(AXON_STEPS * 6);
  const a = new THREE.Vector3(0, 0, 0), b = new THREE.Vector3(100, 0, 0);
  assert.equal(writeAxon(values, 0, a, b, 5), values.length);
  assert.deepEqual([...values.slice(0, 3)], [0, 0, 0]);
  assert.deepEqual([...values.slice(-3)], [100, 0, 0]);
  assert.ok(values.some((value, index) => index % 3 === 1 && Math.abs(value) > 1));
  b.set(0, 0, 0);
  writeAxon(values, 0, a, b, 5);
  assert.ok([...values].every(value => Number.isFinite(value) && value === 0));
});

test('rendered axon instances join the dendrites and follow a moved neuron', () => {
  const source = new THREE.Mesh(neuronGeometry(4, 1, true));
  const target = new THREE.Mesh(neuronGeometry(4, 2, true));
  target.position.set(100, 30, -20);
  const context = vm.createContext({ THREE, AXON_STEPS, synapseTerminal, writeAxon,
    compactViewport: { matches: true }, graphRoot: new THREE.Group(),
    nodeObjects: new Map([['a', source], ['b', target]]),
    state: { selectedId: null, search: '' }, getMatchingNodeIds: () => new Set(),
    hashCode: () => 12, axonTransform: new THREE.Object3D(),
    axonStart: new THREE.Vector3(), axonEnd: new THREE.Vector3(), axonUp: new THREE.Vector3(0, 1, 0),
    linePositions: null, lineSegments: null,
  });
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  vm.runInContext(app.slice(app.indexOf('function createLines('), app.indexOf('function animate(')), context);
  vm.runInContext("createLines({links:[{id:'ab',source:'a',target:'b',mode:'wiki'}]})", context);
  assert.equal(context.lineSegments.count, AXON_STEPS);
  assert.ok([...context.lineSegments.instanceMatrix.array].every(Number.isFinite));
  const matrix = new THREE.Matrix4();
  context.lineSegments.getMatrixAt(0, matrix);
  const start = new THREE.Vector3(0, -.5, 0).applyMatrix4(matrix);
  assert.ok(start.distanceTo(synapseTerminal(source, target.position)) < .0001);
  target.position.set(-30, 80, 120); target.scale.setScalar(1.82);
  vm.runInContext('updateLines()', context);
  context.lineSegments.getMatrixAt(AXON_STEPS - 1, matrix);
  const end = new THREE.Vector3(0, .5, 0).applyMatrix4(matrix);
  assert.ok(end.distanceTo(synapseTerminal(target, source.position)) < .0001);
  for (const mesh of [source, target, context.lineSegments]) { mesh.geometry.dispose(); mesh.material.dispose(); }
});
