import {evaluateTimelocks} from './timelock-gate.mjs';
export function fixtureGate(kind, now=Math.floor(Date.now()/1000)) {
 const wallet='FIXTURE_WALLET',mint='FIXTURE_MINT';
 const evidence={wallet,mint,ts:kind==='stale'?now-200:now,activeLocks:[{address:'FIXTURE_VAULT',depositor:wallet,mint,amount:kind==='insufficient'?'99000000':'100000000',createdAt:now-3600,unlockAt:kind==='expired'?now-1:now+7200}]};
 return evaluateTimelocks(evidence,{wallet,mint,minimumRaw:100000000n,minRemainingSeconds:3600});
}
export class LockReader {
 constructor(fetcher=(url,options)=>globalThis.fetch(url,options)){this.fetcher=fetcher;this.pending=null;this.retryAt=0;this.failures=0;}
 async read(wallet,mint){
  if(Date.now()<this.retryAt)throw Error('Service cooling down. Please retry shortly.');
  const key=wallet+':'+mint;
  if(this.pending?.key===key)return this.pending.promise;
  const promise=(async()=>{try{
   const response=await this.fetcher(`https://scan.devfridge.cool/api/sdk/check?wallet=${encodeURIComponent(wallet)}&mint=${encodeURIComponent(mint)}`,{signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(!response.ok){const retry=response.headers?.get('Retry-After');if(response.status===429)this.retryAt=Date.now()+Math.min(300000,Math.max(30000,Number(retry)*1000||0));throw Error(`Lock service unavailable (${response.status}). Retry later.`);}
   const data=await response.json();if(data.wallet!==wallet||data.mint!==mint||!Array.isArray(data.activeLocks)||!Number.isSafeInteger(data.ts)||data.ts>Math.floor(Date.now()/1000)+5||Date.now()/1000-data.ts>90)throw Error('Unavailable: stale or mismatched lock evidence.');
   this.failures=0;return data;
  }catch(error){this.failures++;this.retryAt=Math.max(this.retryAt,Date.now()+Math.min(60000,1000*2**this.failures));throw error;}
  finally{if(this.pending?.key===key)this.pending=null;}})();
  this.pending={key,promise};return promise;
 }
}
