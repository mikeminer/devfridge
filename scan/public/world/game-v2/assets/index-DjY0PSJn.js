const I=function(){const e=typeof document<"u"&&document.createElement("link").relList;return e&&e.supports&&e.supports("modulepreload")?"modulepreload":"preload"}(),P=function(t){return"/world/game-v2/"+t},E={},w=function(e,o,s){let a=Promise.resolve();if(o&&o.length>0){document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),r=n?.nonce||n?.getAttribute("nonce");a=Promise.allSettled(o.map(u=>{if(u=P(u),u in E)return;E[u]=!0;const c=u.endsWith(".css"),i=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${i}`))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":I,c||(d.as="script"),d.crossOrigin="",d.href=u,r&&d.setAttribute("nonce",r),document.head.appendChild(d),c)return new Promise((p,h)=>{d.addEventListener("load",p),d.addEventListener("error",()=>h(new Error(`Unable to preload CSS for ${u}`)))})}))}function l(n){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=n,window.dispatchEvent(r),!r.defaultPrevented)throw n}return a.then(n=>{for(const r of n||[])r.status==="rejected"&&l(r.reason);return e().catch(l)})},L=8,b=[];let y=0;function C(){for(;y<L&&b.length;){const t=b.shift();y++,t().finally(()=>{y--,C()})}}function S(t){return new Promise((e,o)=>{b.push(()=>Promise.resolve().then(t).then(e,o)),C()})}const f=new Map,v=new Map,m=new Map;function g(t){return`${"/world/game-v2/".replace(/\/$/,"")}/${String(t).replace(/^\//,"")}`}function R(t,e){if(f.has(e))return Promise.resolve(f.get(e));if(m.has(e))return m.get(e);const o=S(()=>new Promise((s,a)=>{const l=new t.TextureLoader;l.setCrossOrigin("anonymous"),l.load(e,n=>{n.colorSpace=t.SRGBColorSpace,n.anisotropy=1,f.set(e,n),s(n)},void 0,a)}));return m.set(e,o),o.finally(()=>m.delete(e))}async function B(t,e,o,s){if(v.has(s))return v.get(s);if(m.has(s))return m.get(s);const a=S(async()=>{const l=new e,n=new o;n.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/"),n.setDecoderConfig({type:"js"}),l.setDRACOLoader(n);const r=await l.loadAsync(s);return v.set(s,r),r});return m.set(s,a),a.finally(()=>m.delete(s))}function D(t,e){return Promise.all(e.map(o=>R(t,g(o.webp||o.png)).catch(()=>null)))}async function $(t,e,o,s){const a=o[s-1];if(!a)return null;try{return await B(t,e.GLTFLoader,e.DRACOLoader,g(a.glb))}catch{return null}}function O(t,e,o,s){const a=o.filter(n=>n.tier!==s);(window.requestIdleCallback||(n=>setTimeout(n,1200)))(()=>{a.forEach(n=>{B(t,e.GLTFLoader,e.DRACOLoader,g(n.glb)).catch(()=>{})})})}const k=document.getElementById("app");k.innerHTML=`
  <header class="header">
    <a class="brand" href="https://world.devfridge.cool/"><b>DF</b> World <span class="v2-tag">V2</span></a>
    <span class="muted">Cold Storage · faster build · v1 untouched</span>
  </header>
  <div class="layout">
    <aside class="left-panel">
      <p class="v2-tag">PASTA / WORLD</p>
      <h1>Cold Storage <span>v2</span></h1>
      <p class="muted">One GLB, billboard pieces, split bundles. Same 500,000-token lock to play.</p>
      <p class="muted" id="wallet-line">Connect a Solana wallet to unlock a meme, or practice without a lock.</p>
      <button class="primary" id="connect">Connect wallet</button>
      <button class="ghost" id="practice" type="button">Play practice</button>
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
            <p class="muted" id="access-note">Need 500,000 of that mint locked in DevFridge, or use practice.</p>
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
`;async function T(){const t="/world/game-v2/",[e,o]=await Promise.all([fetch(`${t}cast.json`).then(c=>c.json()),fetch(`${t}economy.json`).then(c=>c.json())]),s=e.cast;document.getElementById("boot-load").hidden=!0,document.getElementById("access").hidden=!1,document.getElementById("again").onclick=()=>location.reload();let a=null,l=new Set;function n(){const c=document.getElementById("chars");c.innerHTML=s.map(i=>`<button data-tier="${i.tier}" class="${l.has(i.tier)?"unlocked":""}">
        <img src="${g(i.webp)}" alt="${i.name}" width="64" height="64"/>
        <span>${i.name}</span>
      </button>`).join(""),c.querySelectorAll("button").forEach(i=>{i.onclick=()=>u(Number(i.dataset.tier))})}n();async function r(c,i){document.getElementById("access").hidden=!0,document.getElementById("boot-load").hidden=!1,document.getElementById("boot-load").querySelector("strong").textContent="Starting fridge…";try{const{startGame:d}=await w(async()=>{const{startGame:p}=await import("./game-CZwdgNJn.js");return{startGame:p}},[]);document.getElementById("boot-load").hidden=!0,await d({root:k,cast:s,favourite:c,address:i})}catch(d){document.getElementById("boot-load").hidden=!0,document.getElementById("access").hidden=!1,document.getElementById("access-note").textContent=d.message||String(d)}}document.getElementById("practice").onclick=()=>r(1,"practice"),document.getElementById("connect").onclick=async()=>{const c=document.getElementById("connect");c.disabled=!0;try{const{connectWallet:i,unlockedTiers:d}=await w(async()=>{const{connectWallet:p,unlockedTiers:h}=await import("./wallet-CSpsNaOR.js");return{connectWallet:p,unlockedTiers:h}},[]);a=await i(),document.getElementById("wallet-line").textContent=a.slice(0,4)+"…"+a.slice(-4),l=await d(a,s),l.size||(document.getElementById("access-note").textContent=`No qualifying lock yet. Lock 500,000 of a cast mint at ${o.timelockSource}`),n()}catch(i){document.getElementById("access-note").textContent=i.message||String(i)}finally{c.disabled=!1}};async function u(c){if(!a){document.getElementById("access-note").textContent="Connect a wallet, or hit Play practice.";return}if(!l.has(c)){document.getElementById("access-note").textContent="That meme is locked. Fridge 500,000 of its mint, or play practice.";return}await r(c,a)}}T().catch(t=>{document.getElementById("boot-load").hidden=!0,document.getElementById("access").hidden=!1,document.getElementById("access-note").textContent=t.message||String(t)});export{w as _,g as a,$ as b,O as c,S as e,R as l,D as p};
