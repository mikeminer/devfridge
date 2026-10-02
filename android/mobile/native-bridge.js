/* Native capabilities for the bundled game only. No private keys or auth tokens enter JS. */
(() => {
  'use strict';
  const port = window.__dfNativePort;
  if (!port || window.top !== window || location.origin !== 'https://world.devfridge.cool') return;
  const audioContexts = new Set();
  // WebView.onPause does not itself guarantee suspension of Web Audio.
  if (window.AudioContext) {
    const WebAudioContext = window.AudioContext;
    window.AudioContext = class extends WebAudioContext {
      constructor(...args) { super(...args); audioContexts.add(this); }
    };
  }
  const pending = new Map();
  const encode = bytes => btoa(Array.from(bytes, n => String.fromCharCode(n)).join(''));
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  function request(method, params = {}) {
    if (pending.size >= 8) return Promise.reject(new Error('Finish the current action first.'));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('The mobile request timed out. Return from your wallet and try again.')); }, 120000);
      pending.set(id, { resolve, reject, timeout });
      try { port.postMessage(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timeout); pending.delete(id); reject(error); }
    });
  }
  port.onmessage = ({ data }) => {
    let reply;
    try { reply = JSON.parse(data); } catch { return; }
    const action = pending.get(reply.id);
    if (!action) return;
    pending.delete(reply.id); clearTimeout(action.timeout);
    if (reply.error) action.reject(new Error(reply.error)); else action.resolve(reply.result);
  };

  let account;
  const listeners = new Set();
  const emitAccounts = () => listeners.forEach(listener => listener({ accounts: wallet.accounts }));
  const wallet = Object.freeze({
    version: '1.0.0',
    name: 'Android wallet · Solana Mobile',
    icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#17231c"/><path fill="#c1ec73" d="M19 9h26v46H19z"/><path fill="#17231c" d="M23 13h18v14H23zm0 18h18v20H23z"/></svg>'),
    chains: Object.freeze(['solana:mainnet']),
    get accounts() { return account ? [account] : []; },
    features: {
      'standard:connect': { version: '1.0.0', async connect(options = {}) {
        if (options.silent) return { accounts: wallet.accounts };
        const result = await request('connect');
        const publicKey = decode(result.publicKey);
        if (publicKey.length !== 32 || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(result.address)) throw new Error('Invalid wallet account.');
        account = Object.freeze({ address: result.address, publicKey, chains: ['solana:mainnet'], features: ['solana:signMessage'] });
        emitAccounts(); return { accounts: wallet.accounts };
      } },
      'standard:disconnect': { version: '1.0.0', async disconnect() {
        await request('disconnect'); account = undefined; emitAccounts();
      } },
      'standard:events': { version: '1.0.0', on(event, listener) {
        if (event !== 'change') throw new Error('Unsupported wallet event.');
        listeners.add(listener); return () => listeners.delete(listener);
      } },
      'solana:signMessage': { version: '1.0.0', async signMessage(...inputs) {
        const results = [];
        for (const input of inputs) {
          if (!account || input.account.address !== account.address) throw new Error('Connect the same wallet again.');
          const message = new Uint8Array(input.message);
          if (!message.length || message.length > 16384) throw new Error('Invalid message length.');
          const expected = account.address;
          const result = await request('signMessage', { address: expected, message: encode(message) });
          if (account?.address !== expected) throw new Error('Wallet changed during signing.');
          const signature = decode(result.signature);
          if (signature.length !== 64) throw new Error('Invalid wallet signature.');
          results.push({ signedMessage: message, signature });
        }
        return results;
      } },
    },
  });
  const register = api => api.register(wallet);
  window.addEventListener('wallet-standard:app-ready', event => register(event.detail));
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));

  const canShare = data => !data?.files?.length || (data.files.length === 1 && data.files[0].type === 'image/png' && data.files[0].size <= 4000000);
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
    if (!canShare(data)) throw new Error('Share one PNG image smaller than 4 MB.');
    const params = { text: [data?.text, data?.url].filter(Boolean).join('\n').slice(0, 4000) };
    if (data?.files?.length) {
      // FileReader avoids spreading a multi-megabyte image on the JavaScript stack.
      params.image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read the score image.'));
        reader.readAsDataURL(data.files[0]);
      });
    }
    await request('share', params);
  } });

  function pause() {
    window.dispatchEvent(new Event('blur'));
    for (const context of audioContexts) if (context.state === 'running') context.suspend().catch(() => {});
    const overlay = document.getElementById('paused');
    if (overlay?.hidden) document.getElementById('pause')?.click();
  }
  function back() {
    const dialog = document.querySelector('dialog[open]');
    if (dialog) { (dialog.querySelector('.dialog-close') || dialog.querySelector('[data-close]'))?.click(); if (dialog.open) dialog.close(); return true; }
    const overlay = document.getElementById('paused');
    if (overlay?.hidden) { pause(); return !overlay.hidden; }
    return false;
  }
  window.DevFridgeMobile = Object.freeze({ pause, back, openRegistration: id => request('openRegistration', { id }),
    setSkrPerk(unlocked) {
      if (typeof unlocked !== 'boolean') return false;
      document.documentElement.classList.toggle('skr-perk-active', unlocked);
      return true;
    },
    async signRegistration(address, message) {
      const result = await request('connect');
      if (result.address !== address) throw new Error('Choose the original Solana wallet used for this run. No authorization was sent.');
      const signed = await request('signMessage', { address, message: encode(new TextEncoder().encode(message)) });
      const signature = decode(signed.signature);
      if (signature.length !== 64) throw new Error('Invalid wallet signature.');
      return signed.signature;
    }
  });

  function enhance() {
    document.documentElement.classList.add('native-android');
    let previousScore = '';
    const scoreObserver = new MutationObserver(() => {
      const value = document.getElementById('score')?.textContent;
      if (previousScore && value && value !== previousScore && Number(value.replace(/\D/g, '')) > Number(previousScore.replace(/\D/g, ''))) {
        request('haptic', { kind: 'merge' }).catch(() => {});
      }
      previousScore = value || '';
    });
    let watchedScore;
    const attach = () => {
      const score = document.getElementById('score');
      if (score && score !== watchedScore) {
        scoreObserver.disconnect(); watchedScore = score; previousScore = score.textContent;
        scoreObserver.observe(score, { childList: true, subtree: true, characterData: true });
      }
      const registration = document.querySelector('.score-registration-entry');
      if (registration && !registration.dataset.mobileNotice) {
        registration.dataset.mobileNotice = 'true';
        const note = document.createElement('p'); note.className = 'native-capability-note';
        note.textContent = 'Register a verified score with your Robinhood wallet in Phantom. Approve the Solana link with your original game wallet, including Seed Vault, without importing its recovery phrase.';
        registration.prepend(note);
      }
    };
    new MutationObserver(attach).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    attach();
    document.addEventListener('pointerup', event => {
      const button = event.target.closest?.('#drop, [data-move], [data-enter], #touch-shout');
      if (button && !button.disabled) request('haptic', { kind: 'tap' }).catch(() => {});
    }, true);
    document.addEventListener('pointerdown', () => {
      for (const context of audioContexts) if (context.state === 'suspended') context.resume().catch(() => {});
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
