import {GAME} from './config';
import {LockReader,fixtureGate} from './access.mjs';
import {evaluateTimelocks,toRawAmount} from './timelock-gate.mjs';
type Key={toString:()=>string};
type Provider={isPhantom?:boolean;connect:()=>Promise<{publicKey:Key}>;disconnect:()=>Promise<void>;on:(event:string,fn:(key?:Key)=>void)=>void;removeListener?:(event:string,fn:unknown)=>void};
declare global{interface Window{phantom?:{solana?:Provider}}}
export function setupWallet(onRevoke:()=>void){
 const el=(id:string)=>document.getElementById(id)!;
 const reader=new LockReader();let wallet='',generation=0,provider:Provider|undefined,eligible=false,timer:ReturnType<typeof setTimeout>|undefined;
 const challenge=el('challenge') as HTMLButtonElement;
 function clear(){generation++;eligible=false;clearTimeout(timer);challenge.disabled=true;challenge.textContent='Night Shift challenge · locked';el('gate-status').textContent='Not checked';}
 function revoke(){clear();onRevoke();}
 function setWallet(key?:Key){revoke();wallet=key?.toString()??'';el('wallet-status').textContent=wallet?wallet.slice(0,6)+'…'+wallet.slice(-6):'Not connected';el('wallet-status').title=wallet;el('disconnect').hidden=!wallet;(el('recheck') as HTMLButtonElement).disabled=!wallet;el('wallet-message').textContent=wallet?'Connected address only. No authentication or signatures requested.':'Wallet disconnected. Previous eligibility cleared.';if(wallet)void check();}
 function disconnected(){setWallet();}
 function bind(p:Provider){if(provider===p)return;provider?.removeListener?.('accountChanged',setWallet);provider?.removeListener?.('disconnect',disconnected);provider=p;p.on('accountChanged',setWallet);p.on('disconnect',disconnected);}
 async function check(){
  if(!wallet)return;clear();const epoch=generation,address=wallet;el('gate-status').textContent='Checking…';
  try{
   const evidence=await reader.read(address,GAME.mint);if(epoch!==generation||wallet!==address)return;
   const policy=GAME.policy;
   const result=evaluateTimelocks(evidence,{wallet:address,mint:GAME.mint,minimumRaw:toRawAmount(policy.minimumTokens,GAME.decimals),minOriginalSeconds:policy.minOriginalSeconds,minRemainingSeconds:policy.minRemainingSeconds,aggregation:policy.aggregation,maxAgeSeconds:90});
   eligible=result.eligible;challenge.disabled=!eligible;challenge.textContent=eligible?'Play Night Shift challenge ↗':'Night Shift challenge · locked';el('gate-status').textContent=eligible?'Eligible · client check':'Does not qualify';
   el('wallet-message').textContent='Fresh API evidence is interface feedback only. No authenticated session or verified score is created.';
   timer=setTimeout(()=>{revoke();void check();},Math.max(1000,Math.min(60000,result.nextCheckAt*1000-Date.now())));
  }catch(error){if(epoch!==generation)return;eligible=false;challenge.disabled=true;el('gate-status').textContent='Unavailable · retry';el('wallet-message').textContent=error instanceof Error?error.message:'Lock lookup failed';onRevoke();}
 }
 el('connect').onclick=async()=>{const button=el('connect') as HTMLButtonElement;button.disabled=true;try{const p=window.phantom?.solana;if(!p?.isPhantom)throw Error(location.protocol==='https:'?'Phantom not detected. Open this HTTPS game in the Phantom mobile browser or install its desktop extension.':'Phantom not detected. Desktop practice works here; mobile Phantom requires a public HTTPS URL.');bind(p);const epoch=generation;const result=await p.connect();if(epoch===generation)setWallet(result.publicKey);}catch(e){revoke();el('wallet-message').textContent=e instanceof Error?e.message:'Wallet connection cancelled. Practice remains available.';}finally{button.disabled=false;}};
 el('disconnect').onclick=async()=>{setWallet();try{await provider?.disconnect();}catch{el('wallet-message').textContent='Access cleared locally. Wallet disconnect was unavailable.';}};
 el('recheck').onclick=()=>void check();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){revoke();}else if(wallet)void check();});window.addEventListener('pageshow',()=>{if(wallet)void check();});
 if(location.protocol==='https:'){const link=el('phantom-link') as HTMLAnchorElement;link.href=`https://phantom.app/ul/browse/${encodeURIComponent(location.origin+location.pathname)}?ref=${encodeURIComponent(location.origin)}`;link.hidden=false;}
 document.querySelectorAll<HTMLButtonElement>('[data-fixture]').forEach(button=>button.onclick=()=>{try{const result=fixtureGate(button.dataset.fixture);el('fixture-result').textContent=`SIMULATION · ${result.eligible?'Qualifies':'Denied'}. Example evidence only; no live access granted.`;}catch{el('fixture-result').textContent='SIMULATION · Unavailable: stale evidence. Access denied; retry needed.';}});
 return{canChallenge:()=>eligible};
}
