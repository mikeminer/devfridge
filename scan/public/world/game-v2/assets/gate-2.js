const gate = document.getElementById("world-gate");
const app = document.getElementById("app");

function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

gate.innerHTML = `
  <div class="panel">
    <p class="tag">WORLD V2 / TUTELA</p>
    <h1>Solo 18+</h1>
    <p>Gioco per maggiorenni, gratis, senza premi in denaro. Il punteggio ufficiale sta sul server.</p>
    <p>Se vuoi smettere, dopo l’ingresso usa <strong>Autoesclusione</strong>: blocca questo gioco sul tuo wallet per il tempo che scegli.</p>
    <label>Data di nascita
      <div class="row">
        <input id="g-y" type="number" min="1900" max="${new Date().getFullYear()}" placeholder="YYYY" />
        <input id="g-m" type="number" min="1" max="12" placeholder="MM" />
        <input id="g-d" type="number" min="1" max="31" placeholder="DD" />
      </div>
    </label>
    <label><input id="g-ok" type="checkbox" /> Ho almeno 18 anni. Capisco che non ci sono vincite in denaro.</label>
    <p class="warn" id="g-err" hidden></p>
    <button class="go" id="g-enter" type="button">Entra in World v2</button>
  </div>
`;

const err = document.getElementById("g-err");
function fail(msg) {
  err.hidden = false;
  err.textContent = msg;
}

async function status(wallet) {
  const q = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
  const res = await fetch(`/api/world/compliance${q}`, { cache: "no-store" });
  return res.json();
}

async function loadGame() {
  gate.hidden = true;
  app.hidden = false;
  await import("/world/game-v2/assets/cold-storage.js");
  const btn = document.createElement("div");
  btn.id = "world-exclude";
  btn.innerHTML = `<button type="button" id="g-self">Autoesclusione</button>`;
  document.body.appendChild(btn);
  document.getElementById("g-self").onclick = excludeFlow;
}

async function excludeFlow() {
  const option = window.prompt("Autoesclusione per: 24h, 7d, 6m o perm?", "24h");
  if (!option) return;
  const wallet = window.prompt("Wallet Solana da escludere (quello con cui giochi)");
  if (!wallet) return;
  const res = await fetch("/api/world/compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "exclude", wallet, option }),
  });
  const body = await res.json();
  if (!res.ok) {
    alert(body.error || "Impossibile attivare l'autoesclusione");
    return;
  }
  document.body.innerHTML = `<main id="world-blocked"><div><p class="tag">AUTOESCLUSIONE</p><h1>Gioco bloccato</h1><p>Fino al ${new Date(body.exclusion.until).toISOString()}</p></div></main>`;
}

let already = {};
try {
  already = await status();
} catch {
  already = {};
}
if (already.exclusion) {
  document.body.innerHTML = `<main id="world-blocked"><div><p class="tag">AUTOESCLUSIONE</p><h1>Gioco bloccato</h1><p>Fino al ${new Date(already.exclusion.until).toISOString()}</p></div></main>`;
} else if (already.adult || sessionStorage.getItem("world_v2_adult") === "1") {
  await loadGame();
} else {
  document.getElementById("g-enter").onclick = async () => {
    if (!document.getElementById("g-ok").checked) return fail("Conferma di avere almeno 18 anni.");
    const year = Number(document.getElementById("g-y").value);
    const month = Number(document.getElementById("g-m").value);
    const day = Number(document.getElementById("g-d").value);
    const cutoff = yearsAgo(18);
    const dob = new Date(year, month - 1, day);
    if (Number.isNaN(dob.getTime()) || dob > cutoff) return fail("Devi avere almeno 18 anni.");
    const res = await fetch("/api/world/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adult", year, month, day }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 503) return fail(body.error || "Impossibile registrare il controllo età.");
    if (res.status === 503) sessionStorage.setItem("world_v2_adult", "1");
    await loadGame();
  };
}
