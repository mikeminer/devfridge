'use client';
import {Canvas,useFrame,useLoader} from '@react-three/fiber';
import {Suspense,useMemo,useRef} from 'react';
import {formatUnits} from 'ethers';
import * as THREE from 'three';
import type {ShelfData} from '@/lib/topshelf/config';
import styles from './analytics.module.css';

const COLORS=['#c8ff5c','#63f5cb','#ff8d6b','#9e8cff','#ffe16b','#67b7ff','#ff75bb','#7ef06b','#ffb86b','#7de4ff','#dba2ff','#f3ff9b'];
const fmt=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:1});

function PreserveJar({address,color,height}:{address:string;color:string;height:number}){
 const label=useLoader(THREE.TextureLoader,`/api/world/topshelf/logo?token=${address}`);
 label.colorSpace=THREE.SRGBColorSpace;
 return <group>
  <mesh position={[0,height*.39,0]}><cylinderGeometry args={[.41,.43,height*.77,28]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.08} roughness={.72}/></mesh>
  <mesh position={[0,height/2,0]}><cylinderGeometry args={[.48,.5,height,32]}/><meshPhysicalMaterial color="#d9fff0" transparent opacity={.3} transmission={.55} thickness={.35} roughness={.12} metalness={0}/></mesh>
  <mesh position={[0,height+.09,0]}><cylinderGeometry args={[.5,.5,.18,32]}/><meshStandardMaterial color="#d5d2bd" metalness={.78} roughness={.34}/></mesh>
  <mesh position={[0,height+.18,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.39,.055,8,32]}/><meshStandardMaterial color="#a9a794" metalness={.9} roughness={.28}/></mesh>
  <mesh position={[0,height*.53,.492]}><circleGeometry args={[.37,32]}/><meshBasicMaterial color="#fff"/></mesh>
  <mesh position={[0,height*.53,.5]}><planeGeometry args={[.66,.66]}/><meshBasicMaterial map={label} transparent toneMapped={false}/></mesh>
 </group>;
}

function JarFallback({color,height}:{color:string;height:number}){
 return <group><mesh position={[0,height/2,0]}><cylinderGeometry args={[.48,.5,height,24]}/><meshStandardMaterial color={color} transparent opacity={.62} roughness={.5}/></mesh><mesh position={[0,height+.09,0]}><cylinderGeometry args={[.5,.5,.18,24]}/><meshStandardMaterial color="#d5d2bd" metalness={.75} roughness={.35}/></mesh></group>;
}

function FridgeShelf({data}:{data:ShelfData}){
 const group=useRef<THREE.Group>(null);
 useFrame(({clock})=>{if(group.current)group.current.rotation.y=Math.sin(clock.elapsedTime*.35)*.08;});
 return <group ref={group} rotation={[-.08,-.18,0]}>
  <mesh position={[0,0,-.62]}><boxGeometry args={[7.8,5.5,.18]}/><meshStandardMaterial color="#172a27" metalness={.6} roughness={.45}/></mesh>
  {[1.65,.15,-1.35].map(y=><mesh key={y} position={[0,y,-.1]}><boxGeometry args={[7.5,.13,1.25]}/><meshStandardMaterial color="#dce7d8" metalness={.35} roughness={.35}/></mesh>)}
  {data.tokens.slice(0,12).map((token,index)=>{
   const col=index%4,row=Math.floor(index/4),funded=BigInt(token.balance)>0n,height=funded?1.18:.72;
   return <group key={token.address} position={[-2.7+col*1.8,2.28-row*1.5,.06]}>
    <Suspense fallback={<JarFallback color={COLORS[index%COLORS.length]} height={height}/>}><PreserveJar address={token.address} color={COLORS[index%COLORS.length]} height={height}/></Suspense>
   </group>;
  })}
  <pointLight position={[0,4,4]} intensity={34} color="#c8ff8b" distance={12}/><ambientLight intensity={1.8}/>
 </group>;
}

export default function TopShelfAnalytics({data}:{data:ShelfData}){
 const tokenRows=useMemo(()=>{
  const rows=data.tokens.map(token=>({token,total:Number(formatUnits(BigInt(token.balance),token.decimals))}));
  const max=Math.max(...rows.map(row=>row.total),1);
  return rows.map(row=>({...row,width:row.total?Math.max(5,Math.log10(row.total+1)/Math.log10(max+1)*100):0}));
 },[data.tokens]);
 const enabled=data.tokens.filter(token=>token.enabled).length,funded=data.tokens.filter(token=>BigInt(token.balance)>0n).length;
 return <section className={styles.analytics} aria-labelledby="protocol-analytics-title">
  <div className={styles.heading}><div><p>TOPSHELF / LIVE ON-CHAIN DATA</p><h2 id="protocol-analytics-title">Protocol analytics</h2><span>Current contract state on Robinhood Chain, refreshed with the leaderboard.</span></div><div className={styles.actions}><span>Block {data.block?.toLocaleString('en-US')||'—'}</span><a href="https://dune.com/meeko/topshelf" target="_blank" rel="noopener noreferrer">Explore on Dune ↗</a></div></div>
  <div className={styles.metrics}><article><small>Current season</small><strong>{data.currentSeason}</strong><span>{data.activeDistribution?`Season ${data.activeDistribution} distribution active`:'Collecting verified runs'}</span></article><article><small>Verified registrations</small><strong>{data.registrations.toLocaleString('en-US')}</strong><span>{data.players.toLocaleString('en-US')} unique player{data.players===1?'':'s'} this season</span></article><article><small>Entry tokens</small><strong>{enabled}<i> / {data.tokens.length}</i></strong><span>{funded} funded pool position{funded===1?'':'s'}</span></article><article><small>Top score</small><strong>{data.rows[0]?BigInt(data.rows[0].score).toLocaleString('en-US'):'—'}</strong><span>{data.rows[0]?.name||data.rows[0]?.address.slice(0,8)||'Waiting for a verified run'}</span></article></div>
  <div className={styles.visuals}><div className={styles.scene}><div className={styles.sceneCopy}><small>LIVE SEASON SHELF</small><strong>{funded} stocked · {data.tokens.length-funded} awaiting deposits</strong></div><Canvas camera={{position:[0,1.2,8],fov:42}} dpr={[1,1.5]} gl={{antialias:true,alpha:true}}><FridgeShelf data={data}/></Canvas></div><div className={styles.bars}><div className={styles.panelTitle}><div><small>SEASON POOL</small><strong>Token balances</strong></div><span>Token units</span></div>{tokenRows.map(({token,total,width},index)=><div className={styles.barRow} key={token.address}><div><strong>{token.symbol}</strong><span>{fmt(total)}</span></div><div className={styles.track}><i style={{width:`${width}%`,background:COLORS[index%COLORS.length]}}/></div></div>)}</div></div>
  <p className={styles.note}>Balances use each token’s native units and are not added into a single monetary value. Historical event analytics and downloadable queries are available on Dune.</p>
 </section>;
}
