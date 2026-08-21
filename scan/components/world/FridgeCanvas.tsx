"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { PASTA_MINT } from "@/lib/constants";
import { teamFromMint, type WorldTeam } from "@/lib/world-faction";
import type { Faction } from "./WorldApp";

type Dummy = {
  id: string;
  mint: string;
  symbol: string;
  team: WorldTeam;
  color: number;
  pos: THREE.Vector3;
  hp: number;
  yaw: number;
  mesh: THREE.Object3D;
};

const SPEED = 9;

export default function FridgeCanvas({
  faction,
  room,
}: {
  faction: Faction | null;
  room: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [hp, setHp] = useState(100);
  const [kills, setKills] = useState(0);
  const [msg, setMsg] = useState("Click the ice. WASD move, click shoot. Pastalovers vs The Shelf.");
  const [ready, setReady] = useState(false);
  const factionRef = useRef(faction);
  factionRef.current = faction;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4aa3c7);
    scene.fog = new THREE.Fog(0x4aa3c7, 18, 48);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 80);
    camera.position.set(0, 1.7, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.object);

    const onClick = () => controls.lock();
    renderer.domElement.addEventListener("click", onClick);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const ice = new THREE.PointLight(0x7dd3fc, 80, 40);
    ice.position.set(0, 7, 0);
    scene.add(ice);
    const pot = new THREE.PointLight(0xfbbf24, 30, 18);
    pot.position.set(0, 2, 0);
    scene.add(pot);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0b1528, metalness: 0.3, roughness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x9ee4f5,
      roughness: 0.08,
      transmission: 0.45,
      thickness: 0.8,
      transparent: true,
      opacity: 0.92,
    });
    const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), iceMat);
      m.position.set(x, y, z);
      scene.add(m);
    };
    wall(40, 8, 0.5, 0, 4, -20);
    wall(40, 8, 0.5, 0, 4, 20);
    wall(0.5, 8, 40, -20, 4, 0);
    wall(0.5, 8, 40, 20, 4, 0);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1a3a55, metalness: 0.4, roughness: 0.3 });
    const shelves: [number, number, number, number, number, number][] = [
      [-8, 1.2, -6, 4, 2.4, 1.2],
      [8, 1.2, -6, 4, 2.4, 1.2],
      [-8, 1.2, 6, 4, 2.4, 1.2],
      [8, 1.2, 6, 4, 2.4, 1.2],
      [0, 1.6, 0, 2.2, 3.2, 2.2],
      [-2, 0.6, 10, 6, 1.2, 1],
      [2, 0.6, -10, 6, 1.2, 1],
    ];
    for (const [x, y, z, w, h, d] of shelves) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shelfMat);
      m.position.set(x, y, z);
      scene.add(m);
    }

    const pan = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.7, 28),
      new THREE.MeshStandardMaterial({ color: 0xc2410c, emissive: 0x9a3412, emissiveIntensity: 0.6 })
    );
    pan.position.set(0, 0.35, 0);
    scene.add(pan);

    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    marker.position.set(0, 3.2, 0);
    scene.add(marker);

    const dummies: Dummy[] = [];
    const loader = new GLTFLoader();

    const addDummy = (tpl: Omit<Dummy, "mesh">, object: THREE.Object3D) => {
      object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.userData = { actor: true, id: tpl.id, mint: tpl.mint, symbol: tpl.symbol, team: tpl.team };
        if (mesh.isMesh) mesh.castShadow = true;
      });
      object.position.copy(tpl.pos);
      scene.add(object);
      dummies.push({ ...tpl, mesh: object });
    };

    const capsule = (color: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
      );
      body.position.y = 1;
      g.add(body);
      return g;
    };

    loader.load(
      "/world/Duck.glb",
      (gltf) => {
        const spots: [number, number, number][] = [
          [-8, 2.6, -6],
          [8, 2.6, -6],
          [-8, 2.6, 6],
          [8, 2.6, 6],
        ];
        spots.forEach((p, i) => {
          const d = gltf.scene.clone();
          d.position.set(...p);
          d.scale.setScalar(1.5);
          d.rotation.y = (i * Math.PI) / 2;
          scene.add(d);
        });
      },
      undefined,
      () => {
        /* primitives already visible */
      }
    );

    const spawnBots = (list: { mint: string; symbol: string; team: WorldTeam }[]) => {
      const spawns: [number, number][] = [
        [-10, -10],
        [10, -10],
        [-10, 10],
        [10, 10],
      ];
      list.slice(0, 4).forEach((t, i) => {
        const color = t.team === "pastalovers" ? 0xf59e0b : 0x4fc3f7;
        const url = t.team === "pastalovers" ? "/world/Soldier.glb" : "/world/Xbot.glb";
        const tpl = {
          id: `bot-${t.mint.slice(0, 6)}-${i}`,
          mint: t.mint,
          symbol: t.symbol,
          team: t.team,
          color,
          pos: new THREE.Vector3(spawns[i][0], 0, spawns[i][1]),
          hp: 100,
          yaw: 0,
        };
        loader.load(
          url,
          (gltf) => {
            const root = gltf.scene;
            root.scale.setScalar(1);
            addDummy(tpl, root);
          },
          undefined,
          () => addDummy(tpl, capsule(color))
        );
      });
    };

    fetch("/api/feed/boosted")
      .then((r) => r.json())
      .then((j: { tokens?: { mint: string; symbol?: string }[] }) => {
        const my = factionRef.current?.team;
        let enemies = (j.tokens || [])
          .map((t) => ({ mint: t.mint, symbol: t.symbol || "TKN", team: teamFromMint(t.mint) }))
          .filter((t) => !my || t.team !== my);
        if (enemies.length === 0) {
          const enemy: WorldTeam = my === "pastalovers" ? "shelf" : "pastalovers";
          enemies = [
            {
              mint: enemy === "pastalovers" ? PASTA_MINT : "shelf-bot",
              symbol: enemy === "pastalovers" ? "PASTA" : "SHELF",
              team: enemy,
            },
          ];
        }
        spawnBots(enemies);
      })
      .catch(() => {
        spawnBots([
          { mint: PASTA_MINT, symbol: "PASTA", team: "pastalovers" },
          { mint: "shelf-bot", symbol: "SHELF", team: "shelf" },
        ]);
      });

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const hpLocal = { n: 100 };
    const onShoot = () => {
      if (!controls.isLocked) return;
      const me = factionRef.current;
      if (!me) {
        setMsg("Spectating — lock a token to shoot.");
        return;
      }
      camera.getWorldDirection(dir);
      ray.set(camera.position, dir);
      const hits = ray.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.userData?.actor);
      if (!hit) {
        setMsg("Miss.");
        return;
      }
      const team = hit.object.userData.team as WorldTeam;
      if (team && team === me.team) {
        setMsg(`Friendly fire blocked — ${me.teamName}`);
        return;
      }
      const id = String(hit.object.userData.id || "");
      const dummy = dummies.find((d) => d.id === id);
      if (!dummy) return;
      dummy.hp -= 34;
      if (dummy.hp <= 0) {
        setKills((k) => k + 1);
        setMsg(`Eliminated $${dummy.symbol}`);
        dummy.hp = 100;
        dummy.pos.set((Math.random() - 0.5) * 22, 0, (Math.random() - 0.5) * 22);
      } else {
        setMsg(`Hit $${dummy.symbol} · ${dummy.hp} HP`);
      }
    };
    renderer.domElement.addEventListener("mousedown", onShoot);

    let velY = 0;
    let grounded = true;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      marker.rotation.y += dt;
      if (controls.isLocked) {
        const forward = Number(keys.KeyW) - Number(keys.KeyS);
        const strafe = Number(keys.KeyD) - Number(keys.KeyA);
        controls.moveForward(forward * SPEED * dt);
        controls.moveRight(strafe * SPEED * dt);
        if (keys.Space && grounded) {
          velY = 7;
          grounded = false;
        }
        velY -= 18 * dt;
        camera.position.y += velY * dt;
        if (camera.position.y < 1.7) {
          camera.position.y = 1.7;
          velY = 0;
          grounded = true;
        }
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -18.5, 18.5);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -18.5, 18.5);
      }
      for (const d of dummies) {
        d.yaw += dt * 0.5;
        d.pos.x += Math.sin(d.yaw) * 1.1 * dt;
        d.pos.z += Math.cos(d.yaw) * 1.1 * dt;
        d.pos.x = THREE.MathUtils.clamp(d.pos.x, -16, 16);
        d.pos.z = THREE.MathUtils.clamp(d.pos.z, -16, 16);
        d.mesh.position.copy(d.pos);
        d.mesh.rotation.y = d.yaw;
        const me = factionRef.current;
        if (
          me &&
          d.team !== me.team &&
          d.pos.distanceTo(camera.position) < 14 &&
          Math.random() < dt * 0.2
        ) {
          hpLocal.n = Math.max(0, hpLocal.n - 8);
          setHp(hpLocal.n);
          if (hpLocal.n <= 0) {
            setMsg(`Downed by $${d.symbol}. Respawning.`);
            hpLocal.n = 100;
            setHp(100);
            camera.position.set(0, 1.7, 12);
          }
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    setReady(true);

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight - 58;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousedown", onShoot);
      controls.unlock();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  void room;

  return (
    <>
      <div ref={host} className="absolute inset-0 h-full w-full bg-[#4aa3c7]" />
      {!ready && (
        <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-navy">
          Starting WebGL…
        </p>
      )}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 bg-white/80" />
          <div className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 bg-white/80" />
        </div>
        <div className="absolute left-4 top-4 ice-card pointer-events-auto max-w-xs p-3 text-xs">
          <p className="text-[10px] font-bold tracking-[0.18em] text-ice">TEAM</p>
          <p className="mt-1 text-base font-bold" style={{ color: faction?.color || "#7dd3fc" }}>
            {faction?.teamName || "Spectator"}
          </p>
          <p className="text-mute">
            {faction ? `via $${faction.symbol}` : "Click ice to look · WASD to walk"}
          </p>
          <p className="mt-2 text-mute">HP {hp} · Kills {kills}</p>
          <p className="mt-2 text-mute">{msg}</p>
        </div>
      </div>
    </>
  );
}
