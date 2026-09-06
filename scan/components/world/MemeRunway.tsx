"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "./runway.module.css";
import contracts from "./runway-contracts.json";
import RunwayShare from "./RunwayShare";

const CAST = [
  ["rugarugo", "Rugarugo", "RUGARUGO"], ["aperitivo", "Aperitivo", "APE"],
  ["friedfomo", "FriedFomo", "FIFO"], ["fudfusilli", "FudFusilli", "FUSILLI"],
  ["lambocello", "Lambocello", "LAMBOCELLO"], ["gmgnocco", "GmGnocco", "GMGN"],
  ["sersugo", "SerSugo", "SESU"], ["moonzarella", "MoonZarella", "MOONZARELLA"],
  ["bonkatino", "Bonkatino", "BONKATINO"],
] as const;
const SLOT = 24;
const asset = (id: string, extension: string) => `/world/runway/${id}.${extension}`;

export default function MemeRunway() {
  const mount = useRef<HTMLDivElement>(null);
  const contractLabel = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const elapsed = useRef(0);
  const pausedRef = useRef(false);
  const soundRef = useRef(true);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [error, setError] = useState("");
  const ready = loaded > 0;
  const playMusic = useCallback(() => {
    const player = audio.current;
    if (!player || !soundRef.current || pausedRef.current || document.hidden) return;
    player.volume = .45;
    player.currentTime = elapsed.current % SLOT;
    player.play().then(() => {
      if (!soundRef.current || pausedRef.current || document.hidden) player.pause();
      else setAutoplayBlocked(false);
    }).catch((reason: unknown) => {
      if (!soundRef.current) return;
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (reason instanceof DOMException && reason.name === "NotAllowedError") setAutoplayBlocked(true);
      else setError("Audio could not start. Tap Enable music to retry.");
    });
  }, []);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const requested = new URLSearchParams(window.location.search).get("character");
    const requestedIndex = CAST.findIndex(character => character[0] === requested);
    if (requestedIndex >= 0) { elapsed.current = requestedIndex * SLOT + 7; setCurrent(requestedIndex); }
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { setError("The 3D stage is unavailable on this device. You can still enjoy the music."); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(0x080b18, .024);
    const camera = new T.PerspectiveCamera(39, 1, .1, 100);
    camera.position.set(0, 6.3, 18);
    camera.lookAt(0, 1.3, 0);
    scene.add(new T.HemisphereLight(0xbceeff, 0x594469, 2.7));
    const key = new T.DirectionalLight(0xfff0ce, 4.2); key.position.set(3, 9, 8); scene.add(key);
    const rim = new T.DirectionalLight(0xff59c3, 3); rim.position.set(-6, 4, -5); scene.add(rim);
    const fill = new T.DirectionalLight(0x63dcff, 2.2); fill.position.set(6, 3, -3); scene.add(fill);
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, glow = false) => {
      const material = new T.MeshStandardMaterial({ color, roughness: .38, metalness: .35, ...(glow ? { emissive: color, emissiveIntensity: 2 } : {}) });
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    };
    box(17, .4, 4.7, 0, -.3, -3.5, 0x20253c);
    box(5.7, .4, 10, 0, -.3, 1.2, 0x22283c);
    box(.07, .03, 10, -2.78, -.08, 1.2, 0x6aeaff, true);
    box(.07, .03, 10, 2.78, -.08, 1.2, 0xff70cc, true);
    box(17, .03, .08, 0, -.08, -1.15, 0x89dfff, true);
    for (let i = 0; i < 9; i++) {
      box(.12, 5 + (i % 3) * .4, .12, (i - 4) * 2, 2.5, -6, i % 2 ? 0xff5bbc : 0x7adcff, true);
      const spot = new T.Mesh(new T.CylinderGeometry(.7, .7, .025, 32), new T.MeshBasicMaterial({ color: i % 2 ? 0xff59bf : 0x69dbff, transparent: true, opacity: .16 }));
      spot.position.set((i - 4) * 1.8, -.08, -3.5); scene.add(spot);
    }
    const flashCanvas = document.createElement("canvas");
    flashCanvas.width = flashCanvas.height = 128;
    const ctx = flashCanvas.getContext("2d")!;
    const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(.12, "rgba(205,236,255,.9)");
    glow.addColorStop(1, "rgba(140,200,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(64, 10); ctx.lineTo(64, 118); ctx.moveTo(10, 64); ctx.lineTo(118, 64); ctx.stroke();
    const flashTexture = new T.CanvasTexture(flashCanvas);
    const cameras: T.Sprite[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = side * (3.8 + (i % 2) * .35), z = -1.7 + i * 1.8;
      box(.14, 1, .14, x, .3, z, 0x101722);
      box(.5, .32, .3, x, .95, z, 0x26364b);
      box(.2, .12, .12, x, 1.22, z + .1, 0xbed9e8);
      const flash = new T.Sprite(new T.SpriteMaterial({ map: flashTexture, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      flash.position.set(x, 1.23, z + .2); flash.scale.setScalar(1.25);
      scene.add(flash); cameras.push(flash);
    }
    const cameraLight = new T.PointLight(0xd9efff, 0, 9, 2); scene.add(cameraLight);
    let nextFlash = 1.5, flashStart = -10, flashingCamera = 0;
    type Actor = { root: T.Group; mixer: T.AnimationMixer; actions: Map<string, T.AnimationAction>; motion: string; face: string; index: number; scale: number; height: number };
    const actors: Actor[] = [];
    let dead = false, frame = 0, last = performance.now(), lastIndex = 0;
    const release = (root: T.Object3D) => {
      const textures = new Set<T.Texture>();
      root.traverse(node => {
        if (!(node instanceof T.Mesh) && !(node instanceof T.Sprite)) return;
        if (node instanceof T.Mesh) node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof T.Texture) textures.add(value); }); material.dispose(); });
      });
      textures.forEach(texture => { const bitmap = texture.source?.data; if (bitmap instanceof ImageBitmap) bitmap.close(); texture.dispose(); });
    };
    const loader = new GLTFLoader();
    // Sequential loading lets the first performer arrive without nine competing downloads.
    (async () => {
      for (let offset = 0; offset < CAST.length; offset++) {
        const index = (Math.max(0, requestedIndex) + offset) % CAST.length;
        if (dead) return;
        try {
          const gltf = await loader.loadAsync(asset(CAST[index][0], "glb"));
          if (dead) { release(gltf.scene); return; }
          const root = gltf.scene;
          const bounds = new T.Box3().setFromObject(root), size = bounds.getSize(new T.Vector3());
          const scale = Math.min(1, 3.6 / size.y, 4 / size.x);
          const mixer = new T.AnimationMixer(root);
          const actions = new Map(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
          actions.get("Idle")?.play(); actions.get("Happy")?.play();
          scene.add(root); actors.push({ root, mixer, actions, motion: "Idle", face: "Happy", index, scale, height: bounds.max.y });
          setLoaded(actors.length);
        } catch { if (!dead) setError("Some performers could not load. Refresh to retry the full cast."); }
      }
    })();
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / Math.max(1, h);
      camera.position.z = camera.aspect < .9 ? 23 : 18;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    pausedRef.current = reduced.matches; setPaused(reduced.matches);
    const labelPoint = new T.Vector3();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, .25); last = now;
      if (document.hidden) return;
      if (!pausedRef.current && actors.length) elapsed.current += dt;
      const index = Math.floor(elapsed.current / SLOT) % CAST.length;
      const t = elapsed.current % SLOT;
      // A single localized flash at a time, spaced by at least 1.4 seconds.
      if (!pausedRef.current && !reduced.matches && elapsed.current >= nextFlash) {
        flashingCamera = (flashingCamera + 1 + Math.floor(Math.random() * 7)) % cameras.length;
        flashStart = elapsed.current; nextFlash = elapsed.current + 1.4 + Math.random() * 1.6;
        cameraLight.position.copy(cameras[flashingCamera].position);
      }
      const flashPower = pausedRef.current || reduced.matches ? 0 : Math.max(0, 1 - (elapsed.current - flashStart) / .2);
      cameras.forEach((flash, i) => { flash.material.opacity = i === flashingCamera ? flashPower * .9 : 0; });
      cameraLight.intensity = flashPower * 28;
      if (lastIndex !== index) { lastIndex = index; setCurrent(index); }
      if (contractLabel.current) contractLabel.current.style.visibility = "hidden";
      for (const actor of actors) {
        const lead = actor.index === index;
        const walking = lead && (t < 7 || t > 17);
        const motion = lead ? (walking ? "Walk" : "Signature") : "Idle";
        const face = lead && audio.current && !audio.current.paused ? "Talk" : "Happy";
        for (const [field, next] of [["motion", motion], ["face", face]] as const) {
          if (actor[field] !== next) {
            const previous = actor.actions.get(actor[field]), action = actor.actions.get(next);
            action?.reset().play(); if (previous && action) action.crossFadeFrom(previous, .35, false);
            actor[field] = next;
          }
        }
        const homeX = (actor.index - 4) * 1.8;
        const progress = lead ? (t < 7 ? t / 7 : t < 17 ? 1 : 1 - (t - 17) / 7) : 0;
        const p = T.MathUtils.smoothstep(progress, 0, 1);
        actor.root.position.set(homeX * (1 - p), 0, -3.5 + p * 7.2);
        actor.root.scale.setScalar(actor.scale * (.48 + .52 * p));
        if (lead && contractLabel.current) {
          labelPoint.copy(actor.root.position);
          labelPoint.y += actor.height * actor.root.scale.y + .55;
          labelPoint.project(camera);
          const label = contractLabel.current;
          const half = label.offsetWidth / 2 + 8;
          label.style.left = `${T.MathUtils.clamp((labelPoint.x + 1) * host.clientWidth / 2, half, host.clientWidth - half)}px`;
          label.style.top = `${Math.max(label.offsetHeight + 8, (1 - labelPoint.y) * host.clientHeight / 2)}px`;
          label.style.visibility = "visible";
        }
        // Face the audience during the pose, then turn towards the back of the stage.
        const yaw = lead && t > 17 ? Math.atan2(homeX, -7.2) : lead && t < 6 ? Math.atan2(-homeX, 7.2) : Math.sin(t * .35) * .15;
        actor.root.quaternion.slerp(new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP, yaw), Math.min(1, dt * 5));
        if (!pausedRef.current) {
          actor.mixer.update(dt);
          if ((elapsed.current + actor.index * .7) % 3.8 < dt) {
            const blink = actor.actions.get("Blink");
            if (blink) { blink.setLoop(T.LoopOnce, 1); blink.reset().play(); }
          }
        }
      }
      if (audio.current) audio.current.volume = .45 * Math.min(1, t / .7, (SLOT - t) / .7);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => { dead = true; cancelAnimationFrame(frame); observer.disconnect(); actors.forEach(a => a.mixer.stopAllAction()); release(scene); renderer.dispose(); renderer.domElement.remove(); };
  }, []);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.src = asset(CAST[current][0], "wav");
  }, [current]);

  useEffect(() => { if (ready) playMusic(); }, [current, ready, playMusic]);

  useEffect(() => {
    const unlock = (event: Event) => {
      // The music and pause buttons handle their own intent; never undo a mute.
      if (event.target instanceof Element && event.target.closest("button")) return;
      if (soundRef.current && audio.current?.paused) playMusic();
    };
    document.addEventListener("pointerup", unlock);
    document.addEventListener("keydown", unlock);
    return () => { document.removeEventListener("pointerup", unlock); document.removeEventListener("keydown", unlock); };
  }, [playMusic]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) audio.current?.pause();
      else playMusic();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); audio.current?.pause(); };
  }, [playMusic]);

  const toggleMusic = () => {
    const enabled = !sound; soundRef.current = enabled; setAutoplayBlocked(false);
    if (!audio.current) return;
    if (enabled) {
      if (pausedRef.current) { pausedRef.current = false; setPaused(false); }
      playMusic();
    } else audio.current.pause();
  };
  const togglePause = () => {
    pausedRef.current = !pausedRef.current; setPaused(pausedRef.current);
    if (pausedRef.current) audio.current?.pause();
    else playMusic();
  };

  return <div className={styles.runway}>
    <div ref={mount} className={styles.canvas} role="img" aria-label="Nine original Italian brainrot characters parade on an illuminated runway" />
    <div ref={contractLabel} className={styles.contract}>
    <a className={styles.contractDestination} href={`https://www.ponsfamily.com/launchpad/${contracts[CAST[current][0]]}`} target="_blank" rel="noopener noreferrer" aria-label={`${CAST[current][1]} contract ${contracts[CAST[current][0]]}. Open profile on Pons in a new tab`}>
      <span className={styles.contractIdentity}>
        <img className={styles.memeLogo} src={`/world/memes/${CAST[current][0]}.webp`} width={64} height={64} alt={`${CAST[current][1]} logo`} />
        <span>{CAST[current][1]} · Contract ↗</span>
      </span>
      <code>{contracts[CAST[current][0]]}</code>
      <small className={styles.marketBrand}><img src="/world/brands/pons.png" width={24} height={24} alt="" />View on Pons</small>
    </a>
    <a className={styles.pumpLink} href={`https://pump.fun/coin/${contracts[CAST[current][0]]}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${CAST[current][1]} on pump.fun in a new tab`}><img src="/world/brands/pump.svg" width={24} height={24} alt="" />View on pump.fun ↗</a>
    </div>
    <div className={styles.caption}>
      <p className={styles.eyebrow}>PASTA / CAST · LIVE RUNWAY</p>
      <h2>{CAST[current][1]} <span>${CAST[current][2]}</span></h2>
      <p className={styles.track}>{String(current + 1).padStart(2, "0")} / 09 · {sound ? "Original character theme" : "The cast is on stage"}</p>
      <div className={styles.controls}>
        <button type="button" onClick={toggleMusic} aria-pressed={sound}>{sound ? "Mute music" : "Enable music"}</button>
        <button type="button" onClick={togglePause} aria-pressed={paused}>{paused ? "Resume show" : "Pause show"}</button>
      </div>
      <RunwayShare key={CAST[current][0]} id={CAST[current][0]} name={CAST[current][1]} address={contracts[CAST[current][0]]} />
      {autoplayBlocked && <p className={styles.status}>Tap anywhere to start the music.</p>}
      {loaded < 9 && !error && <p className={styles.status}>Setting the stage · {loaded}/9 performers</p>}
      {error && <p className={styles.status} role="status">{error}</p>}
    </div>
    <audio ref={audio} preload="auto" onPlaying={() => setSound(true)} onPause={() => setSound(false)} onEnded={() => setSound(false)} onLoadedMetadata={() => { if (audio.current) audio.current.currentTime = elapsed.current % SLOT; }} onError={() => { setSound(false); setError("This theme could not load. The show continues; try enabling music again."); }} />
  </div>;
}
