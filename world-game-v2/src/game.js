import { assetUrl, loadFavouriteModel, loadTexture, lazyRestModels, preloadPortraits } from "./assets.js";
import { AudioBus } from "./audio.js";

const mobile = matchMedia("(max-width: 900px), (pointer: coarse)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function startGame({ root, cast, favourite, address }) {
  const [THREE, { GLTFLoader }, { DRACOLoader }, physics] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
    import("./physics.js"),
  ]);
  await physics.initPhysics();
  const loaders = { GLTFLoader, DRACOLoader };
  const audio = new AudioBus();
  const portraits = [];
  await preloadPortraits(THREE, cast);
  await Promise.all(
    cast.map(async (c) => {
      portraits[c.tier] = await loadTexture(THREE, assetUrl(c.webp || c.png)).catch(() => null);
    }),
  );

  const canvas = root.querySelector("#stage-canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: mobile ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a3d2e);
  scene.fog = new THREE.Fog(0x25392e, 12, 28);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 4.6, 14.5);
  camera.lookAt(0, 4.4, 0);
  scene.add(new THREE.HemisphereLight(0xfff6de, 0x51666c, 1.4));
  const key = new THREE.DirectionalLight(0xfff2c8, 1.1);
  key.position.set(4, 10, 6);
  scene.add(key);

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 11.2, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x3f4f3c, roughness: 0.55, metalness: 0.08 }),
  );
  shell.position.set(0, 5.4, -1.7);
  scene.add(shell);
  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 9.4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1b241c, roughness: 0.8 }),
  );
  cavity.position.set(0, 5.5, -0.4);
  scene.add(cavity);

  const sprites = new Map();
  function billboard(tier, radius) {
    const map = portraits[tier];
    const mat = map
      ? new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false })
      : new THREE.SpriteMaterial({ color: cast[tier - 1]?.color || "#d7fc70" });
    const sprite = new THREE.Sprite(mat);
    const s = radius * 2.15;
    sprite.scale.set(s, s, 1);
    scene.add(sprite);
    return sprite;
  }

  const merge = new physics.MergeGame(physics.dailySeed(), favourite);
  const bestKey = `cold-storage-v2:${address}:best`;
  let best = Number(localStorage.getItem(bestKey) || 0);
  const discovered = new Set(JSON.parse(localStorage.getItem(`cold-storage-v2:${address}:cast`) || "[]"));
  discovered.add(favourite);

  const pointer = { x: 0, holding: false };
  function setAim(clientX) {
    const rect = canvas.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    pointer.x = merge.clampX((u - 0.5) * 6.2);
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointer.holding = true;
    setAim(e.clientX);
    audio.unlock();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointer.holding) setAim(e.clientX);
  });
  canvas.addEventListener("pointerup", () => {
    if (!pointer.holding) return;
    pointer.holding = false;
    merge.drop(pointer.x);
  });
  root.querySelector("#drop")?.addEventListener("click", () => {
    audio.unlock();
    merge.drop(pointer.x);
  });
  let paused = false;
  root.querySelector("#pause")?.addEventListener("click", () => {
    paused = !paused;
    root.querySelector("#pause-overlay").hidden = !paused;
  });
  root.querySelector("#resume")?.addEventListener("click", () => {
    paused = false;
    root.querySelector("#pause-overlay").hidden = true;
  });

  const ghost = billboard(merge.next, physics.RADII[merge.next - 1]);
  ghost.material.opacity = 0.55;
  ghost.material.transparent = true;
  ghost.position.set(0, physics.SPAWN_Y, 0);

  function syncPieces() {
    const live = new Set();
    for (const piece of merge.pieces.values()) {
      live.add(piece.id);
      let sprite = sprites.get(piece.id);
      if (!sprite) {
        sprite = billboard(piece.tier, piece.radius);
        sprites.set(piece.id, sprite);
      }
      const p = piece.body.translation();
      sprite.position.set(p.x, p.y, 0);
      const s = piece.radius * 2.15;
      sprite.scale.set(s, s, 1);
    }
    for (const [id, sprite] of sprites) {
      if (!live.has(id)) {
        scene.remove(sprite);
        sprites.delete(id);
      }
    }
    ghost.position.set(pointer.x, physics.SPAWN_Y, 0);
    const nr = physics.RADII[merge.next - 1];
    ghost.scale.set(nr * 2.15, nr * 2.15, 1);
    if (ghost.material.map !== portraits[merge.next]) {
      ghost.material.map = portraits[merge.next] || null;
      ghost.material.needsUpdate = true;
    }
  }

  function resize() {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 520;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const scoreEl = root.querySelector("#score");
  const bestEl = root.querySelector("#best");
  const nextImg = root.querySelector("#next-img");
  const collectionEl = root.querySelector("#collection");
  const collectionCount = root.querySelector("#collection-count");
  const bar = root.querySelector("#collection-bar");
  const toast = root.querySelector("#toast");

  function renderCollection() {
    collectionCount.innerHTML = `${discovered.size}<span> / 10</span>`;
    bar.style.width = `${discovered.size * 10}%`;
    collectionEl.innerHTML = cast
      .map(
        (c) =>
          `<button class="cast-card ${discovered.has(c.tier) ? "revealed" : ""}" style="--cast-color:${c.color}"><span class="tier-number">${String(c.tier).padStart(2, "0")}</span><img src="${assetUrl(c.webp)}" alt="" width="64" height="64"/><span class="cast-name">${discovered.has(c.tier) ? c.name : "???"}</span></button>`,
      )
      .join("");
  }

  function flash(title, sub) {
    toast.innerHTML = `<strong>${title}</strong><span>${sub || ""}</span>`;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 900);
  }

  function endRun(kind) {
    localStorage.setItem(`cold-storage-v2:${address}:cast`, JSON.stringify([...discovered]));
    if (merge.score > best) {
      best = merge.score;
      localStorage.setItem(bestKey, String(best));
    }
    root.querySelector("#result-title").textContent = kind === "win" ? "FRIDGED" : "DOOR OPEN";
    root.querySelector("#result-score").innerHTML = `${merge.score.toLocaleString("en-US")}<span> pts · World v2</span>`;
    root.querySelector("#result").showModal();
  }

  loadFavouriteModel(THREE, loaders, cast, favourite).then((gltf) => {
    if (!gltf || reduced) return;
    const avatar = gltf.scene.clone(true);
    avatar.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = false;
        n.receiveShadow = false;
      }
    });
    avatar.scale.setScalar(0.33);
    avatar.position.set(-1.55, 0.61, 0.84);
    scene.add(avatar);
  });
  lazyRestModels(THREE, loaders, cast, favourite);
  audio.playMember(cast[favourite - 1], "theme");

  let acc = 0;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && merge.status === "playing") {
      acc += dt;
      while (acc >= physics.STEP) {
        merge.step();
        acc -= physics.STEP;
      }
      for (const ev of merge.events) {
        if (ev.type === "merge") {
          discovered.add(ev.tier);
          flash(`MERGE ${ev.tier}`, `${ev.combo}x`);
          audio.playMember(cast[ev.tier - 1], "voice");
        }
        if (ev.type === "over" || ev.type === "win") endRun(ev.type);
      }
      merge.events.length = 0;
      const danger = [...merge.pieces.values()].some((p) => p.danger > 0);
      root.querySelector(".stage")?.classList.toggle("danger", danger);
    }
    syncPieces();
    scoreEl.textContent = merge.score.toLocaleString("en-US");
    bestEl.textContent = Math.max(best, merge.score).toLocaleString("en-US");
    if (nextImg) nextImg.src = assetUrl(cast[merge.next - 1].webp);
    renderCollection();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  renderCollection();
  requestAnimationFrame(frame);
}
