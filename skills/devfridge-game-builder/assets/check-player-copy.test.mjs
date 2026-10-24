import test from 'node:test';
import assert from 'node:assert/strict';
import { scanPlayerCopy } from './check-player-copy.mjs';
const scan = (source, options = {}) => scanPlayerCopy(source, { file: 'src/pass.tsx', scope: 'pass', ...options });

test('identifiers and comments are not player strings; literal CamelCase errors are', () => {
  assert.deepEqual(scan('// Lock docs\nconst create_lock = true; /* unlock */\nconst view = "Season Pass active";'), []);
  assert.ok(scan('const error = "InvalidUnlockTime";').some(item => item.rule === 'mechanics'));
  assert.ok(scan('throw new Error("InsufficientLockedBalance")').some(item => item.rule === 'mechanics'));
  assert.deepEqual(scan('import x from "./devfridge-lock.mjs"; const x = { "unlock_handler": () => "Play" };'), []);
});

test('escaped literals, template fragments, nested interpolation, JSX and entities are scanned', () => {
  for (const source of ['const text = "\\u006c\\u006fck";', 'const text = `Get ${name} locked`;', 'const text = `${ok ? "Unlock" : `Play ${id}`}`;', 'return <button>Unlock</button>;', 'return <p title="Lock tokens">Play</p>;']) assert.ok(scan(source).length, source);
  assert.ok(scanPlayerCopy('<button>Un&#108;ock</button>', { file: 'index.html', scope: 'pass' }).length);
  assert.deepEqual(scan('const text = "Blockchain clock";'), []);
  assert.deepEqual(scan('const pattern = /"lock"/; const text = "Play";'), []);
});

test('HTML scripts, Android labels/resources and native outcomes are scanned', () => {
  assert.ok(scanPlayerCopy('<script>const label="Unlock";</script>', { file: 'index.html' }).length);
  assert.ok(scanPlayerCopy('<application android:label="DevFridge" />', { file: 'AndroidManifest.xml' }).length);
  assert.ok(scanPlayerCopy('<resources><string name="pass">Lock to play</string></resources>', { file: 'strings.xml' }).length);
  assert.deepEqual(scanPlayerCopy('<string name="unlock_label">Play</string>', { file: 'strings.xml' }), []);
  assert.ok(scanPlayerCopy('return "LockExpired"', { file: 'Outcome.kt' }).length);
});

test('JSX expressions cannot conceal static copy before, after or between containers', () => {
  for (const source of [
    '<button>{icon} Lock tokens</button>',
    '<button>Lock tokens {icon}</button>',
    '<button>Lock {amount} tokens</button>',
    '<button>{icon /* { ignored } */} Lock {amount} tokens</button>',
    '<section>{ready ? <button>{icon} Lock tokens</button> : null}</section>',
    '<><button>{icon} Unlock</button><p>Play</p></>',
  ]) assert.ok(scan(source).some(item => item.rule === 'mechanics'), source);
  assert.deepEqual(scan('<button>{icon} Get {amount} Season Passes</button>'), []);
  assert.deepEqual(scan('<div>{internalLockIdentifier} Play {balance}</div>'), []);
  assert.deepEqual(scan('<div>{/* Lock is a technical comment, not visible */} Play</div>'), []);
});

test('unquoted accessible HTML attributes are scanned alongside quoted values', () => {
  for (const source of ['<button title=Lock>Play</button>', '<input placeholder=Unlock/>', '<img alt=DevFridge src=logo.png>', '<button aria-label=Withdraw>Play</button>']) assert.ok(scanPlayerCopy(source, { file: 'index.html', scope: 'pass' }).length, source);
  assert.deepEqual(scanPlayerCopy('<button id=lock_handler title=Play>Play</button>', { file: 'index.html', scope: 'pass' }), []);
});

test('scopes preserve truthful Details but reject token promises and pass commerce', () => {
  assert.equal(scan('const text="A 2% fee buys and burns PASTA";').some(item => item.rule === 'pasta'), true);
  assert.deepEqual(scan('const text="A 2% fee buys and burns PASTA";', { scope: 'details' }), []);
  assert.ok(scan('const text="Withdraw after 30 days";', { scope: 'details' }).length);
  assert.ok(scan('const text="Pass price";', { scope: 'details' }).some(item => item.rule === 'pass-commerce'));
  assert.ok(scan('const text="Pay the pass price";').some(item => item.rule === 'pass-commerce'));
  assert.deepEqual(scan('const text="Buy at the current market price";', { scope: 'market' }), []);
  assert.ok(scan('const text="Earn tokens";', { scope: 'market' }).length);
  assert.deepEqual(scan('const text="Earn points";', { scope: 'general' }), []);
  assert.ok(scan('const text="Prototype build";').some(item => item.rule === 'release-placeholder'));
});

test('Markdown scans explicit player blocks only, with per-block scopes', () => {
  const source = 'Developer docs: create_lock DevFridge.\n```js\ngetLockUrl();\n```\n```player-copy/details\nA 2% fee buys and burns PASTA.\n```\n```player-copy/pass\nLock to unlock\n```';
  const result = scanPlayerCopy(source, { file: 'reference.md' });
  assert.equal(result.length, 1); assert.equal(result[0].scope, 'pass');
});

test('allowlist requires exact file/scope/text/rule/reason, brand only in Free Play', () => {
  const entry = { file: 'sponsor.js', scope: 'free-play', text: 'Sponsored · scan.devfridge.cool', rules: ['brand'], reason: 'Owner opted into top sponsor card.' };
  const options = { file: 'sponsor.js', scope: 'free-play', allowlist: [entry] };
  assert.deepEqual(scanPlayerCopy('const label="Sponsored · scan.devfridge.cool";', options), []);
  assert.ok(scanPlayerCopy('const label="Sponsored · scan.devfridge.cool extra";', options).length);
  assert.ok(scanPlayerCopy('const label="Sponsored · scan.devfridge.cool";', { ...options, scope: 'pass', allowlist: [{ ...entry, scope: 'pass' }] }).length);
  assert.ok(scanPlayerCopy('const label="Sponsored · scan.devfridge.cool";', { ...options, allowlist: [{ ...entry, reason: '' }] }).length);
});

test('dist catches hidden identifiers and forbids a blanket bundle exemption', () => {
  assert.ok(scan('const devfridgeClient = {};', { dist: true }).length);
  const entry = { file: 'sponsor.js', scope: 'free-play', text: 'scan.devfridge.cool', rules: ['brand'], reason: 'Fixed approved sponsor host.' };
  assert.deepEqual(scanPlayerCopy('const host="scan.devfridge.cool";', { file: 'sponsor.js', scope: 'free-play', dist: true, allowlist: [entry] }), []);
  assert.ok(scanPlayerCopy('const host="scan.devfridge.cool";const devfridgeLeak=1;', { file: 'sponsor.js', scope: 'free-play', dist: true, allowlist: [entry] }).length);
  assert.ok(scan('const host="scan.devfridge.cool";', { dist: true, allowlist: [{ ...entry, file: 'src/pass.tsx', scope: 'pass' }] }).length);
});
