import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const code = await readFile(new URL('../mobile/native-bridge.js', import.meta.url), 'utf8');
function fixture({ iframe = false, origin = 'https://world.devfridge.cool' } = {}) {
  const messages = [], events = new Map(), classes = new Set(); let wallet;
  const port = { postMessage: raw => messages.push(JSON.parse(raw)) };
  const window = {
    __dfNativePort: port,
    addEventListener: (name, fn) => events.set(name, fn),
    dispatchEvent: event => { if (event.type === 'wallet-standard:register-wallet') event.detail({ register: value => { wallet = value; } }); },
  };
  window.top = iframe ? {} : window;
  const context = { window, location: { origin }, navigator: {}, crypto: webcrypto, Uint8Array,
    document: { readyState: 'loading', addEventListener() {}, documentElement: { classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) } } },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'), setTimeout, clearTimeout,
  };
  vm.runInNewContext(code, context);
  const reply = (result, error) => {
    const message = messages.shift(); assert.ok(message, 'a native request must exist');
    port.onmessage({ data: JSON.stringify({ id: message.id, result, error }) });
    return message;
  };
  return { wallet, messages, reply, port, context, classes };
}
const identity = { address: '11111111111111111111111111111111', publicKey: Buffer.alloc(32).toString('base64') };

test('registers only in the main frame on the first-party origin', () => {
  assert.ok(fixture().wallet);
  assert.equal(fixture({ iframe: true }).wallet, undefined);
  assert.equal(fixture({ origin: 'https://evil.test' }).wallet, undefined);
});

test('silent connection never opens a wallet or invents an account', async () => {
  const f = fixture();
  assert.equal((await f.wallet.features['standard:connect'].connect({ silent: true })).accounts.length, 0);
  assert.equal(f.messages.length, 0);
});

test('signing preserves exact bytes, rejects the wrong account, and clears on disconnect', async () => {
  const f = fixture(), features = f.wallet.features, changes = [];
  features['standard:events'].on('change', value => changes.push(value.accounts));
  const connecting = features['standard:connect'].connect(); f.reply(identity);
  const { accounts: [account] } = await connecting;
  assert.equal(account.address, identity.address);
  assert.equal(account.publicKey.length, 32);
  const message = Uint8Array.from([0, 127, 128, 255, 10]);
  const signing = features['solana:signMessage'].signMessage({ account, message });
  const sent = f.reply({ signature: Buffer.alloc(64, 7).toString('base64') });
  assert.equal(sent.method, 'signMessage');
  assert.deepEqual(Buffer.from(sent.params.message, 'base64'), Buffer.from(message));
  const [signed] = await signing;
  assert.deepEqual(signed.signedMessage, message);
  assert.equal(signed.signature.length, 64);
  await assert.rejects(features['solana:signMessage'].signMessage({ account: { address: 'wrong' }, message }), /same wallet/);
  const disconnecting = features['standard:disconnect'].disconnect(); f.reply({}); await disconnecting;
  assert.equal(f.wallet.accounts.length, 0);
  assert.equal(changes.length, 2);
});

test('wallet refusal propagates and never grants access', async () => {
  const f = fixture();
  const connecting = f.wallet.features['standard:connect'].connect();
  f.reply(null, 'User rejected the request');
  await assert.rejects(connecting, /User rejected/);
  assert.equal(f.wallet.accounts.length, 0);
});

test('invalid signatures and oversized payloads fail instead of returning success', async () => {
  const f = fixture(), features = f.wallet.features;
  const connecting = features['standard:connect'].connect(); f.reply(identity);
  const { accounts: [account] } = await connecting;
  await assert.rejects(features['solana:signMessage'].signMessage({ account, message: new Uint8Array(16385) }), /length/);
  const signing = features['solana:signMessage'].signMessage({ account, message: new Uint8Array([1]) });
  f.reply({ signature: Buffer.alloc(63).toString('base64') });
  await assert.rejects(signing, /Invalid wallet signature/);
  assert.equal(f.messages.length, 0);
});

test('share capability reports actual native support', () => {
  const { navigator } = fixture().context;
  assert.equal(navigator.canShare({ files: [{ type: 'image/png', size: 5000 }] }), true);
  assert.equal(navigator.canShare({ files: [{ type: 'image/png', size: 5000000 }] }), false);
  assert.equal(navigator.canShare({ files: [{ type: 'image/jpeg', size: 5000 }] }), false);
});

test('SKR cosmetic benefit only changes local styling and accepts booleans', () => {
  const f = fixture();
  assert.equal(f.context.window.DevFridgeMobile.setSkrPerk(true), true);
  assert.equal(f.classes.has('skr-perk-active'), true);
  assert.equal(f.context.window.DevFridgeMobile.setSkrPerk('yes'), false);
  assert.equal(f.messages.length, 0);
  f.context.window.DevFridgeMobile.setSkrPerk(false);
  assert.equal(f.classes.has('skr-perk-active'), false);
});
