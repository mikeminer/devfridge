'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** Decorative concept model, deliberately independent of wallets and gameplay. */
export default function SkillScene({ genre }: { genre: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setUnavailable(true); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 80);
    camera.position.set(8, 8, 11); camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0); host.append(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xd7fff1, 0x192714, 3));
    const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(5, 10, 3); scene.add(light);
    const world = new THREE.Group(); scene.add(world);
    const material = (color: number, metalness = .1) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness });
    const dark = material(0x263d36), edge = material(0x95b5a2), lime = material(0xc9ff64), pink = material(0xdf93ff), cyan = material(0x74e8df);
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); world.add(mesh); return mesh;
    };
    box(0, -.5, 0, 7, .8, 7, dark); box(0, -.08, 0, 7.04, .05, 7.04, edge);
    const grid = new THREE.GridHelper(7, 14, 0x718578, 0x3d5545); grid.position.y = -.045; world.add(grid);
    const track = genre === 'drift';
    if (track) {
      const road = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.8, 64), material(0x162922)); road.rotation.x = -Math.PI / 2; road.position.y = .02; world.add(road);
    } else {
      for (let i = 0; i < 5; i++) box((i % 2 ? 1 : -1) * 1.5, .2, i - 2, .7, .4, .7, i % 2 ? cyan : pink);
    }
    const portal = new THREE.Mesh(new THREE.TorusGeometry(.85, .09, 8, 40), lime); portal.position.set(0, 1.3, -2.5); world.add(portal);
    const player = new THREE.Group(); world.add(player);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.6, track ? .35 : .7, track ? 1 : .55), lime); body.position.y = .6; player.add(body);
    for (const x of [-.17, .17]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(.09, .12, .04), dark); eye.position.set(x, .7, .3); player.add(eye);
    }
    const coins: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .06, 16), i % 2 ? cyan : lime);
      coin.rotation.x = Math.PI / 2; coin.position.set(Math.sin(i) * 2.5, .7, Math.cos(i) * 2.5); coins.push(coin); world.add(coin);
    }
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.render(scene, camera);
    }); resize.observe(host);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(host);
    renderer.setAnimationLoop(time => {
      if (document.hidden || !visible) return;
      const t = reduced.matches ? 0 : time / 1000;
      world.rotation.y = -.25 + Math.sin(t * .2) * .12;
      player.position.set(Math.sin(t * .7) * (track ? 2 : .7), track ? 0 : Math.abs(Math.sin(t * 2)) * .15, Math.cos(t * .7) * (track ? 2 : 1));
      player.rotation.y = track ? t * .7 : Math.sin(t) * .4;
      coins.forEach((coin, i) => { coin.rotation.z = t + i; coin.position.y = .7 + Math.sin(t * 2 + i) * .1; });
      renderer.render(scene, camera);
    });
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); renderer.setAnimationLoop(null); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      renderer.setAnimationLoop(null); resize.disconnect(); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      grid.geometry.dispose(); (grid.material as THREE.Material).dispose();
      const materials = new Set<THREE.Material>(); scene.traverse(object => { if (object instanceof THREE.Mesh) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat); });
      materials.forEach(mat => mat.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [genre]);
  return <div ref={mount} style={{ width: '100%', height: '100%' }} aria-hidden="true">{unavailable && <p style={{ padding: '30% 20px', textAlign: 'center' }}>Your next world starts with an idea.<br/>3D preview unavailable on this device.</p>}</div>;
}
