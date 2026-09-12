import { assetUrl } from "./assets.js";
import "./style.css";

const root = document.getElementById("app");
root.innerHTML = `
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
`;

async function main() {
const base = import.meta.env.BASE_URL;
const [castDoc, economy] = await Promise.all([
  fetch(`${base}cast.json`).then((r) => r.json()),
  fetch(`${base}economy.json`).then((r) => r.json()),
]);
const cast = castDoc.cast;
document.getElementById("boot-load").hidden = true;
document.getElementById("access").hidden = false;
document.getElementById("again").onclick = () => location.reload();

let address = null;
let unlocked = new Set();

function paintChars() {
  const box = document.getElementById("chars");
  box.innerHTML = cast
    .map(
      (c) => `<button data-tier="${c.tier}" class="${unlocked.has(c.tier) ? "unlocked" : ""}">
        <img src="${assetUrl(c.webp)}" alt="${c.name}" width="64" height="64"/>
        <span>${c.name}</span>
      </button>`,
    )
    .join("");
  box.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => pick(Number(btn.dataset.tier));
  });
}
paintChars();

document.getElementById("connect").onclick = async () => {
  const btn = document.getElementById("connect");
  btn.disabled = true;
  try {
    const { connectWallet, unlockedTiers } = await import("./wallet.js");
    address = await connectWallet();
    document.getElementById("wallet-line").textContent = address.slice(0, 4) + "…" + address.slice(-4);
    unlocked = await unlockedTiers(address, cast);
    if (!unlocked.size) {
      document.getElementById("access-note").textContent =
        `No qualifying lock yet. Lock 500,000 of a cast mint at ${economy.timelockSource}`;
    }
    paintChars();
  } catch (err) {
    document.getElementById("access-note").textContent = err.message || String(err);
  } finally {
    btn.disabled = false;
  }
};

async function pick(tier) {
  if (!address) {
    document.getElementById("connect").click();
    return;
  }
  if (!unlocked.has(tier)) {
    document.getElementById("access-note").textContent = "That meme is locked. Fridge 500,000 of its mint first.";
    return;
  }
  document.getElementById("access").hidden = true;
  document.getElementById("boot-load").hidden = false;
  const { startGame } = await import("./game.js");
  document.getElementById("boot-load").hidden = true;
  await startGame({ root, cast, favourite: tier, address });
}
}

main().catch((err) => {
  document.getElementById("boot-load").hidden = true;
  document.getElementById("access").hidden = false;
  document.getElementById("access-note").textContent = err.message || String(err);
});
