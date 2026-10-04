// A bounded relay for the existing Solana score challenge. Never signs EVM transactions.
export function createNativeSigning(draft:any,id:string,ui:HTMLElement,callRegistration:(body:any)=>Promise<any>){
  const endpoint='/api/world/topshelf/mobile/signature',key='devfridge:mobile-sign:'+id;
  let cached:any;
  try{cached=JSON.parse(localStorage.getItem(key)||'null');if(cached?.expires<=Date.now()){localStorage.removeItem(key);cached=null;}}catch{}
  async function relay(body?:any,request?:string){
    const response=await fetch(endpoint+(request?'?request='+encodeURIComponent(request):''),{
      method:body?'POST':'GET',headers:{Authorization:`Bearer ${id}`,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Wallet authorization is unavailable. Retry without making a payment.');return data;
  }
  return {
    address:draft.wallet,
    valid:()=>Date.now()<draft.expires,
    async createChallenge(payload:any){
      const identity=JSON.stringify(payload);
      if(cached?.identity===identity&&cached.expires>Date.now()+20000)return cached.quote;
      const quote=await callRegistration(payload),prepared=await relay({action:'prepare',challenge:quote.challenge});
      if(prepared.runId!==draft.runId||!/^[A-Za-z0-9_-]{43}$/.test(prepared.request)||!Number.isFinite(prepared.expires))throw Error('Invalid wallet authorization request.');
      cached={identity,quote,request:prepared.request,expires:prepared.expires};
      // Phantom can reopen the URL in a new tab on return. Retain this expiring challenge across tabs.
      // No private key or wallet signature is stored. Changing wallet/token creates a new request.
      try{localStorage.setItem(key,JSON.stringify(cached));}catch{}
      return quote;
    },
    async signRegistration(message:Uint8Array,challenge:string){
      if(!cached||cached.quote.challenge!==challenge||cached.quote.message!==new TextDecoder().decode(message))throw Error('Wallet authorization changed. Verify the score again.');
      ui.replaceChildren();
      const explanation=document.createElement('p'),link=document.createElement('a'),cancel=document.createElement('button');
      explanation.textContent='Approve with the original Solana wallet in the Android game, then return here. Phantom only handles your Robinhood payment.';
      link.textContent='Open game · approve with Seed Vault / Solana wallet';
      link.href=`devfridgeworld://registration?run=${encodeURIComponent(draft.runId)}&request=${encodeURIComponent(cached.request)}`;
      link.className='primary-button';
      cancel.textContent='Cancel waiting';let cancelled=false;cancel.onclick=()=>{cancelled=true;};
      ui.append(explanation,link,cancel);
      ui.scrollIntoView({behavior:'smooth',block:'center'});
      try{
        while(!cancelled&&Date.now()<cached.expires){
          const result=await relay(undefined,cached.request);
          if(cancelled)throw Error('Signing cancelled. No payment was requested.');
          if(result.request!==cached.request||result.runId!==draft.runId||result.wallet!==draft.wallet||result.message!==cached.quote.message)throw Error('Wallet authorization does not match this score.');
          if(result.signature){
            const signature=Uint8Array.from(atob(result.signature),c=>c.charCodeAt(0));
            if(signature.length!==64)throw Error('Invalid Solana signature.');
            explanation.textContent='Original Solana wallet approved. Continue below to review the separate Robinhood payment.';
            return signature;
          }
          await new Promise(resolve=>setTimeout(resolve,4000));
        }
        throw Error(cancelled?'Signing cancelled. No payment was requested.':'Signing request expired. Click Verify score to request a new authorization.');
      }finally{link.remove();cancel.remove();}
    }
  };
}
