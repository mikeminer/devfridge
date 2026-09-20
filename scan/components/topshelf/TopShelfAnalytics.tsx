'use client';
import SeasonShelf from './SeasonShelf';
import {useEffect,useMemo,useState} from 'react';
import {rankShelfTokens,type ShelfPrices} from '@/lib/topshelf/valuation';

import type {ShelfData} from '@/lib/topshelf/config';
import styles from './analytics.module.css';

const COLORS=['#c8ff5c','#63f5cb','#ff8d6b','#9e8cff','#ffe16b','#67b7ff','#ff75bb','#7ef06b','#ffb86b','#7de4ff','#dba2ff','#f3ff9b'];
const fmt=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:1});
const usd=(value:number)=>value.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:value>0&&value<.01?4:2});

export default function TopShelfAnalytics({data}:{data:ShelfData}){
 const [prices,setPrices]=useState<ShelfPrices>({});
 const [loadingPrices,setLoadingPrices]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  let running=false;
  const refresh=async()=>{
   if(running)return;
   running=true;
   try{
    const response=await fetch('/api/world/topshelf/prices',{signal:controller.signal});
    if(!response.ok)throw Error('Prices unavailable');
    const payload=await response.json();
    if(!controller.signal.aborted)setPrices(payload.prices||{});
   }catch{if(!controller.signal.aborted)setPrices({});}
   finally{running=false;if(!controller.signal.aborted)setLoadingPrices(false);}
  };
  void refresh();const timer=setInterval(refresh,60000);
  return()=>{controller.abort();clearInterval(timer);};
 },[]);
 const tokenRows=useMemo(()=>{
  const rows=rankShelfTokens(data.tokens,prices);
  const max=Math.max(...rows.map(row=>row.tvlUsd??0),Number.MIN_VALUE);
  return rows.map(row=>({...row,width:row.tvlUsd?Math.max(1,row.tvlUsd/max*100):0}));
 },[data.tokens,prices]);
 const shelfTokens=useMemo(()=>tokenRows.map(({token,tvlUsd})=>({...token,tvlUsd})),[tokenRows]);
 const enabled=data.tokens.filter(token=>token.enabled).length,funded=data.tokens.filter(token=>BigInt(token.balance)>0n).length;
 return <section className={styles.analytics} aria-labelledby="protocol-analytics-title">
  <div className={styles.heading}><div><p>TOPSHELF / LIVE ON-CHAIN DATA</p><h2 id="protocol-analytics-title">Protocol analytics</h2><span>Current contract state on Robinhood Chain, refreshed with the leaderboard.</span></div><div className={styles.actions}><span>Block {data.block?.toLocaleString('en-US')||'—'}</span><a href="https://dune.com/meeko/topshelf" target="_blank" rel="noopener noreferrer">Explore on Dune ↗</a></div></div>
  <div className={styles.metrics}><article><small>Current season</small><strong>{data.currentSeason}</strong><span>{data.activeDistribution?`Season ${data.activeDistribution} distribution active`:'Collecting verified runs'}</span></article><article><small>Verified registrations</small><strong>{data.registrations.toLocaleString('en-US')}</strong><span>{data.players.toLocaleString('en-US')} unique player{data.players===1?'':'s'} this season</span></article><article><small>Entry tokens</small><strong>{enabled}<i> / {data.tokens.length}</i></strong><span>{funded} funded pool position{funded===1?'':'s'}</span></article><article><small>Top score</small><strong>{data.rows[0]?BigInt(data.rows[0].score).toLocaleString('en-US'):'—'}</strong><span>{data.rows[0]?.name||data.rows[0]?.address.slice(0,8)||'Waiting for a verified run'}</span></article></div>
  <div className={styles.visuals}><div className={styles.scene}><div className={styles.sceneCopy}><small>LIVE SEASON SHELF</small><strong>{loadingPrices?'Valuing the season pool…':'Highest TVL on the top shelf'}</strong><span>{funded} stocked · {data.tokens.length-funded} awaiting deposits</span></div><div className={styles.shelfViewport} role="img" aria-label="Oak shelves with Pons token jars ordered by estimated USD TVL, highest to lowest, left to right and top to bottom. Tokens without prices follow ranked jars."><SeasonShelf tokens={shelfTokens}/></div><div className={styles.sceneFooter}><span><i/> Ranked by pool TVL</span><span>Highest at the top · unpriced jars last</span></div></div><div className={styles.bars}><div className={styles.panelTitle}><div><small>SEASON POOL</small><strong>TVL by token</strong></div><span>Estimated USD</span></div>{tokenRows.map(({token,amount,tvlUsd,width},index)=><div className={styles.barRow} key={token.address}><div><strong>{tvlUsd===null?'—':index+1}. {token.symbol}</strong><span>{tvlUsd===null?(loadingPrices?'Pricing…':'Price unavailable'):usd(tvlUsd)}</span></div><div className={styles.track}><i style={{width:`${width}%`,background:COLORS[index%COLORS.length]}}/></div><small className={styles.tokenUnits}>{fmt(amount)} {token.symbol}</small></div>)}</div></div>
  <p className={styles.note}>TVL is each token’s total balance held by TopShelf, including reserved claims, multiplied by its Pons USD price estimate. Prices are cached for up to five minutes and may lag the market. Jars rank left to right, top to bottom; unpriced balances remain unranked at the end. Estimates are not guaranteed sale proceeds.</p>
 </section>;
}
