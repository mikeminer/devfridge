const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const prompts = require('../lib/game-builder-prompts.ts');

// Exercise the landing's select handlers and copied values without loading WebGL.
function landing() {
  const state = [];
  let cursor = 0;
  const fileName = path.join(__dirname, '../components/world/skill/SkillLanding.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiled.diagnostics, []);
  const module = { exports: {} };
  const load = id => {
    if (id === 'react') return { ...React, useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    } };
    if (id === 'react/jsx-runtime') return require(id);
    if (id === '@/lib/game-builder-prompts') return prompts;
    if (id === './skill.module.css') return {};
    if (id === 'next/dynamic') return () => () => null;
    if (id === './ProgramStory' || id === './SkillBoxShowcase') return () => null;
    throw new Error(`Unexpected landing dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', compiled.outputText)(load, module, module.exports);
  function render() {
    cursor = 0;
    const nodes = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!React.isValidElement(node)) return;
      nodes.push(node);
      walk(node.props.children);
    }
    walk(module.exports.default());
    return nodes;
  }
  function select(label, value) {
    const field = render().find(node => node.type === 'label' && React.Children.toArray(node.props.children)[0] === label);
    assert.ok(field, label);
    React.Children.toArray(field.props.children).find(node => node.type === 'select').props.onChange({ target: { value } });
  }
  return { render, select };
}

test('unresolved platform is the first decision in installation and all six example prompts', () => {
  assert.match(prompts.PLATFORM_PROMPT, /Do not implement gameplay until I explicitly choose Browser, Seeker app, or Both/);
  assert.match(prompts.PLATFORM_PROMPT, /Ask me supplies no new decision and must never default to Browser/);
  assert.ok(prompts.INSTALL_PROMPT.indexOf(prompts.PLATFORM_PROMPT) < prompts.INSTALL_PROMPT.indexOf('After resolving the platform'));
  assert.ok(prompts.INSTALL_PROMPT.indexOf(prompts.FREE_PLAY_SPONSOR_PROMPT) < prompts.INSTALL_PROMPT.indexOf('Create a playable'));
  const nodes = landing().render();
  const examples = nodes.filter(node => node.type?.name === 'CopyButton' && node.props.text.startsWith('Use $devfridge-game-builder.'));
  assert.equal(examples.length, 6);
  for (const example of examples) {
    assert.ok(example.props.text.startsWith(`Use $devfridge-game-builder. ${prompts.PLATFORM_PROMPT}`));
    assert.ok(example.props.text.includes(prompts.FREE_PLAY_SPONSOR_PROMPT));
    assert.doesNotMatch(example.props.text, /Use Phantom on desktop\/mobile|Phantom desktop\/mobile and DevFridge/);
  }
});

test('blank prompt fields defer to explicit prior owner decisions instead of resetting them', () => {
  for (const platform of ['ask', 'browser', 'seeker', 'both']) {
    assert.match(prompts.gamePlatformPrompt(platform), /Reuse an explicit prior platform choice without asking again/);
  }
  const platformField = prompts.gamePlatformPrompt().split('\n').find(line => line.startsWith('Delivery platform:'));
  assert.match(platformField, /no new choice supplied in this prompt/);
  assert.match(platformField, /Reuse my explicit prior choice; otherwise ask/);
  for (const line of prompts.freePlaySponsorPrompt().split('\n').slice(1, 3)) {
    assert.match(line, /no new choice supplied in this prompt/);
    assert.match(line, /Reuse my explicit prior choice; otherwise ask and keep disabled while pending/);
  }
  assert.match(prompts.FREE_PLAY_SPONSOR_PROMPT, /If I explicitly choose no Free Play, mark both not applicable without asking ad questions/);
});

test('platform and independent ad selections reach the copied brief in all 36 combinations', () => {
  const page = landing();
  const initial = page.render();
  assert.equal(initial.filter(node => node.type === 'select' && node.props.value === 'ask').length, 3);
  const choices = { ask: 'Ask me;', include: 'Include;', exclude: 'Do not include;' };
  for (const platform of ['ask', 'browser', 'seeker', 'both']) {
    page.select('Where should your game run?', platform);
    for (const preRun of Object.keys(choices)) for (const card of Object.keys(choices)) {
      page.select('OnlyFridge Club before every free run', preRun);
      page.select('YOUR AD HERE / sponsored-token top card', card);
      const nodes = page.render();
      const brief = nodes.find(node => node.type === 'textarea' && node.props['aria-label'] === 'Generated game builder prompt').props.value;
      assert.ok(nodes.some(node => node.type?.name === 'CopyButton' && node.props.text === brief));
      assert.ok(brief.includes(prompts.gamePlatformPrompt(platform)));
      assert.ok(brief.includes(prompts.freePlaySponsorPrompt(preRun, card)));
      const adLines = brief.split('\n');
      assert.ok(adLines.find(line => line.startsWith('OnlyFridge Club ad')).includes(`: ${choices[preRun]}`));
      assert.ok(adLines.find(line => line.startsWith('YOUR AD HERE /')).includes(`: ${choices[card]}`));
      assert.match(brief, /If I explicitly choose no Free Play, mark both not applicable/);
      assert.match(brief, /first run and every retry\/restart, but never on pause\/resume/);
      assert.match(brief, /during free mode only/);
    }
  }
});

test('resolved platforms preserve the chosen wallet and delivery requirements', () => {
  const browser = prompts.gamePlatformPrompt('browser');
  const seeker = prompts.gamePlatformPrompt('seeker', 'bundled');
  const both = prompts.gamePlatformPrompt('both', 'bundled');
  for (const prompt of [browser, seeker, both]) assert.match(prompt, /Reuse an explicit prior platform choice without asking again/);
  assert.match(browser, /Phantom extension\/mobile-browser access/);
  assert.doesNotMatch(browser, /deliver a signed release APK/);
  assert.doesNotMatch(seeker, /with Phantom/);
  for (const prompt of [seeker, both]) {
    assert.match(prompt, /APK content: Included in the APK/);
    assert.match(prompt, /signed release APK/);
    assert.match(prompt, /Seeker Connect \/ Mobile Wallet Adapter/);
    assert.match(prompt, /physical Seeker/);
    assert.match(prompt, /Solana dApp Store listing/);
    assert.match(prompt, /a built APK is not Store approval or publication/);
    for (const reference of ['seeker-android.md', 'seeker-wallet.md', 'solana-dapp-store.md']) assert.ok(prompt.includes(reference));
  }
  assert.match(both, /share gameplay source and assets, keep platform-specific wallet adapters separate/);
  assert.match(both, /Phantom extension\/mobile-browser access/);
});

test('APK content remains unresolved until chosen and both architectures produce APKs', () => {
  for (const platform of ['seeker', 'both']) {
    const pending = prompts.gamePlatformPrompt(platform);
    assert.match(pending, /APK content: Ask me; no new choice supplied/);
    assert.match(pending, /Reuse my explicit prior choice; otherwise ask whether/);
    assert.match(pending, /wait before choosing the architecture/);
    for (const content of ['bundled', 'hosted']) {
      const prompt = prompts.gamePlatformPrompt(platform, content);
      assert.match(prompt, /Both content choices produce an installable signed APK; Browser alone does not require an APK/);
      assert.match(prompt, /native bridge for a native WebView wrapper, or the supported web-wallet path for browser\/TWA delivery/);
    }
  }
  assert.doesNotMatch(prompts.PLATFORM_PROMPT, /^APK content:|^Game Room integration:/m);
  assert.match(prompts.PLATFORM_PROMPT, /After resolving the delivery choices, ask about Game Room only if web delivery is selected/);
});

test('Game Room is conditional on web delivery and stale choices cannot escape a hidden field', () => {
  for (const platform of ['ask', 'browser', 'seeker', 'both']) {
    for (const content of ['ask', 'bundled', 'hosted']) {
      const applicable = platform === 'browser' || platform === 'both' || (platform === 'seeker' && content === 'hosted');
      assert.equal(prompts.hasWebDelivery(platform, content), applicable);
      for (const choice of ['ask', 'include', 'exclude']) {
        const prompt = prompts.gamePlatformPrompt(platform, content, choice);
        assert.equal(/^Game Room integration:/m.test(prompt), applicable, `${platform}/${content}/${choice}`);
        if (applicable) {
          if (choice === 'include') {
            assert.match(prompt, /Game Room integration: Include; this is my explicit owner choice/);
            assert.match(prompt, /references\/game-room.md/);
            assert.match(prompt, /do not claim publication before review and verified deployment/);
          } else if (choice === 'exclude') assert.match(prompt, /Game Room integration: Do not include/);
          else {
            assert.match(prompt, /Reuse my explicit prior choice; otherwise ask whether I want this web game integrated into OnlyFridge Club Game Room/);
            assert.match(prompt, /wait before gameplay or integration work/);
          }
          assert.match(prompt, /independent of both free-play ad choices and whether Free Play exists/);
        } else {
          assert.doesNotMatch(prompt, /Game Room integration: Include|Game Room integration: Do not include/);
          if (platform === 'seeker' && content === 'bundled') {
            assert.match(prompt, /Game Room is not applicable/);
            assert.match(prompt, /Do not ask its opt-in question or carry over a stale Game Room choice/);
            assert.doesNotMatch(prompt, /references\/game-room.md/);
          }
        }
      }
    }
  }
});

test('conditional fields and copied briefs follow platform/content changes without leaking old opt-ins', () => {
  const page = landing();
  const platformLabel = 'Where should your game run?';
  const apkLabel = 'Where should the APK load game content?';
  const roomLabel = 'Include this web game in OnlyFridge Club Game Room?';
  const visible = label => page.render().some(node => node.type === 'label' && React.Children.toArray(node.props.children)[0] === label);
  const brief = () => {
    const nodes = page.render();
    const text = nodes.find(node => node.type === 'textarea' && node.props['aria-label'] === 'Generated game builder prompt').props.value;
    assert.ok(nodes.some(node => node.type?.name === 'CopyButton' && node.props.text === text));
    return text;
  };
  assert.equal(visible(apkLabel), false);
  assert.equal(visible(roomLabel), false);
  page.select(platformLabel, 'browser');
  assert.equal(visible(apkLabel), false);
  assert.equal(visible(roomLabel), true);
  page.select(roomLabel, 'include');
  assert.match(brief(), /Game Room integration: Include/);
  page.select(platformLabel, 'both');
  assert.equal(visible(apkLabel), true);
  assert.equal(visible(roomLabel), true);
  assert.match(brief(), /APK content: Ask me/);
  for (const content of ['bundled', 'hosted']) {
    page.select(apkLabel, content);
    assert.equal(visible(roomLabel), true);
    assert.match(brief(), /Game Room integration: Include/);
  }
  page.select(platformLabel, 'seeker');
  assert.equal(visible(roomLabel), true);
  assert.match(brief(), /APK content: Loaded from a hosted website/);
  for (const content of ['bundled', 'ask']) {
    page.select(apkLabel, content);
    assert.equal(visible(roomLabel), false);
    assert.doesNotMatch(brief(), /^Game Room integration:/m);
  }
  page.select(apkLabel, 'hosted');
  assert.equal(visible(roomLabel), true);
  assert.match(brief(), /Game Room integration: Include/);
  page.select(roomLabel, 'exclude');
  assert.match(brief(), /Game Room integration: Do not include/);
  page.select(roomLabel, 'ask');
  assert.match(brief(), /Game Room integration: Ask me; no new choice supplied/);
  page.select(platformLabel, 'ask');
  assert.equal(visible(apkLabel), false);
  assert.equal(visible(roomLabel), false);
  assert.doesNotMatch(brief(), /^APK content:|^Game Room integration:/m);
});
