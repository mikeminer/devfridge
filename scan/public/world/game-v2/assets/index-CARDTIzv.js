const L=function(){const e=typeof document<"u"&&document.createElement("link").relList;return e&&e.supports&&e.supports("modulepreload")?"modulepreload":"preload"}(),P=function(t){return"/world/game-v2/"+t},b={},w=function(e,a,c){let i=Promise.resolve();if(a&&a.length>0){document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),l=n?.nonce||n?.getAttribute("nonce");i=Promise.allSettled(a.map(o=>{if(o=P(o),o in b)return;b[o]=!0;const s=o.endsWith(".css"),m=s?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${m}`))return;const d=document.createElement("link");if(d.rel=s?"stylesheet":L,s||(d.as="script"),d.crossOrigin="",d.href=o,l&&d.setAttribute("nonce",l),document.head.appendChild(d),s)return new Promise((g,B)=>{d.addEventListener("load",g),d.addEventListener("error",()=>B(new Error(`Unable to preload CSS for ${o}`)))})}))}function r(n){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=n,window.dispatchEvent(l),!l.defaultPrevented)throw n}return i.then(n=>{for(const l of n||[])l.status==="rejected"&&r(l.reason);return e().catch(r)})},I=8,y=[];let h=0;function E(){for(;h<I&&y.length;){const t=y.shift();h++,t().finally(()=>{h--,E()})}}function k(t){return new Promise((e,a)=>{y.push(()=>Promise.resolve().then(t).then(e,a)),E()})}const f=new Map,v=new Map,u=new Map;function p(t){return`${"/world/game-v2/".replace(/\/$/,"")}/${String(t).replace(/^\//,"")}`}function R(t,e){if(f.has(e))return Promise.resolve(f.get(e));if(u.has(e))return u.get(e);const a=k(()=>new Promise((c,i)=>{const r=new t.TextureLoader;r.setCrossOrigin("anonymous"),r.load(e,n=>{n.colorSpace=t.SRGBColorSpace,n.anisotropy=1,f.set(e,n),c(n)},void 0,i)}));return u.set(e,a),a.finally(()=>u.delete(e))}async function C(t,e,a,c){if(v.has(c))return v.get(c);if(u.has(c))return u.get(c);const i=k(async()=>{const r=new e,n=new a;n.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/"),n.setDecoderConfig({type:"js"}),r.setDRACOLoader(n);const l=await r.loadAsync(c);return v.set(c,l),l});return u.set(c,i),i.finally(()=>u.delete(c))}function D(t,e){return Promise.all(e.map(a=>R(t,p(a.webp||a.png)).catch(()=>null)))}async function $(t,e,a,c){const i=a[c-1];if(!i)return null;try{return await C(t,e.GLTFLoader,e.DRACOLoader,p(i.glb))}catch{return null}}function O(t,e,a,c){const i=a.filter(n=>n.tier!==c);(window.requestIdleCallback||(n=>setTimeout(n,1200)))(()=>{i.forEach(n=>{C(t,e.GLTFLoader,e.DRACOLoader,p(n.glb)).catch(()=>{})})})}const S=document.getElementById("app");S.innerHTML=`
  <header class="header">
    <a class="brand" href="https://world.devfridge.cool/"><b>DF</b> World <span class="v2-tag">V2</span></a>
    <span class="muted">Cold Storage · faster build · v1 untouched</span>
  </header>
  <div class="layout">
    <aside class="left-panel">
      <p class="v2-tag">PASTA / WORLD</p>
      <h1>Cold Storage <span>v2</span></h1>
      <p class="muted">One GLB, billboard pieces, split bundles. Same 500,000-token lock to play.</p>
      <p class="muted" id="wallet-line">Connect a Solana wallet to unlock a meme.</p>
      <button class="primary" id="connect">Connect wallet</button>
    </aside>
    <section class="game-panel">
      <div class="scoreboard">
        <div><span class="v2-tag">SCORE</span><strong id="score">0</strong></div>
        <div><span class="v2-tag">BEST</span><strong id="best">0</strong></div>
        <div id="next-label" class="muted">NEXT <img id="next-img" alt="" width="30" height="30"/></div>
      </div>
      <div class="stage">
        <canvas id="stage-canvas"></canvas>
        <div class="toast" id="toast"></div>
        <div class="loading" id="boot-load"><strong>Loading v2…</strong><span>portraits first, models later</span></div>
        <div class="access" id="access" hidden>
          <div>
            <p class="v2-tag">UNLOCKED MEMES</p>
            <h2>Pick your drop</h2>
            <div class="char-grid" id="chars"></div>
            <p class="muted" id="access-note">Need 500,000 of that mint locked in DevFridge.</p>
          </div>
        </div>
        <div class="pause-overlay" id="pause-overlay" hidden>
          <strong>PAUSED</strong>
          <button class="primary" id="resume">Resume</button>
        </div>
      </div>
      <div class="game-controls">
        <button class="drop-button" id="drop">DROP</button>
        <button id="pause">Pause</button>
      </div>
    </section>
    <aside class="right-panel">
      <div class="collection-progress"><strong id="collection-count">0<span> / 10</span></strong></div>
      <div class="collection-track"><i id="collection-bar"></i></div>
      <div class="collection" id="collection"></div>
    </aside>
  </div>
  <dialog id="result">
    <h2 id="result-title"></h2>
    <p id="result-score"></p>
    <button class="primary" id="again">Play again</button>
  </dialog>
`;async function T(){const t="/world/game-v2/",[e,a]=await Promise.all([fetch(`${t}cast.json`).then(o=>o.json()),fetch(`${t}economy.json`).then(o=>o.json())]),c=e.cast;document.getElementById("boot-load").hidden=!0,document.getElementById("access").hidden=!1,document.getElementById("again").onclick=()=>location.reload();let i=null,r=new Set;function n(){const o=document.getElementById("chars");o.innerHTML=c.map(s=>`<button data-tier="${s.tier}" class="${r.has(s.tier)?"unlocked":""}">
        <img src="${p(s.webp)}" alt="${s.name}" width="64" height="64"/>
        <span>${s.name}</span>
      </button>`).join(""),o.querySelectorAll("button").forEach(s=>{s.onclick=()=>l(Number(s.dataset.tier))})}n(),document.getElementById("connect").onclick=async()=>{const o=document.getElementById("connect");o.disabled=!0;try{const{connectWallet:s,unlockedTiers:m}=await w(async()=>{const{connectWallet:d,unlockedTiers:g}=await import("./wallet-CSpsNaOR.js");return{connectWallet:d,unlockedTiers:g}},[]);i=await s(),document.getElementById("wallet-line").textContent=i.slice(0,4)+"…"+i.slice(-4),r=await m(i,c),r.size||(document.getElementById("access-note").textContent=`No qualifying lock yet. Lock 500,000 of a cast mint at ${a.timelockSource}`),n()}catch(s){document.getElementById("access-note").textContent=s.message||String(s)}finally{o.disabled=!1}};async function l(o){if(!i){document.getElementById("connect").click();return}if(!r.has(o)){document.getElementById("access-note").textContent="That meme is locked. Fridge 500,000 of its mint first.";return}document.getElementById("access").hidden=!0,document.getElementById("boot-load").hidden=!1;const{startGame:s}=await w(async()=>{const{startGame:m}=await import("./game-j5nyZYGL.js");return{startGame:m}},[]);document.getElementById("boot-load").hidden=!0,await s({root:S,cast:c,favourite:o,address:i})}}T().catch(t=>{document.getElementById("boot-load").hidden=!0,document.getElementById("access").hidden=!1,document.getElementById("access-note").textContent=t.message||String(t)});export{w as _,p as a,$ as b,O as c,k as e,R as l,D as p};
