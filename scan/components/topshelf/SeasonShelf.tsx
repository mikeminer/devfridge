'use client';

import {Canvas, useLoader, useThree} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei/core/RoundedBox';
import {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {ShelfToken} from '@/lib/topshelf/config';

type RankedToken = ShelfToken & {tvlUsd: number | null};
const PRESERVES = ['#bba944','#629c75','#c2643c','#84617e','#d3a844','#668b9b','#b66b70','#749551','#bb8051','#60938d','#95758f','#b0a85e'];
const JAR_PROFILE = [[0,.02],[.34,.02],[.415,.045],[.45,.12],[.45,.88],[.44,.97],[.39,1.06],[.36,1.09],[.36,1.17],[.325,1.17],[.325,1.08],[.4,.94],[.413,.87],[.413,.14],[.34,.09],[0,.09]];

// Generate a paper label locally, so a slow or failed logo never hides the jar.
function useLabel(token: RankedToken, rank: number) {
  const [texture, setTexture] = useState<THREE.CanvasTexture>();
  const invalidate = useThree(state => state.invalidate);
  const stocked = BigInt(token.balance) > 0n;
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    let active = true;
    const draw = (logo?: HTMLImageElement) => {
      context.fillStyle = '#f2eddd'; context.fillRect(0, 0, 512, 512);
      context.strokeStyle = '#a8ad98'; context.lineWidth = 3; context.strokeRect(18, 18, 476, 476);
      context.fillStyle = '#43564a'; context.textAlign = 'center';
      context.font = 'bold 24px sans-serif'; context.fillText(token.tvlUsd===null?'TVL UNAVAILABLE':`#${rank}  /  $${token.tvlUsd.toLocaleString('en-US',{maximumFractionDigits:2})} TVL`, 256, 58);
      context.save(); context.beginPath(); context.arc(256, 233, 139, 0, Math.PI * 2); context.clip();
      context.fillStyle = '#d5dfc0'; context.fillRect(110, 86, 292, 292);
      if (logo) {
        const scale = Math.max(278 / logo.naturalWidth, 278 / logo.naturalHeight);
        const w = logo.naturalWidth * scale, h = logo.naturalHeight * scale;
        context.drawImage(logo, 256-w/2, 233-h/2, w, h);
      } else {
        context.fillStyle = '#264738'; context.font = 'bold 72px sans-serif';
        context.fillText(token.symbol.slice(0, 3), 256, 258);
      }
      context.restore();
      context.fillStyle = '#243a2d'; context.font = `bold ${token.symbol.length > 10 ? 32 : 40}px sans-serif`;
      context.fillText(token.symbol, 256, 423, 442);
      context.font = '500 21px sans-serif'; context.fillStyle = '#68745e';
      context.fillText(stocked ? 'SEASON POOL · STOCKED' : 'AWAITING DEPOSITS', 256, 465);
      map.needsUpdate = true; invalidate();
    };
    draw(); setTexture(map);
    const image = new Image();
    image.onload = () => {if (active && image.naturalWidth) draw(image);};
    image.src = `/api/world/topshelf/logo?token=${token.address}`;
    return () => {active = false; image.onload = null; map.dispose();};
  }, [token.address, token.symbol, token.tvlUsd, rank, stocked, invalidate]);
  return texture;
}

function LidRidges() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    const instance = new THREE.Object3D();
    for (let i=0; i<32; i++) {
      const angle=i/32*Math.PI*2;
      instance.position.set(Math.sin(angle)*.402,1.206,Math.cos(angle)*.402);
      instance.rotation.set(0,angle,0); instance.updateMatrix();
      mesh.current.setMatrixAt(i,instance.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  }, []);
  return <instancedMesh ref={mesh} args={[undefined,undefined,32]}><boxGeometry args={[.016,.077,.01]}/><meshStandardMaterial color="#d0c7ac" metalness={.82} roughness={.32}/></instancedMesh>;
}
function PreserveJar({token, index}: {token: RankedToken; index: number}) {
  const label = useLabel(token, index+1);
  const points = useMemo(() => JAR_PROFILE.map(([x,y]) => new THREE.Vector2(x,y)), []);
  const stocked = BigInt(token.balance) > 0n;
  const color = PRESERVES[parseInt(token.address.slice(-4),16) % PRESERVES.length];
  return <group rotation={[0, (index % 3 - 1) * .045, 0]}>
    {stocked && <group>
      <mesh position={[0,.43,0]} castShadow><cylinderGeometry args={[.403,.403,.69,32]}/><meshPhysicalMaterial color={color} roughness={.31} clearcoat={.7}/></mesh>
      <mesh position={[0,.785,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.4,32]}/><meshPhysicalMaterial color={color} roughness={.2} clearcoat={1}/></mesh>
    </group>}
    <mesh receiveShadow>
      <latheGeometry args={[points,48]}/>
      <meshPhysicalMaterial color="#dbede2" metalness={0} roughness={.08} transmission={.72} thickness={.055} ior={1.47} transparent opacity={.48} envMapIntensity={1.4} depthWrite={false}/>
    </mesh>
    {[.08,1.1,1.15].map(y => <mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[y<1?.408:.362,.014,8,48]}/><meshPhysicalMaterial color="#d2e5d8" transparent opacity={.65} roughness={.13} metalness={.15}/></mesh>)}
    <mesh position={[0,1.205,0]} castShadow><cylinderGeometry args={[.398,.404,.13,64]}/><meshStandardMaterial color="#a8a28b" metalness={.86} roughness={.27}/></mesh>
    {[1.146,1.267].map(y => <mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.395,.019,8,48]}/><meshStandardMaterial color="#d8d0b5" metalness={.92} roughness={.23}/></mesh>)}
    <mesh position={[0,1.274,0]}><cylinderGeometry args={[.346,.346,.012,48]}/><meshStandardMaterial color="#b8b098" metalness={.78} roughness={.36}/></mesh>
    <LidRidges/>
    <mesh position={[0,.565,0]} rotation={[0,-.84,0]}>
      <cylinderGeometry args={[.456,.456,.62,32,1,true,0,1.68]}/>
      <meshStandardMaterial map={label} color={label?'#ffffff':'#f2eddd'} roughness={.88} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function Studio({height}: {height: number}) {
  const {gl, scene, camera, size, invalidate} = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, .04);
    scene.environment = environment.texture;
    invalidate();
    return () => {scene.environment = null; environment.dispose(); room.dispose(); generator.dispose();};
  }, [gl, scene, invalidate]);
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const halfFov = THREE.MathUtils.degToRad(perspective.fov / 2);
    const distance = Math.max((height/2+.7) / Math.tan(halfFov), 4.5 / (Math.tan(halfFov) * size.width / size.height));
    perspective.position.set(.45, .5, distance);
    perspective.lookAt(0, .15, 0); perspective.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, size.height, height, invalidate]);
  return <>
    <hemisphereLight args={['#f2f5e4','#33473a',.65]}/>
    <directionalLight position={[-3,6,7]} intensity={2} color="#fff1d8" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-4} shadow-normalBias={.025} shadow-bias={-.0001}/>
    <directionalLight position={[5,2,4]} intensity={.8} color="#c4e4e8"/>
  </>;
}

function useOak() {
  const maps=useLoader(THREE.TextureLoader,['/world/textures/oak/color.webp','/world/textures/oak/normal.webp','/world/textures/oak/roughness.webp']);
  const {gl}=useThree();
  const materials=useMemo(()=>[false,true].map(vertical=>{
    const textures=maps.map((original,index)=>{
      const texture=original.clone();
      texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace;
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.repeat.set(vertical?1:2,vertical?2:1);
      texture.center.set(.5,.5);texture.rotation=vertical?Math.PI/2:0;
      texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());texture.needsUpdate=true;
      return texture;
    });
    return new THREE.MeshStandardMaterial({map:textures[0],normalMap:textures[1],roughnessMap:textures[2],normalScale:new THREE.Vector2(.35,.35),roughness:.85,metalness:0,color:'#b98e66'});
  }),[maps,gl]);
  useEffect(()=>()=>{materials.forEach(material=>{material.map?.dispose();material.normalMap?.dispose();material.roughnessMap?.dispose();material.dispose();});},[materials]);
  return materials;
}

function Cabinet({tokens, rows}: {tokens: RankedToken[]; rows: number}) {
  const [horizontal,vertical]=useOak();
  const extra=(rows-3)*1.67,height=6.45+extra;
  const shelves=Array.from({length:rows},(_,i)=>1.05+extra/2-i*1.67);
  return <group rotation={[0,-.075,0]}>
    <RoundedBox args={[7.65,height,.3]} radius={.06} position={[0,.15,-.94]} receiveShadow material={horizontal}/>
    {Array.from({length:7},(_,i)=><RoundedBox key={i} args={[.996,height-.4,.13]} radius={.015} position={[-3.03+i*1.01,.15,-.72]} receiveShadow material={vertical}/>)}
    {[-3.67,3.67].map(x=><RoundedBox key={x} args={[.28,height,1.68]} radius={.035} position={[x,.15,-.04]} castShadow receiveShadow material={vertical}/>)}
    {[-2.99-extra/2,3.29+extra/2].map(y=><RoundedBox key={y} args={[7.42,.26,1.68]} radius={.035} position={[0,y,-.04]} castShadow receiveShadow material={horizontal}/>)}
    {shelves.map(y=><group key={y}>
      <RoundedBox args={[7.1,.18,1.48]} radius={.025} position={[0,y,.05]} castShadow receiveShadow material={horizontal}/>
      <RoundedBox args={[7.12,.22,.1]} radius={.025} position={[0,y-.025,.81]} castShadow receiveShadow material={horizontal}/>
      {[-3.31,3.31].map(x=><mesh key={x} position={[x,y-.2,-.05]}><boxGeometry args={[.12,.25,1.3]}/><meshStandardMaterial color="#352d24" roughness={.52} metalness={.65}/></mesh>)}
    </group>)}
    {tokens.map((token,index)=><group key={token.address} position={[-2.58+(index%4)*1.72,shelves[Math.floor(index/4)]+.07,.14]}><PreserveJar token={token} index={index}/></group>)}
  </group>;
}

export default function SeasonShelf({tokens}: {tokens: RankedToken[]}) {
  const rows=Math.max(3,Math.ceil(tokens.length/4));
  return <Canvas frameloop="demand" shadows camera={{position:[0,.5,13],fov:38}} dpr={[1,1.5]} gl={{antialias:true,alpha:true,powerPreference:'low-power'}}>
    <Studio height={6.45+(rows-3)*1.67}/>
    <Suspense fallback={null}><Cabinet tokens={tokens} rows={rows}/></Suspense>
  </Canvas>;
}

