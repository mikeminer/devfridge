'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { batchRigidParts, buildConcept, type Materials } from './conceptModels';

/** A compact PBR diorama. Independent of wallets and actual game simulation. */
export default function SkillScene({ genre }: { genre: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [textureError, setTextureError] = useState(false);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    setUnavailable(false); setTextureError(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setUnavailable(true); return; }
    let disposed = false, contextLost = false;
    const textures = new Set<THREE.Texture>();
    const materials = new Set<THREE.Material>();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    camera.position.set(7.8, 6.8, 9.2); camera.lookAt(0, .65, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.append(renderer.domElement);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture; scene.environmentIntensity = .7;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xc9e0ee, 0x5c4833, 1.1));
    const sun = new THREE.DirectionalLight(0xffe5c7, 3.3);
    sun.position.set(-3, 8, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; sun.shadow.camera.near = .5; sun.shadow.camera.far = 20;
    sun.shadow.normalBias = .025; sun.shadow.bias = -.0002; sun.shadow.radius = 3; scene.add(sun);
    const rim = new THREE.DirectionalLight(0xbddfff, 1.6); rim.position.set(4, 4, -5); scene.add(rim);
    const loader = new THREE.TextureLoader();
    const map = (url: string, color: boolean, repeat: number) => {
      const texture = loader.load(url, () => {
        if (disposed) texture.dispose();
        else if (!contextLost) renderer.render(scene, camera);
      }, undefined, () => { if (!disposed) setTextureError(true); });
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat);
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture); return texture;
    };
    const surface = (name: string, repeat: number) => ({
      map: map(`/world/skill/textures/${name}/color.webp`, true, repeat),
      normalMap: map(`/world/skill/textures/${name}/normal.webp`, false, repeat),
      roughnessMap: map(`/world/skill/textures/${name}/roughness.webp`, false, repeat),
    });
    const wood = surface('oak', 1.5), asphalt = surface('asphalt', 3);
    // Fine brushed manufacturing marks on painted/metal parts, not fake surface photos.
    const grain = document.createElement('canvas'); grain.width = grain.height = 128;
    const context = grain.getContext('2d')!; context.fillStyle = '#bbbbbb'; context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i++) { const g = 145 + ((i * 37) % 60); context.strokeStyle = `rgb(${g},${g},${g})`; context.beginPath(); context.moveTo(0, i); context.lineTo(128, i); context.stroke(); }
    const brushed = new THREE.CanvasTexture(grain); brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping; brushed.repeat.set(3, 3); textures.add(brushed);
    const m: Materials = {
      paint: new THREE.MeshPhysicalMaterial({ color: 0xb2ca58, metalness: .45, roughness: .3, clearcoat: 1, clearcoatRoughness: .2, bumpMap: brushed, bumpScale: .002 }),
      ivory: new THREE.MeshPhysicalMaterial({ color: 0xddd5bd, metalness: .3, roughness: .35, clearcoat: .6, bumpMap: brushed, bumpScale: .003 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8d9797, metalness: .88, roughness: .3, roughnessMap: brushed }),
      dark: new THREE.MeshStandardMaterial({ color: 0x202825, metalness: .65, roughness: .4 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x141817, roughness: .95, bumpMap: brushed, bumpScale: .018 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x152d35, metalness: .45, roughness: .08, clearcoat: 1 }),
      light: new THREE.MeshStandardMaterial({ color: 0xe0ffb2, emissive: 0xc0ff86, emissiveIntensity: 1.8, roughness: .25 }),
      red: new THREE.MeshStandardMaterial({ color: 0xd95732, emissive: 0xff3211, emissiveIntensity: .5, roughness: .3 }),
      wood: new THREE.MeshStandardMaterial({ ...wood, roughness: .85, normalScale: new THREE.Vector2(.4, .4) }),
      road: new THREE.MeshStandardMaterial({ ...asphalt, color: 0x8c8c8c, roughness: .95, normalScale: new THREE.Vector2(.55, .55) }),
    };
    Object.values(m).forEach(material => materials.add(material));
    const world = new THREE.Group(); scene.add(world);
    const animate = buildConcept(world, genre, m);
    batchRigidParts(world);
    // Shadow-catching studio floor grounds the cabinet without another texture download.
    const shadowMaterial = new THREE.ShadowMaterial({ opacity: .22 }); materials.add(shadowMaterial);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.49; shadow.receiveShadow = true; scene.add(shadow);
    const render = () => { if (!disposed && !contextLost) renderer.render(scene, camera); };
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height;
      // Keep the full diorama within narrow mobile cards.
      camera.fov = width < 400 ? 43 : 36; camera.updateProjectionMatrix(); render();
    }); resize.observe(host);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, elapsed = 0, lastTime = 0;
    const frame = (time: number) => {
      const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0; lastTime = time;
      elapsed += delta; world.rotation.y = -.18 + Math.sin(elapsed * .12) * .08; animate(elapsed); render();
    };
    const playback = () => {
      lastTime = 0;
      renderer.setAnimationLoop(!contextLost && !document.hidden && visible && !reduced.matches ? frame : null);
      if (reduced.matches) { world.rotation.y = -.18; animate(0); render(); }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; playback(); }); observer.observe(host);
    document.addEventListener('visibilitychange', playback); reduced.addEventListener('change', playback);
    animate(0); playback();
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; setUnavailable(true); renderer.setAnimationLoop(null); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; renderer.setAnimationLoop(null); resize.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', playback); reduced.removeEventListener('change', playback);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose()); environment.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [genre]);
  return <div ref={mount} style={{ width: '100%', height: '100%' }} aria-hidden="true">
    {unavailable && <p style={{ position: 'absolute', inset: 0, padding: '30% 20px', textAlign: 'center', background: '#19271c' }}>Your next world starts with an idea.<br/>3D preview unavailable on this device.</p>}
    {textureError && !unavailable && <span style={{ position: 'absolute', bottom: 6, left: 16, fontSize: 10, color: '#b9cba8' }}>Some surface textures could not load.</span>}
  </div>;
}
