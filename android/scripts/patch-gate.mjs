// Keep the upstream engine intact; adapt Android onboarding copy and network UX.
export function patchGateForAndroid(source) {
  function replaceOnce(before, after) {
    if (source.split(before).length !== 2) throw new Error('The upstream age gate changed; review the Android patch.');
    source = source.replace(before, after);
  }
  const disclosures = [
    ['This game is for adults, free, with no cash prizes. Official scores are stored on the server.', 'For adults 18+. Character access requires an active token timelock. TopShelf score registration is optional and paid; entry fees fund seasonal token prizes. See Menu → TopShelf rules for owner controls and claim conditions.'],
    ['I am 18 or older. I understand there are no cash prizes.', 'I am 18 or older. I understand that optional TopShelf registration costs tokens and rewards are not guaranteed.'],
    ['Gioco per maggiorenni, gratis, senza premi in denaro. Il punteggio ufficiale sta sul server.', 'Solo maggiorenni. L’accesso ai personaggi richiede token in timelock. La registrazione TopShelf è facoltativa e a pagamento; le quote finanziano premi stagionali in token. Menu → Regole TopShelf spiega poteri dell’owner e condizioni dei claim.'],
    ['Ho almeno 18 anni. Capisco che non ci sono vincite in denaro.', 'Ho almeno 18 anni. Comprendo che la registrazione facoltativa TopShelf costa token e i premi non sono garantiti.'],
    ['Juego para adultos, gratis, sin premios en dinero. La puntuación oficial se guarda en el servidor.', 'Solo mayores de 18 años. El acceso requiere tokens bloqueados. Registrar una puntuación en TopShelf es opcional y de pago; las cuotas financian premios de temporada en tokens. Consulta las reglas de TopShelf en el menú.'],
    ['Tengo 18 años o más. Entiendo que no hay premios en dinero.', 'Tengo 18 años o más. Entiendo que registrar en TopShelf cuesta tokens y los premios no están garantizados.'],
    ['Jeu pour adultes, gratuit, sans lots en argent. Le score officiel est enregistré sur le serveur.', 'Réservé aux adultes. L’accès exige des tokens verrouillés. L’inscription d’un score à TopShelf est facultative et payante ; les frais financent des récompenses saisonnières en tokens. Consultez les règles TopShelf dans le menu.'],
    ['J’ai 18 ans ou plus. Je comprends qu’il n’y a pas de lots en argent.', 'J’ai 18 ans ou plus. Je comprends que l’inscription TopShelf coûte des tokens et que les récompenses ne sont pas garanties.'],
    ['Spiel für Erwachsene, kostenlos, ohne Geldpreise. Offizielle Punkte liegen auf dem Server.', 'Ab 18 Jahren. Der Zugang erfordert gesperrte Tokens. Die TopShelf-Registrierung ist freiwillig und kostenpflichtig; Gebühren finanzieren saisonale Token-Preise. Die TopShelf-Regeln stehen im Menü.'],
    ['Ich bin 18 oder älter. Ich verstehe, dass es keine Geldpreise gibt.', 'Ich bin mindestens 18 Jahre alt. Ich verstehe, dass die TopShelf-Registrierung Tokens kostet und Preise nicht garantiert sind.'],
    ['Jogo para adultos, grátis, sem prêmios em dinheiro. A pontuação oficial fica no servidor.', 'Apenas maiores de 18 anos. O acesso exige tokens bloqueados. Registrar uma pontuação no TopShelf é opcional e pago; as taxas financiam prêmios sazonais em tokens. Consulte as regras do TopShelf no menu.'],
    ['Tenho 18 anos ou mais. Entendo que não há prêmios em dinheiro.', 'Tenho 18 anos ou mais. Entendo que o registro no TopShelf custa tokens e os prêmios não são garantidos.'],
  ];
  for (const [before, after] of disclosures) replaceOnce(before, after);
  replaceOnce('async function status(wallet) {', `const enterButton = document.getElementById("g-enter");
const mobileGateCopy = lang === "it" ? {
  checking: "Connessione…",
  network: "Impossibile collegarsi in modo sicuro al server. Controlla la connessione e riprova. Nell’emulatore, verifica anche i certificati HTTPS del PC.",
  timeout: "Il server non risponde. Riprova tra poco.",
  date: "Inserisci una data di nascita valida."
} : {
  checking: "Connecting…",
  network: "Cannot connect securely to the server. Check your connection and try again. On an emulator, also check the PC’s HTTPS certificates.",
  timeout: "The server is taking too long to respond. Please try again.",
  date: "Enter a valid date of birth."
};
function gateBusy(busy) {
  enterButton.disabled = busy;
  enterButton.textContent = busy ? mobileGateCopy.checking : t.enter;
  enterButton.setAttribute("aria-busy", String(busy));
}
function gateNetworkError(error) {
  fail(error?.name === "AbortError" ? mobileGateCopy.timeout : mobileGateCopy.network);
}
async function gateJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let body;
    try { body = await res.json(); }
    catch (error) { if (controller.signal.aborted) throw error; body = {}; }
    return { res, body };
  } finally { clearTimeout(timer); }
}

async function status(wallet) {`);
  replaceOnce('  const res = await fetch(`/api/world/compliance${q}`, { cache: "no-store" });\n  return res.json();',
    '  const { res, body } = await gateJson(`/api/world/compliance${q}`, { cache: "no-store" });\n  if (!res.ok) throw new Error("Status unavailable");\n  return body;');
  replaceOnce('let already = {};\ntry {\n  already = await status();\n} catch {\n  already = {};\n}',
    'let already = {};\ngateBusy(true);\ntry {\n  already = await status();\n} catch (error) {\n  already = {};\n  gateNetworkError(error);\n} finally {\n  gateBusy(false);\n}');
  replaceOnce('  document.getElementById("g-enter").onclick = async () => {',
    '  enterButton.onclick = async () => {\n    if (enterButton.disabled) return;\n    err.hidden = true;');
  replaceOnce('    if (Number.isNaN(dob.getTime()) || dob > cutoff) return fail(t.age);',
    '    if (![year, month, day].every(Number.isInteger) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31 || dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) return fail(mobileGateCopy.date);\n    if (dob > cutoff) return fail(t.age);');
  replaceOnce('    const res = await fetch("/api/world/compliance", {',
    '    gateBusy(true);\n    try {\n    const { res, body } = await gateJson("/api/world/compliance", {');
  replaceOnce('    const body = await res.json().catch(() => ({}));\n', '');
  replaceOnce('    await loadGame();\n  };',
    '    await loadGame();\n    } catch (error) {\n      gateNetworkError(error);\n    } finally {\n      gateBusy(false);\n    }\n  };');
  return source;
}
