// V2-only progressive enhancement; the existing game engine owns mode and wallet access.
function amount(token) {
  const digits=token.balance.padStart(token.decimals+1,'0');
  const whole=token.decimals?digits.slice(0,-token.decimals):digits;
  const fraction=token.decimals?digits.slice(-token.decimals).replace(/0+$/,'').slice(0,4):'';
  return BigInt(whole).toLocaleString('en-US')+(fraction?'.'+fraction:'');
}
async function openTopShelf(button) {
  const dialog=document.querySelector('#dialog'),content=document.querySelector('#dialog-content');
  if(!dialog||!content)return;
  content.innerHTML='<span class="eyebrow">TOPSHELF / ROBINHOOD CHAIN</span><h2>The four season reward jars.</h2><p>The four jars with the highest estimated value form the current seasonal reward shelf.</p><strong id="v2-season">CURRENT SEASON</strong><div class="v2-season-jars" aria-live="polite">Loading the four jars…</div><p>Final seasonal distribution follows the published TopShelf rules and verified leaderboard results.</p><a class="primary-button" href="https://world.devfridge.cool/leaderboard" target="_blank" rel="noopener noreferrer">Open TopShelf leaderboard ↗</a><button class="secondary-button" id="v2-season-back">Back to Kitchen</button>';
  if(!dialog.open)dialog.showModal();
  content.querySelector('#v2-season-back').onclick=()=>{dialog.close();button.focus();};
  const jars=content.querySelector('.v2-season-jars'),season=content.querySelector('#v2-season');
  try{
    const responses=await Promise.all(['/api/world/topshelf','/api/world/topshelf/prices'].map(url=>fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)})));
    if(responses.some(response=>!response.ok))throw Error('Unavailable');
    const [pool,quotes]=await Promise.all(responses.map(response=>response.json()));
    if(!pool.configured||!Array.isArray(pool.tokens)||!quotes.prices)throw Error('Unavailable');
    const tokens=pool.tokens.map(token=>{
      if(!/^0x[0-9a-fA-F]{40}$/.test(token.address)||typeof token.symbol!=='string'||!/^\d{1,78}$/.test(token.balance)||!Number.isInteger(token.decimals)||token.decimals<0||token.decimals>255)throw Error('Invalid token');
      const price=quotes.prices[token.address.toLowerCase()];
      const value=BigInt(token.balance)===0n?0:typeof price==='number'&&price>0?Number(`${token.balance}e-${token.decimals}`)*price:null;
      return {...token,value:value!==null&&Number.isFinite(value)?value:null};
    }).sort((a,b)=>a.value===null&&b.value!==null?1:b.value===null&&a.value!==null?-1:(b.value??0)-(a.value??0)||a.address.toLowerCase().localeCompare(b.address.toLowerCase())).slice(0,4);
    if(!jars.isConnected)return;
    season.textContent=`SEASON ${pool.currentSeason??pool.season??'—'}`;
    jars.replaceChildren();
    if(!tokens.length){jars.textContent='The seasonal reward jars are waiting for deposits.';return;}
    for(const [index,token] of tokens.entries()){
      const card=document.createElement('article');card.className='v2-season-jar';
      const image=document.createElement('img');image.src=`/api/world/topshelf/logo?token=${encodeURIComponent(token.address)}`;image.alt=token.symbol;
      const copy=document.createElement('div');
      for(const [tag,text] of [['small',`JAR #${index+1} · SEASON REWARD`],['strong',token.symbol],['b',`${amount(token)} ${token.symbol}`],['small',token.value===null?'Valuation updating':`${token.value.toLocaleString('en-US',{style:'currency',currency:'USD'})} estimated jar value`],['code',token.address]]){const node=document.createElement(tag);node.textContent=text;copy.append(node);}
      card.append(image,copy);jars.append(card);
    }
  }catch{if(jars.isConnected)jars.textContent='TopShelf data is temporarily unavailable. Close this panel and try again.';}
}
let modeObserver;
function install(){
  const leaderboard=document.querySelector('#kitchen-leaderboard');
  if(!leaderboard||document.querySelector('#v2-topshelf-button'))return;
  const actions=document.createElement('div');actions.className='v2-season-actions';leaderboard.before(actions);actions.append(leaderboard);
  const button=document.createElement('button');button.id='v2-topshelf-button';button.type='button';button.className='kitchen-leaderboard';button.textContent='🫙 TopShelf';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label','Open the four season reward jars');button.hidden=leaderboard.hidden;button.onclick=()=>void openTopShelf(button);actions.append(button);
  modeObserver?.disconnect();modeObserver=new MutationObserver(()=>{button.hidden=leaderboard.hidden;});modeObserver.observe(leaderboard,{attributes:true,attributeFilter:['hidden']});
}
const observer=new MutationObserver(install);observer.observe(document.querySelector('#app')??document.body,{childList:true,subtree:true});install();
window.addEventListener('pagehide',()=>{observer.disconnect();modeObserver?.disconnect();},{once:true});
