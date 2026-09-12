const gate = document.getElementById("world-gate");
const app = document.getElementById("app");

const copy = {
  en: {
    tag: "WORLD V2 / PLAYER PROTECTION",
    title: "18+ only",
    body: "This game is for adults, free, with no cash prizes. Official scores are stored on the server.",
    stop: "If you want to stop, use <strong>Self-exclusion</strong> after you enter. It blocks this game on your wallet for the time you choose.",
    dob: "Date of birth",
    check: "I am 18 or older. I understand there are no cash prizes.",
    enter: "Enter World v2",
    confirm: "Confirm you are 18 or older.",
    age: "You must be 18 or older.",
    ageFail: "Could not record the age check.",
    exclude: "Self-exclusion",
    excludeFor: "Self-exclude for: 24h, 7d, 6m, or perm?",
    excludeWallet: "Solana wallet to exclude (the one you play with)",
    excludeFail: "Could not turn on self-exclusion",
    blockedTag: "SELF-EXCLUDED",
    blockedTitle: "Play is blocked",
    until: "Until",
  },
  it: {
    tag: "WORLD V2 / TUTELA",
    title: "Solo 18+",
    body: "Gioco per maggiorenni, gratis, senza premi in denaro. Il punteggio ufficiale sta sul server.",
    stop: "Se vuoi smettere, dopo l’ingresso usa <strong>Autoesclusione</strong>: blocca questo gioco sul tuo wallet per il tempo che scegli.",
    dob: "Data di nascita",
    check: "Ho almeno 18 anni. Capisco che non ci sono vincite in denaro.",
    enter: "Entra in World v2",
    confirm: "Conferma di avere almeno 18 anni.",
    age: "Devi avere almeno 18 anni.",
    ageFail: "Impossibile registrare il controllo età.",
    exclude: "Autoesclusione",
    excludeFor: "Autoesclusione per: 24h, 7d, 6m o perm?",
    excludeWallet: "Wallet Solana da escludere (quello con cui giochi)",
    excludeFail: "Impossibile attivare l'autoesclusione",
    blockedTag: "AUTOESCLUSIONE",
    blockedTitle: "Gioco bloccato",
    until: "Fino al",
  },
  es: {
    tag: "WORLD V2 / PROTECCIÓN",
    title: "Solo +18",
    body: "Juego para adultos, gratis, sin premios en dinero. La puntuación oficial se guarda en el servidor.",
    stop: "Si quieres parar, usa <strong>Autoexclusión</strong> después de entrar. Bloquea este juego en tu wallet el tiempo que elijas.",
    dob: "Fecha de nacimiento",
    check: "Tengo 18 años o más. Entiendo que no hay premios en dinero.",
    enter: "Entrar a World v2",
    confirm: "Confirma que tienes 18 años o más.",
    age: "Debes tener 18 años o más.",
    ageFail: "No se pudo registrar la edad.",
    exclude: "Autoexclusión",
    excludeFor: "Autoexcluirse durante: 24h, 7d, 6m o perm?",
    excludeWallet: "Wallet de Solana a excluir (con la que juegas)",
    excludeFail: "No se pudo activar la autoexclusión",
    blockedTag: "AUTOEXCLUIDO",
    blockedTitle: "Juego bloqueado",
    until: "Hasta",
  },
  fr: {
    tag: "WORLD V2 / PROTECTION",
    title: "18+ uniquement",
    body: "Jeu pour adultes, gratuit, sans lots en argent. Le score officiel est enregistré sur le serveur.",
    stop: "Pour arrêter, utilisez <strong>Auto-exclusion</strong> après l’entrée. Cela bloque ce jeu sur votre wallet pendant la durée choisie.",
    dob: "Date de naissance",
    check: "J’ai 18 ans ou plus. Je comprends qu’il n’y a pas de lots en argent.",
    enter: "Entrer dans World v2",
    confirm: "Confirmez que vous avez 18 ans ou plus.",
    age: "Vous devez avoir 18 ans ou plus.",
    ageFail: "Impossible d’enregistrer le contrôle d’âge.",
    exclude: "Auto-exclusion",
    excludeFor: "Auto-exclusion pendant : 24h, 7d, 6m ou perm ?",
    excludeWallet: "Wallet Solana à exclure (celui avec lequel vous jouez)",
    excludeFail: "Impossible d’activer l’auto-exclusion",
    blockedTag: "AUTO-EXCLU",
    blockedTitle: "Jeu bloqué",
    until: "Jusqu’au",
  },
  de: {
    tag: "WORLD V2 / SCHUTZ",
    title: "Nur 18+",
    body: "Spiel für Erwachsene, kostenlos, ohne Geldpreise. Offizielle Punkte liegen auf dem Server.",
    stop: "Zum Aufhören nach dem Eintritt <strong>Selbstausschluss</strong> nutzen. Das sperrt dieses Spiel auf deiner Wallet für die gewählte Zeit.",
    dob: "Geburtsdatum",
    check: "Ich bin 18 oder älter. Ich verstehe, dass es keine Geldpreise gibt.",
    enter: "World v2 betreten",
    confirm: "Bestätige, dass du 18 oder älter bist.",
    age: "Du musst 18 oder älter sein.",
    ageFail: "Altersprüfung konnte nicht gespeichert werden.",
    exclude: "Selbstausschluss",
    excludeFor: "Selbstausschluss für: 24h, 7d, 6m oder perm?",
    excludeWallet: "Solana-Wallet zum Ausschluss (die, mit der du spielst)",
    excludeFail: "Selbstausschluss konnte nicht aktiviert werden",
    blockedTag: "SELBSTAUSGESCHLOSSEN",
    blockedTitle: "Spiel gesperrt",
    until: "Bis",
  },
  pt: {
    tag: "WORLD V2 / PROTEÇÃO",
    title: "Apenas 18+",
    body: "Jogo para adultos, grátis, sem prêmios em dinheiro. A pontuação oficial fica no servidor.",
    stop: "Se quiser parar, use <strong>Autoexclusão</strong> depois de entrar. Isso bloqueia este jogo na sua wallet pelo tempo que escolher.",
    dob: "Data de nascimento",
    check: "Tenho 18 anos ou mais. Entendo que não há prêmios em dinheiro.",
    enter: "Entrar no World v2",
    confirm: "Confirme que tem 18 anos ou mais.",
    age: "É preciso ter 18 anos ou mais.",
    ageFail: "Não foi possível registrar a verificação de idade.",
    exclude: "Autoexclusão",
    excludeFor: "Autoexclusão por: 24h, 7d, 6m ou perm?",
    excludeWallet: "Wallet Solana a excluir (a que você usa para jogar)",
    excludeFail: "Não foi possível ativar a autoexclusão",
    blockedTag: "AUTOEXCLUÍDO",
    blockedTitle: "Jogo bloqueado",
    until: "Até",
  },
};

const lang = String(navigator.language || "en")
  .slice(0, 2)
  .toLowerCase();
const t = copy[lang] || copy.en;

function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

function blockedHtml(until) {
  return `<main id="world-blocked"><div><p class="tag">${t.blockedTag}</p><h1>${t.blockedTitle}</h1><p>${t.until} ${new Date(until).toISOString()}</p></div></main>`;
}

gate.innerHTML = `
  <div class="panel">
    <p class="tag">${t.tag}</p>
    <h1>${t.title}</h1>
    <p>${t.body}</p>
    <p>${t.stop}</p>
    <label>${t.dob}
      <div class="row">
        <input id="g-y" type="number" min="1900" max="${new Date().getFullYear()}" placeholder="YYYY" />
        <input id="g-m" type="number" min="1" max="12" placeholder="MM" />
        <input id="g-d" type="number" min="1" max="31" placeholder="DD" />
      </div>
    </label>
    <label><input id="g-ok" type="checkbox" /> ${t.check}</label>
    <p class="warn" id="g-err" hidden></p>
    <button class="go" id="g-enter" type="button">${t.enter}</button>
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
  const { MeshoptDecoder } = await import("/world/game-v2/vendor/meshopt_decoder.module.js");
  if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
  self.__dfMeshopt = MeshoptDecoder;
  await import("/world/game-v2/assets/cold-storage.js");
  const btn = document.createElement("div");
  btn.id = "world-exclude";
  btn.innerHTML = `<button type="button" id="g-self">${t.exclude}</button>`;
  document.body.appendChild(btn);
  document.getElementById("g-self").onclick = excludeFlow;
}

async function excludeFlow() {
  const option = window.prompt(t.excludeFor, "24h");
  if (!option) return;
  const wallet = window.prompt(t.excludeWallet);
  if (!wallet) return;
  const res = await fetch("/api/world/compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "exclude", wallet, option }),
  });
  const body = await res.json();
  if (!res.ok) {
    alert(body.error || t.excludeFail);
    return;
  }
  document.body.innerHTML = blockedHtml(body.exclusion.until);
}

let already = {};
try {
  already = await status();
} catch {
  already = {};
}
if (already.exclusion) {
  document.body.innerHTML = blockedHtml(already.exclusion.until);
} else if (already.adult || sessionStorage.getItem("world_v2_adult") === "1") {
  await loadGame();
} else {
  document.getElementById("g-enter").onclick = async () => {
    if (!document.getElementById("g-ok").checked) return fail(t.confirm);
    const year = Number(document.getElementById("g-y").value);
    const month = Number(document.getElementById("g-m").value);
    const day = Number(document.getElementById("g-d").value);
    const cutoff = yearsAgo(18);
    const dob = new Date(year, month - 1, day);
    if (Number.isNaN(dob.getTime()) || dob > cutoff) return fail(t.age);
    const res = await fetch("/api/world/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adult", year, month, day }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 503) return fail(body.error || t.ageFail);
    if (res.status === 503) sessionStorage.setItem("world_v2_adult", "1");
    await loadGame();
  };
}
