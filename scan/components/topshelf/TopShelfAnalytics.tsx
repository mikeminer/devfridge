'use client';
import SeasonShelf from './SeasonShelf';
import {useEffect,useMemo,useState} from 'react';
import {rankShelfTokens,summarizePoolValue,type ShelfPrices} from '@/lib/topshelf/valuation';

import type {ShelfData} from '@/lib/topshelf/config';
import styles from './analytics.module.css';

const COLORS=['#c8ff5c','#63f5cb','#ff8d6b','#9e8cff','#ffe16b','#67b7ff','#ff75bb','#7ef06b','#ffb86b','#7de4ff','#dba2ff','#f3ff9b'];
const fmt=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:1});
const usd=(value:number)=>value.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:value>0&&value<.01?4:2});
const unitUsd=(value:number)=>'$'+value.toLocaleString('en-US',{maximumSignificantDigits:6});
type PoolValue = ReturnType<typeof summarizePoolValue>;
const poolValue=(value:PoolValue,loading:boolean)=>loading&&value.fundedTokens>0?'Valuing…':value.valueUsd===null?'Awaiting prices':usd(value.valueUsd);

export default function TopShelfAnalytics({data}:{data:ShelfData}){
 const [prices,setPrices]=useState<ShelfPrices>({});
 const [loadingPrices,setLoadingPrices]=useState(true);
 const [pricingError,setPricingError]=useState(false);
 const [checkedAt,setCheckedAt]=useState<string|null>(null);
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  let running=false;
  setLoadingPrices(true);
  const refresh=async()=>{
   if(running)return;
   running=true;
   try{
    const response=await fetch('/api/world/topshelf/prices?v=2',{signal:controller.signal});
    if(!response.ok)throw Error('Prices unavailable');
    const payload=await response.json();
    if(!controller.signal.aborted){
     setPrices(payload.prices||{});setPricingError(false);
     setCheckedAt(typeof payload.checkedAt==='string'&&!Number.isNaN(Date.parse(payload.checkedAt))?payload.checkedAt:null);
    }
   }catch{if(!controller.signal.aborted){setPrices({});setPricingError(true);setCheckedAt(null);}}
   finally{running=false;if(!controller.signal.aborted)setLoadingPrices(false);}
  };
  void refresh();const timer=setInterval(refresh,60000);
  return()=>{controller.abort();clearInterval(timer);};
 },[refreshKey]);
 const tokenRows=useMemo(()=>{
  const rows=rankShelfTokens(data.tokens,prices);
  const max=Math.max(...rows.map(row=>row.tvlUsd??0),Number.MIN_VALUE);
  return rows.map(row=>({...row,width:row.tvlUsd?Math.max(1,row.tvlUsd/max*100):0,fillFraction:row.tvlUsd===null?null:Math.min(1,row.tvlUsd/max)}));
 },[data.tokens,prices]);
 const shelfTokens=useMemo(()=>tokenRows.map(({token,tvlUsd,fillFraction})=>({...token,tvlUsd,fillFraction})),[tokenRows]);
 const available=useMemo(()=>summarizePoolValue(data.tokens,prices,'available'),[data.tokens,prices]);
 const reserved=useMemo(()=>summarizePoolValue(data.tokens,prices,'reserved'),[data.tokens,prices]);
 const held=useMemo(()=>summarizePoolValue(data.tokens,prices,'balance'),[data.tokens,prices]);
 const partialLabel=(value:PoolValue)=>value.unpricedTokens>0?`${value.pricedTokens} of ${value.fundedTokens} funded tokens valued${value.partial?' · partial estimate':''}`:'Estimated in USD';
 const enabled=data.tokens.filter(token=>token.enabled).length,funded=data.tokens.filter(token=>BigInt(token.balance)>0n).length;
 return <section className={styles.analytics} aria-labelledby="protocol-analytics-title">
  <div className={styles.heading}><div><p>TOPSHELF / LIVE ON-CHAIN DATA</p><h2 id="protocol-analytics-title">Protocol analytics</h2><span>Current contract state on Robinhood Chain, refreshed with the leaderboard.</span></div><div className={styles.actions}><span>Block {data.block?.toLocaleString('en-US')||'—'}</span><a href="https://dune.com/meeko/topshelf" target="_blank" rel="noopener noreferrer">Explore on Dune ↗</a></div></div>
  <div className={styles.metrics}><article><small>Current season</small><strong>{data.currentSeason}</strong><span>{data.activeDistribution?`Season ${data.activeDistribution} distribution active`:'Collecting verified runs'}</span></article><article><small>Verified registrations</small><strong>{data.registrations.toLocaleString('en-US')}</strong><span>{data.players.toLocaleString('en-US')} unique player{data.players===1?'':'s'} this season</span></article><article><small>Entry tokens</small><strong>{enabled}<i> / {data.tokens.length}</i></strong><span>{funded} funded pool position{funded===1?'':'s'}</span></article><article><small>Top score</small><strong>{data.rows[0]?BigInt(data.rows[0].score).toLocaleString('en-US'):'—'}</strong><span>{data.rows[0]?.name||data.rows[0]?.address.slice(0,8)||'Waiting for a verified run'}</span></article></div>
  <div className={styles.poolSummary} aria-label="Prize pool value">
   <article className={styles.prizeTotal} data-pool-value="available"><small>PRIZE POOL · SEASON {data.currentSeason}</small><strong>{poolValue(available,loadingPrices)}</strong><span>Available for this season’s rewards</span><small>{partialLabel(available)}</small></article>
   <article data-pool-value="reserved"><small>Reserved for approved claims</small><strong>{poolValue(reserved,loadingPrices)}</strong><span>Already allocated to a distribution</span><small>{partialLabel(reserved)}</small></article>
   <article data-pool-value="balance"><small>Total held by TopShelf</small><strong>{poolValue(held,loadingPrices)}</strong><span>Available funds + reserved claims</span><small>{partialLabel(held)}</small></article>
  </div>
  <p className={styles.note}>Dollar estimates = token balances × Pons prices. The tokens stay in the pool; they have not been converted to dollars.</p>
  {!loadingPrices&&(pricingError||held.unpricedTokens>0)&&<p className={styles.priceNotice} role="status">{pricingError?'Pons prices could not be refreshed.':held.valueUsd===null?'A full pool value cannot be calculated until Pons prices are available.':`The displayed value excludes ${held.unpricedTokens} funded token${held.unpricedTokens===1?'':'s'} without a Pons price.`} Balances remain visible below. <button type="button" onClick={()=>setRefreshKey(key=>key+1)}>Retry prices</button></p>}
  <div className={styles.visuals}><div className={styles.scene}><div className={styles.sceneCopy}><small>LIVE SEASON SHELF</small><strong>{loadingPrices?'Valuing the season pool…':'Highest-value jars at the top'}</strong><span>{funded} stocked · {data.tokens.length-funded} empty</span></div><div className={styles.shelfViewport} role="img" aria-label="Oak shelves with token jars ordered by USD pool value, highest first. Fill levels show relative USD value. Unpriced deposits follow valued jars; empty jars are always last."><SeasonShelf tokens={shelfTokens}/></div><div className={styles.sceneFooter}><span><i/> Fill = relative USD value</span><span>Highest first · empty jars at the bottom</span></div></div><div className={styles.bars}><div className={styles.panelTitle}><div><small>SEASON POOL</small><strong>Pool value by token</strong></div><span>USD value</span></div><p className={styles.valueExplanation}>Token amount × Pons price per token = value in the pool.</p>{tokenRows.map(({token,amount,tvlUsd,priceUsd,width},index)=><div className={styles.barRow} key={token.address} data-token={token.address} data-pool-usd={tvlUsd??'unknown'}><div><strong>{tvlUsd===null||amount===0?'—':index+1}. {token.symbol}</strong><span>{tvlUsd===null?(loadingPrices?'Pricing…':'Not yet valued'):usd(tvlUsd)}</span></div><div className={styles.track}><i style={{width:`${width}%`,background:COLORS[index%COLORS.length]}}/></div><small className={styles.tokenUnits}>{amount===0?'No deposits yet':`${fmt(amount)} ${token.symbol} in TopShelf`}</small><small className={styles.tokenPrice}>{priceUsd===null?(loadingPrices?'Checking Pons price…':'Pons quote unavailable'):`${unitUsd(priceUsd)} per ${token.symbol}`}</small></div>)}</div></div>
  <p className={styles.note}>USD values estimate what the tokens held by TopShelf are worth at Pons market prices; they are not dollar balances. The prize pool excludes funds already reserved for claims. Shelf order and fill levels use total holdings, including reserved claims. Missing prices are excluded and marked as partial; no price is assumed to be zero.</p>
  <p className={styles.note}>Prices are cached for up to five minutes and checked every minute.{checkedAt?` Last check: ${new Date(checkedAt).toISOString().slice(11,16)} UTC.`:''} Market values may change and differ from sale proceeds.</p>
 </section>;
}
