"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Float,
  PointerLockControls,
  Sparkles,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { PASTA_MINT } from "@/lib/constants";
import { teamFromMint, type WorldTeam } from "@/lib/world-faction";
import type { Faction } from "./WorldApp";

useGLTF.preload("/world/Soldier.glb");
useGLTF.preload("/world/Xbot.glb");
useGLTF.preload("/world/Duck.glb");

type Dummy = {
  id: string;
  mint: string;
  symbol: string;
  team: WorldTeam;
  color: string;
  pos: THREE.Vector3;
  hp: number;
  yaw: number;
  bot: boolean;
};

const SPEED = 9;
const SHELVES: [number, number, number, number, number, number][] = [
  [-8, 1.2, -6, 4, 2.4, 1.2],
  [8, 1.2, -6, 4, 2.4, 1.2],
  [-8, 1.2, 6, 4, 2.4, 1.2],
  [8, 1.2, 6, 4, 2.4, 1.2],
  [0, 1.6, 0, 2.2, 3.2, 2.2],
  [-2, 0.6, 10, 6, 1.2, 1],
  [2, 0.6, -10, 6, 1.2, 1],
];

export default function FridgeCanvas({
  faction,
  room,
}: {
  faction: Faction | null;
  room: string;
}) {
  const [hp, setHp] = useState(100);
  const [kills, setKills] = useState(0);
  const [msg, setMsg] = useState(
    "Click to enter. WASD move, click shoot. Pastalovers vs The Shelf — no friendly fire."
  );
  const [roomUrl, setRoomUrl] = useState("");
  const hpRef = useRef(100);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("room", room || "open");
    setRoomUrl(u.toString());
  }, [room]);

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 75, position: [0, 1.6, 12] }}
        onPointerDown={() => setMsg("")}
        style={{ height: "100%", width: "100%" }}
      >
        <color attach="background" args={["#071018"]} />
        <fog attach="fog" args={["#071018", 14, 42]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[0, 7.4, 0]} intensity={50} color="#7dd3fc" castShadow />
        <pointLight position={[0, 2.2, 0]} intensity={18} color="#fbbf24" />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[2, 2, 2]} />
              <meshBasicMaterial color="#4fc3f7" wireframe />
            </mesh>
          }
        >
          <Arena />
          <Player
            faction={faction}
            onHp={setHp}
            hpRef={hpRef}
            onKill={() => setKills((k) => k + 1)}
            onMsg={setMsg}
          />
        </Suspense>
        <PointerLockControls />
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 bg-ice/80" />
          <div className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 bg-ice/80" />
        </div>
        <div className="absolute left-4 top-4 ice-card pointer-events-auto max-w-xs p-3 text-xs">
          <p className="text-[10px] font-bold tracking-[0.18em] text-ice">TEAM</p>
          <p className="mt-1 text-base font-bold" style={{ color: faction?.color || "#7dd3fc" }}>
            {faction?.teamName || "Spectator"}
          </p>
          <p className="text-mute">
            {faction ? `via $${faction.symbol} · ${faction.name}` : "Look around — lock a token to fight"}
          </p>
          <p className="mt-2 text-mute">HP {hp} · Kills {kills}</p>
          <p className="mt-2 text-mute">{msg}</p>
        </div>
        <div className="absolute right-4 top-4 ice-card pointer-events-auto max-w-sm p-3 text-xs">
          <p className="text-mute">Pastalovers = $PASTA lock. The Shelf = any other live lock.</p>
          <p className="mt-2 text-mute">You cannot kill your own team.</p>
          <p className="mt-2 break-all text-[11px] text-ice">{roomUrl || "world.devfridge.cool"}</p>
        </div>
      </div>
    </>
  );
}

function IceWall({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color="#7ec8e3"
        roughness={0.12}
        metalness={0.05}
        transmission={0.55}
        thickness={1.2}
        transparent
        opacity={0.9}
        ior={1.3}
      />
    </mesh>
  );
}

function Arena() {
  const duck = useGLTF("/world/Duck.glb");
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0b1528" metalness={0.35} roughness={0.28} />
      </mesh>
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[40, 0.4, 40]} />
        <meshStandardMaterial color="#0a1222" />
      </mesh>
      <IceWall position={[0, 4, -20]} args={[40, 8, 0.45]} />
      <IceWall position={[0, 4, 20]} args={[40, 8, 0.45]} />
      <IceWall position={[-20, 4, 0]} args={[0.45, 8, 40]} />
      <IceWall position={[20, 4, 0]} args={[0.45, 8, 40]} />
      {SHELVES.map(([x, y, z, w, h, d], i) => (
        <mesh key={`s${i}`} position={[x, y, z]} castShadow receiveShadow userData={{ cover: true }}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#1a3a55" metalness={0.45} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.7, 28]} />
        <meshStandardMaterial color="#c2410c" emissive="#9a3412" emissiveIntensity={0.55} />
      </mesh>
      <Sparkles count={80} scale={[36, 8, 36]} size={3} speed={0.35} color="#7dd3fc" />
      <ContactShadows opacity={0.45} scale={40} blur={2.4} far={8} />
      {[
        [-8, 2.7, -6],
        [8, 2.7, -6],
        [-8, 2.7, 6],
        [8, 2.7, 6],
        [-2, 1.5, 10],
        [2, 1.5, -10],
      ].map((p, i) => (
        <Float key={i} speed={1.2} floatIntensity={0.4} rotationIntensity={0.3}>
          <primitive
            object={duck.scene.clone()}
            position={p as [number, number, number]}
            scale={1.6}
            rotation={[0, (i * Math.PI) / 3, 0]}
          />
        </Float>
      ))}
    </group>
  );
}

function Player({
  faction,
  onHp,
  hpRef,
  onKill,
  onMsg,
}: {
  faction: Faction | null;
  onHp: (n: number) => void;
  hpRef: React.MutableRefObject<number>;
  onKill: () => void;
  onMsg: (s: string) => void;
}) {
  const { camera, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velY = useRef(0);
  const grounded = useRef(true);
  const dummies = useRef<Dummy[]>([]);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const downs = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const ups = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", downs);
    window.addEventListener("keyup", ups);
    return () => {
      window.removeEventListener("keydown", downs);
      window.removeEventListener("keyup", ups);
    };
  }, []);

  useEffect(() => {
    fetch("/api/feed/boosted")
      .then((r) => r.json())
      .then((j: { tokens?: { mint: string; symbol?: string }[] }) => {
        const rows = j.tokens || [];
        const myTeam = faction?.team;
        const enemies = rows.filter((t) => !myTeam || teamFromMint(t.mint) !== myTeam);
        const spawns: [number, number][] = [
          [-10, -10],
          [10, -10],
          [-10, 10],
          [10, 10],
        ];
        let bots = enemies.slice(0, 4).map((t, i) => {
          const team = teamFromMint(t.mint);
          return {
            id: `bot-${t.mint.slice(0, 6)}`,
            mint: t.mint,
            symbol: t.symbol || "TKN",
            team,
            color: team === "pastalovers" ? "#f59e0b" : "#4fc3f7",
            pos: new THREE.Vector3(spawns[i][0], 1, spawns[i][1]),
            hp: 100,
            yaw: 0,
            bot: true,
          };
        });
        if (bots.length === 0) {
          const enemyTeam = faction?.team === "pastalovers" ? "shelf" : "pastalovers";
          bots = [
            {
              id: "bot-rival",
              mint: enemyTeam === "pastalovers" ? PASTA_MINT : "shelf-bot",
              symbol: enemyTeam === "pastalovers" ? "PASTA" : "SHELF",
              team: enemyTeam,
              color: enemyTeam === "pastalovers" ? "#f59e0b" : "#4fc3f7",
              pos: new THREE.Vector3(-9, 1, -8),
              hp: 100,
              yaw: 0,
              bot: true,
            },
          ];
        }
        dummies.current = bots;
        setTick((n) => n + 1);
      })
      .catch(() => {
        const enemyTeam = faction?.team === "pastalovers" ? "shelf" : "pastalovers";
        dummies.current = [
          {
            id: "bot-rival",
            mint: enemyTeam === "pastalovers" ? PASTA_MINT : "shelf-bot",
            symbol: enemyTeam === "pastalovers" ? "PASTA" : "SHELF",
            team: enemyTeam,
            color: enemyTeam === "pastalovers" ? "#f59e0b" : "#4fc3f7",
            pos: new THREE.Vector3(-9, 1, -8),
            hp: 100,
            yaw: 0,
            bot: true,
          },
        ];
        setTick((n) => n + 1);
      });
  }, [faction?.team]);

  useEffect(() => {
    const shoot = () => {
      camera.getWorldDirection(dir);
      ray.set(camera.position, dir);
      const hits = ray.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.userData?.actor);
      if (!hit) {
        onMsg("Miss.");
        return;
      }
      if (!faction) {
        onMsg("Spectating — lock a token to shoot.");
        return;
      }
      const team = String(hit.object.userData.team || "") as WorldTeam;
      if (team && team === faction.team) {
        onMsg(`Friendly fire blocked — ${faction.teamName} don't shoot each other`);
        return;
      }
      const id = String(hit.object.userData.id || "");
      const dummy = dummies.current.find((d) => d.id === id);
      if (!dummy) return;
      dummy.hp -= 34;
      if (dummy.hp <= 0) {
        onKill();
        onMsg(`Eliminated $${dummy.symbol}`);
        dummy.hp = 100;
        dummy.pos.set((Math.random() - 0.5) * 24, 1, (Math.random() - 0.5) * 24);
      } else {
        onMsg(`Hit $${dummy.symbol} · ${dummy.hp} HP`);
      }
      setTick((n) => n + 1);
    };
    window.addEventListener("mousedown", shoot);
    return () => window.removeEventListener("mousedown", shoot);
  }, [camera, dir, faction, onKill, onMsg, ray, scene]);

  useFrame((_, dt) => {
    const t = Math.min(dt, 0.05);
    const forward = Number(keys.current["KeyW"]) - Number(keys.current["KeyS"]);
    const strafe = Number(keys.current["KeyD"]) - Number(keys.current["KeyA"]);
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).negate();
    camera.position.addScaledVector(dir, forward * SPEED * t);
    camera.position.addScaledVector(right, strafe * SPEED * t);
    if (keys.current["Space"] && grounded.current) {
      velY.current = 7;
      grounded.current = false;
    }
    velY.current -= 18 * t;
    camera.position.y += velY.current * t;
    if (camera.position.y < 1.6) {
      camera.position.y = 1.6;
      velY.current = 0;
      grounded.current = true;
    }
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -18.5, 18.5);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -18.5, 18.5);

    for (const d of dummies.current) {
      d.yaw += t * 0.4;
      d.pos.x += Math.sin(d.yaw) * 1.2 * t;
      d.pos.z += Math.cos(d.yaw) * 1.2 * t;
      d.pos.x = THREE.MathUtils.clamp(d.pos.x, -16, 16);
      d.pos.z = THREE.MathUtils.clamp(d.pos.z, -16, 16);
      if (
        faction &&
        d.team !== faction.team &&
        d.pos.distanceTo(camera.position) < 14 &&
        Math.random() < t * 0.25
      ) {
        hpRef.current = Math.max(0, hpRef.current - 8);
        onHp(hpRef.current);
        if (hpRef.current <= 0) {
          onMsg(`Downed by $${d.symbol}. Respawning.`);
          hpRef.current = 100;
          onHp(100);
          camera.position.set(0, 1.6, 12);
        }
      }
    }
  });

  void tick;
  return (
    <group>
      {dummies.current.map((d) => (
        <BotMesh key={d.id} dummy={d} />
      ))}
    </group>
  );
}

function BotMesh({ dummy }: { dummy: Dummy }) {
  const url = dummy.team === "pastalovers" ? "/world/Soldier.glb" : "/world/Xbot.glb";
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => cloneSkinned(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    clone.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      mesh.userData = {
        actor: true,
        id: dummy.id,
        mint: dummy.mint,
        symbol: dummy.symbol,
        team: dummy.team,
      };
      if (mesh.isMesh) {
        mesh.castShadow = true;
        const mat = mesh.material;
        if (mat && !Array.isArray(mat) && "emissive" in mat) {
          const m = mat.clone() as THREE.MeshStandardMaterial;
          m.emissive = new THREE.Color(dummy.color);
          m.emissiveIntensity = 0.18;
          mesh.material = m;
        }
      }
    });
  }, [clone, dummy]);

  useEffect(() => {
    const walk = actions.Walk || actions.walk || Object.values(actions)[0];
    walk?.reset().fadeIn(0.2).play();
    return () => {
      walk?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(dummy.pos);
    group.current.position.y = 0;
    group.current.rotation.y = dummy.yaw;
  });

  return (
    <group ref={group} scale={1}>
      <primitive object={clone} />
    </group>
  );
}
