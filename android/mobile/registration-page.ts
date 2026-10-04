// This bootstrap is bundled alongside the original TopShelf registration UI.
import {createNativeSigning} from './native-signing';
const summary=document.getElementById('summary')!,notice=document.getElementById('status')!;
const connectSolana=document.getElementById('connect') as HTMLButtonElement,retry=document.getElementById('retry') as HTMLButtonElement;
const container=document.getElementById('registration')!;
const id=location.hash.slice(1);
const nativeButton=document.getElementById('native-connect') as HTMLButtonElement;
const nativeUi=document.getElementById('native-signing')!;
let draft:any;
async function loadDraft(){
  retry.hidden=true;connectSolana.hidden=true;nativeButton.hidden=true;
  try{
    if(!/^[A-Za-z0-9_-]{43}$/.test(id))throw Error('Open this page using Register score in the Android game.');
    const response=await fetch('/api/world/topshelf/mobile',{headers:{Authorization:`Bearer ${id}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Could not retrieve this run.');
    draft=data;summary.textContent=`${draft.score.toLocaleString('en-US')} points · Season ${draft.season}. Completed and verified by the game server.`;
    notice.textContent=`Use the Solana wallet from this run: ${draft.wallet}. Registration expires ${new Date(draft.expires).toLocaleString()}.`;
    connectSolana.hidden=false;
    nativeButton.hidden=new URLSearchParams(location.search).get('native')!=='1';
    if(!nativeButton.hidden)notice.textContent=`Original Solana wallet: ${draft.wallet}. Use the game wallet to approve with Seed Vault / MWA, or connect the same account in Phantom. Never import your recovery phrase. Registration expires ${new Date(draft.expires).toLocaleString()}.`;
  }catch(error){notice.textContent=error instanceof Error?error.message:'Unable to retrieve your run.';retry.hidden=false;}
}
retry.onclick=()=>{void loadDraft();};
nativeButton.onclick=()=>{
  if(!draft||draft.expires<=Date.now()){notice.textContent='This run expired. Return to the game.';return;}
  const game={favourite:draft.character,seed:draft.seed,tick:draft.ticks,score:draft.score};
  const access=createNativeSigning(draft,id,nativeUi,request);
  tickets.set(game,Promise.resolve({...draft,final:{ticks:draft.ticks,score:draft.score,hash:draft.hash}}));
  container.replaceChildren();nativeUi.replaceChildren();mountScoreRegistration(container,game as any,access as any);
  notice.textContent='Choose your Robinhood wallet and payment token below. Solana approval will happen in the Android game using the original wallet.';
};
connectSolana.onclick=async()=>{
  connectSolana.disabled=true;
  try{
    const solana=(window as any).phantom?.solana;
    if(!solana)throw Error('Open this registration link inside the Phantom mobile browser.');
    await solana.connect();
    const valid=()=>solana.isConnected&&solana.publicKey?.toString()===draft.wallet;
    if(!valid())throw Error('Choose the same Solana account used to play this run, then reconnect.');
    const game={favourite:draft.character,seed:draft.seed,tick:draft.ticks,score:draft.score};
    const access={address:draft.wallet,valid,async signRegistration(message:Uint8Array){
      if(!valid())throw Error('Solana account changed. Reconnect the original account.');
      const result=await solana.signMessage(message,'utf8');
      if(!valid()||result.publicKey?.toString()!==draft.wallet||result.signature?.length!==64)throw Error('Solana signature account mismatch.');
      return result.signature;
    }};
    tickets.set(game,Promise.resolve({...draft,final:{ticks:draft.ticks,score:draft.score,hash:draft.hash}}));
    container.replaceChildren();mountScoreRegistration(container,game as any,access as any);
    notice.textContent='Solana account connected. Continue below to choose your Robinhood wallet and review the fee.';
    connectSolana.textContent='Reconnect Solana wallet';
  }catch(error){notice.textContent=error instanceof Error?error.message:'The wallet request was not completed.';}
  finally{connectSolana.disabled=false;}
};
void loadDraft();
