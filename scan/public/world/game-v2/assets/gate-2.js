const gate = document.getElementById("world-gate");
const app = document.getElementById("app");

function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

gate.innerHTML = `
  <div class="panel">
    <p class="tag">WORLD V2 / PLAYER PROTECTION</p>
    <h1>18+ only</h1>
    <p>Cold Storage v2 is for adults. Official scores are recorded on the server. There are no cash prizes, and this is not licensed Italian gambling.</p>
    <p>If play stops being fun, use <strong>Self-exclusion</strong> after you enter: it blocks this game on your wallet for the time you choose.</p>
    <label>Date of birth
      <div class="row">
        <input id="g-y" type="number" min="1900" max="${new Date().getFullYear()}" placeholder="YYYY" />
        <input id="g-m" type="number" min="1" max="12" placeholder="MM" />
        <input id="g-d" type="number" min="1" max="31" placeholder="DD" />
      </div>
    </label>
    <label><input id="g-ok" type="checkbox" /> I am 18 or older and I understand this is not licensed Italian gambling.</label>
    <p class="warn" id="g-err" hidden></p>
    <button class="go" id="g-enter" type="button">Enter World v2</button>
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
  btn.innerHTML = `<button type="button" id="g-self">Self-exclusion</button>`;
  document.body.appendChild(btn);
  document.getElementById("g-self").onclick = excludeFlow;
}

async function excludeFlow() {
  const option = window.prompt("Self-exclude for: 24h, 7d, 6m, or perm?", "24h");
  if (!option) return;
  const wallet = window.prompt("Solana wallet to exclude (the one you play with)");
  if (!wallet) return;
  const res = await fetch("/api/world/compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "exclude", wallet, option }),
  });
  const body = await res.json();
  if (!res.ok) {
    alert(body.error || "Could not set exclusion");
    return;
  }
  document.body.innerHTML = `<main id="world-blocked"><div><p class="tag">SELF-EXCLUDED</p><h1>Play is blocked</h1><p>Until ${new Date(body.exclusion.until).toISOString()}</p></div></main>`;
}

let already = {};
try {
  already = await status();
} catch {
  already = {};
}
if (already.exclusion) {
  document.body.innerHTML = `<main id="world-blocked"><div><p class="tag">SELF-EXCLUDED</p><h1>Play is blocked</h1><p>Until ${new Date(already.exclusion.until).toISOString()}</p></div></main>`;
} else if (already.adult || sessionStorage.getItem("world_v2_adult") === "1") {
  await loadGame();
} else {
  document.getElementById("g-enter").onclick = async () => {
    if (!document.getElementById("g-ok").checked) return fail("Confirm you are 18 or older.");
    const year = Number(document.getElementById("g-y").value);
    const month = Number(document.getElementById("g-m").value);
    const day = Number(document.getElementById("g-d").value);
    const cutoff = yearsAgo(18);
    const dob = new Date(year, month - 1, day);
    if (Number.isNaN(dob.getTime()) || dob > cutoff) return fail("You must be 18 or older.");
    const res = await fetch("/api/world/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adult", year, month, day }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 503) return fail(body.error || "Could not record age check.");
    if (res.status === 503) sessionStorage.setItem("world_v2_adult", "1");
    await loadGame();
  };
}
