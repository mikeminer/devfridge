import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { neuronGeometry, writeAxon, AXON_STEPS } from '../neurons.mjs';

test('neurons have branching silhouettes, finite geometry and a smaller phone mesh', () => {
  const desktop = neuronGeometry(4, 123), phone = neuronGeometry(4, 123, true);
  for (const geometry of [desktop, phone]) {
    assert.ok(geometry.boundingSphere.radius > 12);
    assert.ok(geometry.boundingSphere.radius < 20);
    assert.ok(geometry.attributes.position.count < 4000);
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
    assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
    assert.equal(geometry.attributes.normal.count, geometry.attributes.position.count);
  }
  assert.ok(phone.attributes.position.count < desktop.attributes.position.count);
  desktop.dispose(); phone.dispose();
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
