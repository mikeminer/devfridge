/* On-device gameplay coach. Run statistics and voluntary ratings never leave localStorage. */
(() => {
  'use strict';
  if (!window.__dfNativePort || window.top !== window || location.origin !== 'https://world.devfridge.cool') return;
  const historyKey = 'devfridge:coach:runs:v1';
  const feedbackKey = 'devfridge:coach:feedback:v1';
  const italian = /^it(?:-|$)/i.test(navigator.language || document.documentElement.lang || '');
  const read = (key, fallback) => {
    try { const parsed = JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const tips = [
    { id: 'discover', text: ['Try a few low-risk merges first; discovering more tiers gives you room to learn the fridge’s merge rhythm.', 'Prova alcune fusioni a basso rischio: scoprire più livelli ti aiuta a capire il ritmo delle fusioni.'] },
    { id: 'spacing', text: ['Leave a clear landing lane and use the shelves to keep matching pieces close without crowding the centre.', 'Lascia libera una corsia di atterraggio e usa i ripiani per avvicinare i pezzi uguali senza affollare il centro.'] },
    { id: 'pace', text: ['Your recent score trend is rising. Keep the spacing that worked and take a moment to read the next piece before each drop.', 'La tua media recente sta salendo. Mantieni le distanze che funzionano e osserva il prossimo pezzo prima di ogni lancio.'] },
    { id: 'reset', text: ['This run was below your recent average. Slow down for one move and aim the next piece beside its matching tier.', 'Questa partita è sotto la tua media recente. Rallenta per un lancio e mira accanto al livello uguale.'] },
  ];
  function choose(score, discovered, history, ratings) {
    const recent = history.slice(-5).map(Number).filter(Number.isFinite);
    const average = recent.length >= 2 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const eligible = discovered < 6 ? ['discover', 'spacing'] : average && score < average * .8 ? ['reset', 'spacing'] : average && score > average * 1.2 ? ['pace', 'spacing'] : ['spacing', 'discover'];
    const total = Object.values(ratings).reduce((sum, item) => sum + item.helpful + item.unhelpful, 0);
    return eligible.map(id => {
      const rating = ratings[id] || { helpful: 0, unhelpful: 0 }, trials = rating.helpful + rating.unhelpful;
      const value = (rating.helpful + 1) / (trials + 2) + .3 * Math.sqrt(Math.log(total + 2) / (trials + 1));
      return { tip: tips.find(item => item.id === id), value };
    }).sort((a, b) => b.value - a.value || a.tip.id.localeCompare(b.tip.id))[0].tip;
  }
  function mount() {
    const content = document.getElementById('dialog-content');
    if (!content || !document.getElementById('again') || content.querySelector('[data-adaptive-coach]')) return;
    const scoreNode = content.querySelector('.result-score');
    if (!scoreNode) return;
    const score = Number(scoreNode.textContent.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(score)) return;
    const discovered = [...(content.querySelector('.share-grid')?.textContent || '')].filter(char => char !== '⬛' && !/\s/.test(char)).length;
    const history = read(historyKey, []), ratings = read(feedbackKey, {}), tip = choose(score, discovered, history, ratings);
    const card = document.createElement('section'); card.className = 'native-adaptive-coach'; card.dataset.adaptiveCoach = 'true';
    const heading = document.createElement('strong'); heading.textContent = italian ? 'COACH DI GIOCO · ADATTIVO E LOCALE' : 'ADAPTIVE GAME COACH · ON-DEVICE';
    const copy = document.createElement('p'); copy.textContent = tip.text[italian ? 1 : 0];
    const prompt = document.createElement('span'); prompt.textContent = italian ? 'Ti è stato utile?' : 'Was this useful?';
    const thanks = document.createElement('small'); thanks.hidden = true; thanks.textContent = italian ? 'Grazie: i prossimi consigli si adatteranno.' : 'Thanks — future tips will adapt.';
    card.append(heading, copy, prompt);
    for (const [label, helpful] of [[italian ? 'Sì' : 'Yes', true], [italian ? 'No' : 'No', false]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => {
        const current = read(feedbackKey, {}), prior = current[tip.id] || { helpful: 0, unhelpful: 0 };
        current[tip.id] = { helpful: Math.min(1000, prior.helpful + Number(helpful)), unhelpful: Math.min(1000, prior.unhelpful + Number(!helpful)) };
        write(feedbackKey, current); card.querySelectorAll('button').forEach(item => { item.disabled = true; }); thanks.hidden = false;
      }, { once: true });
      card.append(button);
    }
    card.append(thanks); content.append(card);
    write(historyKey, [...history.filter(Number.isFinite), score].slice(-8));
  }
  const start = () => {
    const root = document.getElementById('app') || document.body;
    if (!root) return;
    const observer = new MutationObserver(mount);
    observer.observe(root, { childList: true, subtree: true });
    mount();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.DevFridgeAdaptiveCoach = Object.freeze({ chooseTip: choose });
})();
