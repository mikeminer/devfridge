'use client';
import SeasonShelf from './SeasonShelf';
import {useMemo} from 'react';
import {formatUnits} from 'ethers';

import type {ShelfData} from '@/lib/topshelf/config';
import styles from './analytics.module.css';

const COLORS=['#c8ff5c','#63f5cb','#ff8d6b','#9e8cff','#ffe16b','#67b7ff','#ff75bb','#7ef06b','#ffb86b','#7de4ff','#dba2ff','#f3ff9b'];
const fmt=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:1});

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
  <div className={styles.visuals}><div className={styles.scene}><div className={styles.sceneCopy}><small>LIVE SEASON SHELF</small><strong>{funded} stocked · {data.tokens.length-funded} awaiting deposits</strong></div><div className={styles.shelfViewport} role="img" aria-label="Fridge cabinet with glass preserve jars labelled with token logos from Pons. Filled jars indicate a nonzero pool balance."><SeasonShelf tokens={data.tokens}/></div><div className={styles.sceneFooter}><span><i/> Chilled reserves</span><span>One jar per token · fill indicates deposits</span></div></div><div className={styles.bars}><div className={styles.panelTitle}><div><small>SEASON POOL</small><strong>Token balances</strong></div><span>Token units</span></div>{tokenRows.map(({token,total,width},index)=><div className={styles.barRow} key={token.address}><div><strong>{token.symbol}</strong><span>{fmt(total)}</span></div><div className={styles.track}><i style={{width:`${width}%`,background:COLORS[index%COLORS.length]}}/></div></div>)}</div></div>
  <p className={styles.note}>Balances use each token’s native units and are not added into a single monetary value. Historical event analytics and downloadable queries are available on Dune.</p>
 </section>;
}
