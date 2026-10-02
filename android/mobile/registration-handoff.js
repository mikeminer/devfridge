/* The game engine stays unchanged. Observe only successful live-score API replies. */
(() => {
  'use strict';
  if (!window.DevFridgeMobile || location.origin !== 'https://world.devfridge.cool') return;
  const key = 'devfridge:mobile:scores:v1', endpoint = '/api/world/topshelf/mobile';
  const originalFetch = window.fetch.bind(window), starts = new Map();
  let storageError = '', panel, list, busy = false;
  const read = () => { try { const value=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(value)?value.filter(d=>typeof d.ticket==='string'&&/^0x[0-9a-f]{64}$/i.test(d.runId)&&Number.isSafeInteger(d.score)&&Number.isSafeInteger(d.ticks)):[]; } catch { return []; } };
  const save = rows => { try { localStorage.setItem(key,JSON.stringify(rows));storageError=''; } catch { storageError='Device storage is full. Keep the game open and retry before switching apps.';throw Error(storageError); } };
  const update = draft => { const rows=read(),index=rows.findIndex(d=>d.runId===draft.runId); if(index<0)rows.push(draft);else rows[index]=draft;save(rows); };
  window.fetch = async function(input,init) {
    try {
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.origin===location.origin&&url.pathname==='/api/world/topshelf/register'&&init?.method?.toUpperCase()==='POST'&&JSON.parse(init.body).action==='start')
        document.getElementById('native-saved-score')?.setAttribute('hidden','');
    }catch { /* Requests unrelated to live-score JSON are untouched. */ }
    const response=await originalFetch(input,init);
    try {
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.origin===location.origin&&url.pathname==='/api/world/topshelf/register'&&init?.method?.toUpperCase()==='POST'&&response.ok&&typeof init.body==='string') {
        const body=JSON.parse(init.body);
        if(body.action==='start'||body.action==='finish') {
          const data=await response.clone().json();
          if(body.action==='start'&&data.liveVersion===2&&data.ticket&&data.runId){starts.set(data.ticket,{runId:data.runId,wallet:body.wallet,season:data.season});if(starts.size>20)starts.delete(starts.keys().next().value);}
          const started=starts.get(body.ticket);
          if(body.action==='finish'&&started&&data.final?.score===body.score&&data.final?.ticks===body.tick) {
            const prior=read().find(d=>d.runId===started.runId);
            update({...prior,...started,ticket:body.ticket,score:data.final.score,ticks:data.final.ticks,savedAt:Date.now()});renderBadge();
          }
        }
      }
    }catch { if(storageError)renderBadge(); } // Observation must never change the game's network result.
    return response;
  };
  async function api(path,options={}) {
    const response=await originalFetch(path,{...options,cache:'no-store',signal:AbortSignal.timeout(20000)});
    let data;try{data=await response.json();}catch{throw Error('Mobile registration is not available on the server yet. Your saved run stays on this device.');}
    if(!response.ok)throw Error(data.error||'Unable to reach score registration. Please retry.');return data;
  }
  async function check(draft) {
    const status=await api(endpoint+'?status=1&run='+encodeURIComponent(draft.runId));
    if(status.runId!==draft.runId||typeof status.registered!=='boolean')throw Error('Registration status does not match this run.');
    if(status.registered){draft.registered=true;update(draft);return true;}return false;
  }
  async function open(draft,status) {
    if(busy)return;busy=true;
    try {
      status.textContent='Checking your saved run…';
      if(draft.registered||await check(draft)){status.textContent='Score registered on Robinhood. No further payment is needed.';return;}
      if(draft.expires&&draft.expires<=Date.now())throw Error('This registration authorization expired. You can still check confirmation of an already submitted transaction.');
      if(!draft.id){
        const result=await api(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:draft.ticket,score:draft.score,ticks:draft.ticks})});
        if(!/^[A-Za-z0-9_-]{43}$/.test(result.id)||result.runId!==draft.runId||result.score!==draft.score)throw Error('Invalid registration handoff.');
        draft.id=result.id;draft.expires=result.expires;update(draft);
      }
      status.textContent='Continue in Phantom to choose your Robinhood wallet and fee. Use “game wallet” to approve with Seed Vault / your original Solana wallet, then return to Phantom for payment.';
      await window.DevFridgeMobile.openRegistration(draft.id);
    }catch(error){status.textContent=error.message||'Registration was not opened. Try again.';}
    finally{busy=false;}
  }
  function renderBadge(){
    if(!document.body)return;
    let badge=document.getElementById('native-saved-score');
    if(!badge){badge=document.createElement('button');badge.id='native-saved-score';badge.onclick=show;document.body.append(badge);}
    badge.hidden=!read().length&&!storageError;badge.textContent=storageError?'Score storage needs attention':'Saved scores · Register / check';
  }
  function show(){
    window.DevFridgeMobile.pause();
    if(!panel){panel=document.createElement('dialog');panel.className='native-score-dialog';const title=document.createElement('h2');title.textContent='Your verified scores';list=document.createElement('div');const close=document.createElement('button');close.textContent='Return to game';close.onclick=()=>panel.close();panel.append(title,list,close);document.body.append(panel);}
    list.replaceChildren();
    const rows=read().reverse();
    if(!rows.length){const text=document.createElement('p');text.textContent=storageError||'Finish a server-verified run to register a score.';list.append(text);}
    for(const draft of rows){
      const section=document.createElement('section'),title=document.createElement('h3'),status=document.createElement('p'),button=document.createElement('button'),refresh=document.createElement('button');
      title.textContent=`${draft.score.toLocaleString()} points · Season ${draft.season}`;status.setAttribute('role','status');
      status.textContent=draft.registered?'Confirmed on Robinhood Chain.':`Completed ${new Date(draft.savedAt).toLocaleString()}. Optional registration in Phantom.`;
      button.textContent='Continue registration in Phantom';button.hidden=!!draft.registered;button.onclick=()=>open(draft,status);
      refresh.textContent='Check confirmation';refresh.hidden=!draft.id||!!draft.registered;
      refresh.onclick=async()=>{try{status.textContent=await check(draft)?'Confirmed on Robinhood Chain. No further payment is needed.':'Not confirmed yet. Check the pending transaction in Phantom before retrying.';if(draft.registered){button.hidden=true;refresh.hidden=true;}}catch(error){status.textContent=error.message;}};
      section.append(title,status,button,refresh);list.append(section);
    }
    if(!panel.open)panel.showModal();
  }
  // Capture the existing optional-registration entry without modifying the engine bundle.
  document.addEventListener('click',event=>{if(event.target.closest?.('.score-registration-entry button')){event.preventDefault();event.stopImmediatePropagation();show();}},true);
  let signingDialog,signingBusy=false;
  async function receive(request,runId){
    if(signingBusy)return;
    const draft=read().find(d=>d.runId===runId&&d.id);
    if(!/^[A-Za-z0-9_-]{43}$/.test(request)||!draft){show();return;}
    window.DevFridgeMobile.pause();
    if(signingDialog?.open)signingDialog.close();
    signingDialog?.remove();
    signingDialog=document.createElement('dialog');signingDialog.className='native-score-dialog';
    const title=document.createElement('h2'),message=document.createElement('p'),details=document.createElement('pre'),approve=document.createElement('button'),back=document.createElement('button'),cancel=document.createElement('button');
    title.textContent='Approve your Solana wallet link';message.setAttribute('role','status');message.textContent='Retrieving the exact score authorization…';
    details.style.whiteSpace='pre-wrap';details.style.overflowWrap='anywhere';
    approve.textContent='Review and sign with original Solana wallet';approve.disabled=true;
    back.textContent='Return to Phantom · review payment';back.hidden=true;
    back.onclick=()=>window.DevFridgeMobile.openRegistration(draft.id);
    cancel.textContent='Close';cancel.onclick=()=>{if(!signingBusy)signingDialog.close();};
    signingDialog.addEventListener('cancel',e=>{if(signingBusy)e.preventDefault();});
    signingDialog.append(title,message,details,approve,back,cancel);document.body.append(signingDialog);signingDialog.showModal();
    const headers={Authorization:'Bearer '+draft.id};
    const fetchRequest=async()=>{
      const p=await api(endpoint+'/signature?request='+encodeURIComponent(request),{headers});
      if(p.request!==request||p.runId!==draft.runId||p.wallet!==draft.wallet||p.score!==draft.score||p.season!==draft.season||p.expires<=Date.now()||typeof p.message!=='string'||p.message.length>16384)throw Error('Authorization does not match your saved run, or has expired.');
      return p;
    };
    try{
      const pending=await fetchRequest();
      details.textContent=pending.message;
      if(pending.signature){message.textContent='This authorization is already signed. Return to Phantom for the separate payment.';approve.hidden=true;back.hidden=false;return;}
      message.textContent='This signature permanently authorizes the displayed wallet link for TopShelf. It transfers no tokens. Review the Robinhood address, score, token and fee below.';approve.disabled=false;
      approve.onclick=async()=>{
        if(signingBusy)return;signingBusy=true;approve.disabled=true;cancel.disabled=true;
        try{
          const fresh=await fetchRequest();if(fresh.message!==pending.message)throw Error('Authorization changed. Reopen the request.');
          const signature=await window.DevFridgeMobile.signRegistration(draft.wallet,pending.message);
          const result=await api(endpoint+'/signature',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'complete',request,signature})});
          if(!result.approved||result.request!==request||result.runId!==draft.runId)throw Error('Signature delivery was not confirmed. Retry without paying.');
          message.textContent='Solana authorization confirmed. Return to Phantom to review and sign the separate Robinhood payment.';
          approve.hidden=true;back.hidden=false;
        }catch(error){message.textContent=error.message||'Authorization was not completed. No payment was requested.';}
        finally{signingBusy=false;approve.disabled=false;cancel.disabled=false;}
      };
    }catch(error){message.textContent=error.message||'Could not load the authorization.';}
  }
  window.DevFridgeRegistration=Object.freeze({show,receive,async resume(){
    if(!panel?.open)return;
    for(const draft of read().filter(d=>d.id&&!d.registered)){try{await check(draft);}catch{/* A network failure is never treated as confirmation. */}}
    show();
  }});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void window.DevFridgeRegistration.resume();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderBadge,{once:true});else renderBadge();
})();
