'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type SkillDvdSceneProps = {
  isOpen: boolean;
  discOut: boolean;
  /** Radians, supplied by the accessible controls outside the canvas. */
  rotation: number;
  onReady?: () => void;
  onError?: () => void;
};

const TAU = Math.PI * 2;

function canvasSurface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas textures unavailable');
  return { canvas, context };
}

function paintCover(context: CanvasRenderingContext2D, artwork?: HTMLImageElement) {
  const width = 1024, height = 1536;
  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#061511'); base.addColorStop(.55, '#284c2d'); base.addColorStop(1, '#07110d');
  context.fillStyle = base; context.fillRect(0, 0, width, height);
  if (artwork) {
    const scale = Math.max(width / artwork.naturalWidth, height / artwork.naturalHeight);
    const w = artwork.naturalWidth * scale, h = artwork.naturalHeight * scale;
    context.drawImage(artwork, (width - w) / 2, (height - h) / 2, w, h);
  }
  const top = context.createLinearGradient(0, 0, 0, 490);
  top.addColorStop(0, 'rgba(3,12,8,.8)'); top.addColorStop(.65, 'rgba(3,12,8,.45)'); top.addColorStop(1, 'rgba(3,12,8,0)');
  context.fillStyle = top; context.fillRect(0, 0, width, 490);
  const bottom = context.createLinearGradient(0, 1200, 0, height);
  bottom.addColorStop(0, 'rgba(3,12,8,0)'); bottom.addColorStop(.7, 'rgba(3,12,8,.94)'); bottom.addColorStop(1, '#050e0a');
  context.fillStyle = bottom; context.fillRect(0, 1200, width, 336);
  context.fillStyle = '#c8fa7b'; context.fillRect(68, 66, 9, 44);
  context.font = '700 39px Arial, sans-serif'; context.fillText('DEVFRIDGE', 94, 101);
  context.fillStyle = '#d4f7a2'; context.fillRect(772, 65, 186, 48);
  context.fillStyle = '#14261a'; context.textAlign = 'center';
  context.font = '700 27px Arial, sans-serif'; context.fillText('v1.7.6', 865, 99);
  context.textAlign = 'left'; context.fillStyle = '#f7f8ec';
  context.font = '900 115px Arial, sans-serif'; context.fillText('GAME', 63, 225); context.fillText('BUILDER', 63, 339);
  context.font = '500 25px Arial, sans-serif'; context.fillStyle = '#c9d8c3';
  context.fillText('YOUR COMMUNITY. YOUR WORLD.', 70, 392);
  context.fillStyle = 'rgba(206,247,149,.65)'; context.fillRect(70, 1396, 884, 2);
  context.font = '700 32px Arial, sans-serif'; context.fillStyle = '#f0f5df';
  context.fillText('BROWSER  +  SEEKER', 70, 1453);
  context.font = '500 21px Arial, sans-serif'; context.fillStyle = '#9bae9c';
  context.fillText('THREE.JS   /   SEASON PASS   /   BUILD & PLAY', 70, 1500);
}

/** A product model, with event-driven rendering rather than an idle animation loop. */
export default function SkillDvdScene(props: SkillDvdSceneProps) {
  const mount = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const invalidate = useRef<() => void>(() => {});
  latest.current = props;

  useEffect(() => { invalidate.current(); }, [props.isOpen, props.discOut, props.rotation]);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false, failed = false, ready = false, frame = 0, lastTime = 0;
    let width = 0, height = 0, inView = true;
    let renderer: THREE.WebGLRenderer | undefined;
    let environment: THREE.WebGLRenderTarget | undefined;
    const cleanups: Array<() => void> = [];
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = 0; };
    const cleanup = () => {
      if (disposed) return;
      disposed = true; stop(); invalidate.current = () => {};
      cleanups.reverse().forEach(dispose => dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      environment?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
    const fail = () => {
      if (disposed || failed) return;
      failed = true; stop(); latest.current.onError?.();
    };

    try {
      const gl = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer = gl;
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      gl.setClearColor(0x000000, 0);
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.1;
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      Object.assign(gl.domElement.style, { display: 'block', width: '100%', height: '100%', pointerEvents: 'none' });
      host.appendChild(gl.domElement);
      const lost = (event: Event) => { event.preventDefault(); fail(); };
      gl.domElement.addEventListener('webglcontextlost', lost);
      cleanups.push(() => gl.domElement.removeEventListener('webglcontextlost', lost));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(gl);
      try { environment = pmrem.fromScene(room, .035); }
      finally { room.dispose(); pmrem.dispose(); }
      scene.environment = environment.texture;
      scene.environmentIntensity = .92;
      scene.add(new THREE.HemisphereLight(0xe1f2e6, 0x263128, 1.5));
      const key = new THREE.DirectionalLight(0xfff2d9, 3.8);
      key.position.set(-4, 8, 6); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 24 });
      key.shadow.normalBias = .035; key.shadow.bias = -.0003; key.shadow.radius = 4;
      scene.add(key); cleanups.push(() => key.shadow.dispose());
      const rim = new THREE.DirectionalLight(0xb4ddff, 2.3);
      rim.position.set(4, 5, -3); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xc5ef93, .8);
      fill.position.set(4, 2, 5); scene.add(fill);

      const material = <T extends THREE.Material>(value: T): T => { materials.add(value); return value; };
      const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value; };
      const texture = (canvas: HTMLCanvasElement, color = true) => {
        const value = new THREE.CanvasTexture(canvas);
        value.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        value.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        textures.add(value); return value;
      };
      const plastic = material(new THREE.MeshPhysicalMaterial({ color: 0x11241b, roughness: .34, metalness: .08, clearcoat: .45, clearcoatRoughness: .3 }));
      const interior = material(new THREE.MeshStandardMaterial({ color: 0x09180f, roughness: .54, metalness: .06 }));
      const lip = material(new THREE.MeshPhysicalMaterial({ color: 0x243e2c, roughness: .3, clearcoat: .5 }));
      const ink = material(new THREE.MeshStandardMaterial({ color: 0x89a58a, roughness: .7 }));
      const box = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, surface: THREE.Material, radius = .035) => {
        const mesh = new THREE.Mesh(geometry(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, d / 2, w / 2, h / 2))), surface);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      };
      const torus = (parent: THREE.Object3D, radius: number, tube: number, z: number, surface: THREE.Material) => {
        const mesh = new THREE.Mesh(geometry(new THREE.TorusGeometry(radius, tube, 8, 96)), surface);
        mesh.position.z = z; parent.add(mesh); return mesh;
      };
      const rig = new THREE.Group(); rig.position.y = 2.12; scene.add(rig);
      box(rig, 2.8, 4, .23, 0, 0, -.13, plastic, .08);
      box(rig, 2.6, 3.8, .04, 0, 0, .002, interior, .03);
      // Raised injection-moulded rails and a shallow circular disc recess.
      box(rig, .065, 3.72, .11, 1.31, 0, .038, lip);
      box(rig, .065, 3.72, .11, -1.31, 0, .038, lip);
      box(rig, 2.54, .065, .11, 0, 1.87, .038, lip);
      box(rig, 2.54, .065, .11, 0, -1.87, .038, lip);
      const tray = new THREE.Group(); tray.position.y = -.15; rig.add(tray);
      torus(tray, 1.135, .035, .038, lip);
      torus(tray, .275, .018, .04, lip);
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8;
        const tooth = box(tray, .095, .13, .085, Math.cos(angle) * .15, Math.sin(angle) * .15, .04, plastic, .018);
        tooth.rotation.z = angle - Math.PI / 2;
      }
      // Small retaining tabs and manufacturing marks make the interior read as plastic.
      box(rig, .24, .12, .045, 1.14, 1.15, .045, lip);
      box(rig, .24, .12, .045, -1.14, 1.15, .045, lip);
      for (let i = 0; i < 5; i++) box(rig, .026, .2, .009, -.1 + i * .05, -1.68, .029, ink, .004);

      const hinge = new THREE.Group(); hinge.position.set(-1.4, 0, .19); rig.add(hinge);
      const hingeRod = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.055, .055, 3.79, 16)), plastic);
      hingeRod.position.set(-1.39, 0, .065); rig.add(hingeRod);
      box(hinge, 2.8, 4, .075, 1.4, 0, 0, plastic, .037);
      const cover = canvasSurface(1024, 1536); paintCover(cover.context);
      const coverTexture = texture(cover.canvas);
      const coverMaterial = material(new THREE.MeshPhysicalMaterial({ map: coverTexture, roughness: .38, clearcoat: .42, clearcoatRoughness: .3 }));
      const coverMesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.65, 3.83)), coverMaterial);
      coverMesh.position.set(1.4, 0, .041); hinge.add(coverMesh);

      const inside = canvasSurface(768, 1152);
      const c = inside.context;
      c.fillStyle = '#142b20'; c.fillRect(0, 0, 768, 1152);
      c.strokeStyle = 'rgba(189,228,164,.08)'; c.lineWidth = 1;
      for (let i = 32; i < 1152; i += 48) { c.beginPath(); c.moveTo(0, i); c.lineTo(768, i); c.stroke(); }
      for (let i = 24; i < 768; i += 48) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 1152); c.stroke(); }
      c.fillStyle = '#b5df8e'; c.font = '700 27px Arial, sans-serif'; c.fillText('DEVFRIDGE / CREATOR KIT', 60, 106);
      c.fillStyle = '#eef2df'; c.font = '900 64px Arial, sans-serif';
      ['MAKE', 'SOMETHING', 'PLAYABLE.'].forEach((line, index) => c.fillText(line, 55, 255 + index * 79));
      c.fillStyle = '#a0b49e'; c.font = '400 25px Arial, sans-serif';
      ['Private RPC. Public app pages.', '50 FPS gate. Saved checkpoints.', 'Real screenshots. Verified updates.'].forEach((line, index) => c.fillText(line, 60, 595 + index * 44));
      c.fillStyle = '#c6e89c'; c.fillRect(60, 923, 648, 2);
      c.font = '700 25px Arial, sans-serif'; c.fillText('BROWSER + SEEKER', 60, 981);
      c.fillStyle = '#7e9a83'; c.font = '400 20px Arial, sans-serif'; c.fillText('DEVFRIDGE GAME BUILDER  /  1.7.6', 60, 1041);
      const insideMaterial = material(new THREE.MeshStandardMaterial({ map: texture(inside.canvas), roughness: .8 }));
      const insideMesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.57, 3.7)), insideMaterial);
      insideMesh.position.set(1.4, 0, -.041); insideMesh.rotation.y = Math.PI; hinge.add(insideMesh);
      box(hinge, .14, .4, .05, .17, .85, -.065, lip);
      box(hinge, .14, .4, .05, .17, -.85, -.065, lip);

      const spine = canvasSurface(128, 1536);
      spine.context.fillStyle = '#0c1c13'; spine.context.fillRect(0, 0, 128, 1536);
      spine.context.save(); spine.context.translate(64, 1400); spine.context.rotate(-Math.PI / 2);
      spine.context.fillStyle = '#d8e9ba'; spine.context.font = '700 44px Arial, sans-serif';
      spine.context.fillText('DEVFRIDGE  /  GAME BUILDER', 0, 13); spine.context.restore();
      const spineMesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(.23, 3.83)), material(new THREE.MeshStandardMaterial({ map: texture(spine.canvas), roughness: .4 })));
      spineMesh.position.set(-1.403, 0, -.13); spineMesh.rotation.y = -Math.PI / 2; rig.add(spineMesh);

      const disc = new THREE.Group(); rig.add(disc);
      const foil = canvasSurface(512, 512);
      const f = foil.context;
      const radial = f.createRadialGradient(256, 256, 30, 256, 256, 256);
      radial.addColorStop(0, '#555555'); radial.addColorStop(.25, '#d7d7d7'); radial.addColorStop(.55, '#818181'); radial.addColorStop(.8, '#ededed'); radial.addColorStop(1, '#777777');
      f.fillStyle = radial; f.fillRect(0, 0, 512, 512);
      for (let r = 54; r < 253; r += 3) { f.strokeStyle = 'rgba(255,255,255,.12)'; f.beginPath(); f.arc(256, 256, r, 0, TAU); f.stroke(); }
      const foilTexture = texture(foil.canvas, false);
      const silver = material(new THREE.MeshPhysicalMaterial({ color: 0xcbd8da, metalness: .94, roughness: .19, clearcoat: 1, clearcoatRoughness: .1, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [110, 410], iridescenceThicknessMap: foilTexture, side: THREE.DoubleSide }));
      const discFace = new THREE.Mesh(geometry(new THREE.RingGeometry(.18, 1.09, 128)), silver);
      discFace.position.z = .025; discFace.castShadow = true; disc.add(discFace);
      const edgeGeometry = geometry(new THREE.CylinderGeometry(1.09, 1.09, .027, 128, 1, true));
      const edge = new THREE.Mesh(edgeGeometry, silver); edge.rotation.x = Math.PI / 2; edge.position.z = .012; disc.add(edge);
      const hole = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.18, .18, .027, 48, 1, true)), silver);
      hole.rotation.x = Math.PI / 2; hole.position.z = .012; disc.add(hole);
      const colors = [0xb9e4ff, 0xe4c4f5, 0xf3cead, 0xe0edbd, 0xa2e8d0, 0xb4d0f7];
      colors.forEach((color, index) => {
        const sheen = material(new THREE.MeshPhysicalMaterial({ color, metalness: .85, roughness: .19, iridescence: 1, iridescenceThicknessRange: [140 + index * 25, 430], transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide }));
        const sector = new THREE.Mesh(geometry(new THREE.RingGeometry(.33, 1.07, 24, 1, index * TAU / 6, TAU / 6)), sheen);
        sector.position.z = .027; disc.add(sector);
      });
      const hub = new THREE.Mesh(geometry(new THREE.RingGeometry(.18, .32, 64)), material(new THREE.MeshPhysicalMaterial({ color: 0xd7e3dd, metalness: .35, roughness: .14, transparent: true, opacity: .76, side: THREE.DoubleSide })));
      hub.position.z = .029; disc.add(hub);
      torus(disc, 1.075, .006, .028, silver); torus(disc, .3, .005, .03, silver);
      const label = canvasSurface(1024, 1024);
      const l = label.context; l.textAlign = 'center'; l.fillStyle = '#142c22';
      l.font = '900 65px Arial, sans-serif'; l.fillText('DEVFRIDGE', 512, 259);
      l.font = '700 37px Arial, sans-serif'; l.fillText('GAME BUILDER', 512, 316);
      l.font = '700 39px Arial, sans-serif'; l.fillText('1.7.6', 512, 805);
      l.font = '500 20px Arial, sans-serif'; l.fillText('BROWSER + SEEKER  /  CREATOR EDITION', 512, 852);
      const print = new THREE.Mesh(geometry(new THREE.RingGeometry(.33, 1.065, 96)), material(new THREE.MeshBasicMaterial({ map: texture(label.canvas), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
      print.position.z = .033; disc.add(print);

      const shadow = new THREE.Mesh(geometry(new THREE.PlaneGeometry(30, 30)), material(new THREE.ShadowMaterial({ opacity: .22 })));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = .015; shadow.receiveShadow = true; scene.add(shadow);
      // A soft contact gradient complements the real cast shadow at the case's feet.
      const contact = canvasSurface(128, 128);
      const gradient = contact.context.createRadialGradient(64, 64, 5, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(0,0,0,.24)'); gradient.addColorStop(.4, 'rgba(0,0,0,.14)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
      contact.context.fillStyle = gradient; contact.context.fillRect(0, 0, 128, 128);
      const contactMesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(5, 2)), material(new THREE.MeshBasicMaterial({ map: texture(contact.canvas), transparent: true, depthWrite: false })));
      contactMesh.rotation.x = -Math.PI / 2; contactMesh.position.y = .02; scene.add(contactMesh);

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const motion = { open: Number(latest.current.isOpen || latest.current.discOut), disc: Number(latest.current.discOut), rotation: Number.isFinite(latest.current.rotation) ? latest.current.rotation : 0 };
      const bounds = new THREE.Box3(), center = new THREE.Vector3();
      const direction = new THREE.Vector3(0, .09, 1).normalize();
      const up = new THREE.Vector3(0, direction.z, -direction.y);
      const corner = new THREE.Vector3();
      const fit = () => {
        rig.updateMatrixWorld(true); bounds.setFromObject(rig); bounds.min.y = Math.min(bounds.min.y, -.05); bounds.getCenter(center);
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanX = tanY * camera.aspect;
        let distance = 1;
        for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) {
          corner.set(x ? bounds.max.x : bounds.min.x, y ? bounds.max.y : bounds.min.y, z ? bounds.max.z : bounds.min.z).sub(center);
          const depth = corner.dot(direction);
          distance = Math.max(distance, depth + Math.abs(corner.x) * 1.12 / tanX, depth + Math.abs(corner.dot(up)) * 1.12 / tanY);
        }
        camera.position.copy(center).addScaledVector(direction, distance + .15); camera.lookAt(center);
      };
      const draw = () => {
        if (disposed || failed || document.hidden || !inView || !width || !height) return;
        rig.rotation.set(-.035, .22 + motion.rotation, -.025);
        rig.position.x = motion.open * 1.25;
        hinge.rotation.y = -motion.open * Math.PI * .93;
        disc.position.set(motion.disc * .82, -.15 + motion.disc * .65, .065 + motion.disc * 1.75);
        disc.rotation.set(-motion.disc * .2, motion.disc * .28, motion.disc * -.14);
        contactMesh.position.x = motion.open * -.2;
        contactMesh.scale.x = 1 + motion.open * .4;
        fit();
        try { gl.render(scene, camera); }
        catch { fail(); return; }
        if (gl.getContext().isContextLost()) { fail(); return; }
        if (!ready) { ready = true; latest.current.onReady?.(); }
      };
      const tick = (time: number) => {
        frame = 0;
        if (disposed || failed || document.hidden || !inView) { lastTime = 0; return; }
        const target = latest.current;
        // This is a product tween, so slow frames catch up with elapsed wall time.
        const dt = lastTime ? Math.max((time - lastTime) / 1000, 0) : 1 / 60; lastTime = time;
        const ease = 1 - Math.exp(-10 * dt);
        const openTarget = Number(target.isOpen || target.discOut || motion.disc > .002);
        const discTarget = target.discOut && motion.open > .65 ? 1 : 0;
        const angleTarget = Number.isFinite(target.rotation) ? target.rotation : 0;
        const angleDelta = THREE.MathUtils.euclideanModulo(angleTarget - motion.rotation + Math.PI, TAU) - Math.PI;
        const move = (value: number, goal: number) => Math.abs(goal - value) < .001 ? goal : THREE.MathUtils.lerp(value, goal, ease);
        motion.open = move(motion.open, openTarget); motion.disc = move(motion.disc, discTarget);
        motion.rotation = Math.abs(angleDelta) < .001 ? angleTarget : motion.rotation + angleDelta * ease;
        draw();
        const pending = motion.open !== Number(target.isOpen || target.discOut) || motion.disc !== Number(target.discOut) || motion.rotation !== angleTarget;
        if (pending && !failed && !disposed) frame = requestAnimationFrame(tick);
        else lastTime = 0;
      };
      const schedule = () => {
        if (disposed || failed || document.hidden || !inView || !width || !height) return;
        if (reduced.matches) {
          stop(); motion.open = Number(latest.current.isOpen || latest.current.discOut); motion.disc = Number(latest.current.discOut);
          motion.rotation = Number.isFinite(latest.current.rotation) ? latest.current.rotation : 0; draw();
        } else if (!frame) frame = requestAnimationFrame(tick);
      };
      invalidate.current = schedule;
      const resize = () => {
        width = host.clientWidth; height = host.clientHeight;
        if (!width || !height) { stop(); return; }
        gl.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); schedule();
      };
      const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(host); cleanups.push(() => sizeObserver.disconnect());
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) schedule(); else stop(); });
        observer.observe(host); cleanups.push(() => observer.disconnect());
      }
      const visibility = () => { if (document.hidden) stop(); else schedule(); };
      document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', schedule);
      cleanups.push(() => document.removeEventListener('visibilitychange', visibility), () => reduced.removeEventListener('change', schedule));
      const artwork = new Image();
      artwork.onload = () => {
        if (disposed || failed) return;
        paintCover(cover.context, artwork); coverTexture.needsUpdate = true; schedule();
      };
      artwork.onerror = () => { /* The original typographic cover remains usable offline. */ };
      cleanups.push(() => { artwork.onload = null; artwork.onerror = null; artwork.removeAttribute('src'); });
      artwork.src = '/world/skill/dvd-cover-art.png';
      resize();
    } catch {
      fail(); cleanup();
    }
    return cleanup;
  }, []);

  return <div ref={mount} aria-hidden="true" style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
