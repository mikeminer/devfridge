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
  function input(label, value) {
    const field = render().find(node => node.type === 'label' && React.Children.toArray(node.props.children)[0] === label);
    assert.ok(field, label);
    React.Children.toArray(field.props.children).find(node => node.type === 'input' || node.type === 'textarea').props.onChange({ target: { value } });
  }
  return { render, select, input };
}

test('unresolved platform is the first decision in installation and all six example prompts', () => {
  assert.match(prompts.PLATFORM_PROMPT, /Do not implement gameplay until I explicitly choose Browser, Seeker app, or Both/);
  assert.match(prompts.PLATFORM_PROMPT, /Ask me supplies no new decision and must never default to Browser/);
  assert.ok(prompts.INSTALL_PROMPT.indexOf(prompts.PLATFORM_PROMPT) < prompts.INSTALL_PROMPT.indexOf('After resolving the platform'));
  assert.ok(prompts.INSTALL_PROMPT.indexOf(prompts.FREE_PLAY_SPONSOR_PROMPT) < prompts.INSTALL_PROMPT.indexOf('Create a playable'));
  assert.ok(prompts.INSTALL_PROMPT.indexOf(prompts.DEVFRIDGE_INTRO_PROMPT) < prompts.INSTALL_PROMPT.indexOf('Create a playable'));
  const nodes = landing().render();
  const examples = nodes.filter(node => node.type?.name === 'CopyButton' && node.props.text.startsWith('Use $devfridge-game-builder.'));
  assert.equal(examples.length, 6);
  for (const example of examples) {
    assert.ok(example.props.text.startsWith(`Use $devfridge-game-builder. ${prompts.PLATFORM_PROMPT}`));
    assert.ok(example.props.text.includes(prompts.FREE_PLAY_SPONSOR_PROMPT));
    assert.ok(example.props.text.includes(prompts.DEVFRIDGE_INTRO_PROMPT));
    assert.ok(example.props.text.includes(prompts.blockchainSetupPrompt()));
    assert.ok(example.props.text.includes(prompts.subscriptionPrompt()));
    assert.ok(example.props.text.includes(prompts.GAME_BUILD_CAPABILITIES));
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
  assert.match(prompts.DEVFRIDGE_INTRO_PROMPT, /before the game opens/);
  assert.match(prompts.DEVFRIDGE_INTRO_PROMPT, /is never consent/);
  assert.match(prompts.devFridgeIntroPrompt('include'), /Copy the assets\/devfridge-intro directory unchanged/);
  assert.match(prompts.devFridgeIntroPrompt('include'), /into the APK when there is one/);
  assert.match(prompts.DEVFRIDGE_INTRO_PROMPT, /files inside the package/);
  assert.match(prompts.DEVFRIDGE_INTRO_PROMPT, /Do not load them from the network/);
  assert.match(prompts.devFridgeIntroPrompt('exclude'), /Do not add the DevFridge intro/);
});

test('platform and independent ad selections reach the copied brief in all 36 combinations', () => {
  const page = landing();
  const initial = page.render();
  assert.equal(initial.filter(node => node.type === 'select' && node.props.value === 'ask').length, 5);
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
      assert.ok(brief.includes(prompts.devFridgeIntroPrompt()));
      const adLines = brief.split('\n');
      assert.ok(adLines.find(line => line.startsWith('OnlyFridge Club ad')).includes(`: ${choices[preRun]}`));
      assert.ok(adLines.find(line => line.startsWith('YOUR AD HERE /')).includes(`: ${choices[card]}`));
      assert.match(brief, /If I explicitly choose no Free Play, mark both not applicable/);
      assert.match(brief, /first run and every retry\/restart, but never on pause\/resume/);
      assert.match(brief, /during free mode only/);
      assert.match(brief, /The top card is the only ad during a free run/);
      assert.match(brief, /Neither integration may appear in subscription or paid sessions/);
      assert.match(brief, /Optional in-app Buy <TOKEN> screen: Ask me/);
    }
  }
});

test('blockchain setup asks RPC, Token-2022 CA, domain and SOL prices, with the public RPC as fallback', () => {
  const pending = prompts.blockchainSetupPrompt();
  assert.match(pending, /Right after the platform choice, resolve my blockchain setup together/);
  assert.match(pending, /^Solana RPC: Ask me which RPC provider to use\. If I give no answer, use the public Solana RPC https:\/\/api\.mainnet-beta\.solana\.com/m);
  assert.match(pending, /^Token-2022 CA: Ask me for the exact token contract address/m);
  assert.match(pending, /initialized Token-2022 mint without TransferFee, TransferHook or unknown extensions/);
  assert.match(pending, /^Website domain: Ask me for my game website domain/m);
  assert.match(pending, /^Subscription passes and SOL prices: Ask me which of Daily Pass \(1 day\), Weekly Pass \(7 days\) and Monthly Pass \(30 days\)/m);
  assert.match(pending, /Do not invent prices/);
  const filled = prompts.blockchainSetupPrompt({ rpc: ' Alchemy ', mint: 'Mint123', domain: 'games.example.com', prices: 'Daily 0.01' });
  assert.match(filled, /^Solana RPC: Alchemy\. If this provider needs an API key, keep it only in server-side configuration/m);
  assert.match(filled, /^Token-2022 CA: Mint123/m);
  assert.match(filled, /^Website domain: games\.example\.com$/m);
  assert.match(filled, /^Subscription passes and SOL prices: Daily 0\.01$/m);
});

test('subscription prompt: any active deposit, countdown, no amount match, no timelock wording for players', () => {
  const pending = prompts.subscriptionPrompt('  ', 'ask');
  assert.match(pending, /^What stays free: Ask me; reuse my explicit prior free scope/m);
  assert.match(pending, /^Optional in-app Buy <TOKEN> screen: Ask me; no new choice supplied/m);
  assert.match(pending, /market choice is independent of platform, Game Room and both free-play ad choices/);
  assert.match(pending, /Daily, Weekly or Monthly subscription paid in SOL/);
  assert.match(pending, /the swap's guaranteed minimum output\) is deposited in the existing Fridge program until the pass ends/);
  assert.match(pending, /any active verified deposit of my mint; never compare the deposited amount with the price/);
  assert.match(pending, /Read the countdown from that deposit's end time/);
  assert.match(pending, /An unknown RPC result never grants access/);
  assert.match(pending, /game screens never mention timelocks, vaults, deposits, the program or PASTA/);
  assert.match(pending, /Put the full mechanics in the terms page/);
  assert.match(pending, /Do not deploy a new contract or add automatic renewal/);
});

test('prompt studio carries RPC, CA, domain, prices and free scope while market stays independent of ads', () => {
  const page = landing();
  const brief = () => page.render().find(node => node.type === 'textarea' && node.props['aria-label'] === 'Generated game builder prompt').props.value;
  const setup = { rpc: 'Helius', mint: 'CvjWYRkV7iFftU8PKsa7Lyyz7hhWKTj6nG1rk2mMpump', domain: 'games.example.com', prices: 'Daily 0.01 · Weekly 0.05 · Monthly 0.15' };
  const free = 'Free arcade, one life per run';
  page.input('Solana RPC provider', setup.rpc);
  page.input('Token-2022 CA or Pump.fun URL', setup.mint);
  page.input('Website domain', setup.domain);
  page.input('Pass prices in SOL', setup.prices);
  page.input('What stays free?', free);
  page.select('Where should your game run?', 'both');
  page.select('Where should the APK load game content?', 'hosted');
  page.select('Include this web game in OnlyFridge Club Game Room?', 'include');
  for (const market of ['ask', 'include', 'exclude']) {
    page.select('Optional in-app Buy <TOKEN> screen', market);
    for (const preRun of ['ask', 'include', 'exclude']) for (const card of ['ask', 'include', 'exclude']) {
      page.select('OnlyFridge Club before every free run', preRun);
      page.select('YOUR AD HERE / sponsored-token top card', card);
      const text = brief();
      assert.ok(text.includes(prompts.blockchainSetupPrompt(setup)));
      assert.ok(text.includes(prompts.subscriptionPrompt(free, market)));
      assert.ok(text.includes(prompts.freePlaySponsorPrompt(preRun, card)));
      assert.ok(text.includes(prompts.DEVFRIDGE_INTRO_PROMPT));
      assert.ok(text.includes(prompts.GAME_BUILD_CAPABILITIES));
      if (market === 'include') assert.match(text, /Buy <TOKEN> screen: Include; this is my explicit owner choice/);
      if (market === 'exclude') assert.match(text, /Buy <TOKEN> screen: Do not include; this is my explicit owner choice/);
      assert.match(text, /do not execute a real purchase as a test/);
    }
  }
  for (const label of ['Solana RPC provider', 'Token-2022 CA or Pump.fun URL', 'Website domain', 'Pass prices in SOL', 'What stays free?']) page.input(label, '');
  page.select('Optional in-app Buy <TOKEN> screen', 'ask');
  assert.ok(brief().includes(prompts.blockchainSetupPrompt()));
  assert.ok(brief().includes(prompts.subscriptionPrompt()));
  assert.doesNotMatch(brief(), /Helius|0\.15/);
});

test('installation and generated capabilities preserve safe setup, rights and release evidence', () => {
  assert.ok(prompts.INSTALL_PROMPT.includes(prompts.blockchainSetupPrompt()));
  assert.ok(prompts.INSTALL_PROMPT.includes(prompts.subscriptionPrompt()));
  assert.ok(prompts.INSTALL_PROMPT.includes(prompts.GAME_BUILD_CAPABILITIES));
  assert.match(prompts.INSTALL_PROMPT, /Verify its SHA-256/);
  assert.match(prompts.INSTALL_PROMPT, /Preserve existing customized files and ask before replacing them/);
  assert.match(prompts.INSTALL_PROMPT, /vendor files, including licenses and notices/);
  assert.match(prompts.INSTALL_PROMPT, /Reuse my website domain as wallet identity\. Ask for my permanent Android package if applicable, supported UI languages and logo\/art\/audio rights/);
  assert.match(prompts.INSTALL_PROMPT, /an in-app SOL subscription purchase and any-active-deposit access with a countdown/);
  assert.match(prompts.INSTALL_PROMPT, /fresh quote and all costs, simulate and validate the exact transaction/);
  assert.match(prompts.INSTALL_PROMPT, /recover unknown outcomes without an automatic second request/);
  assert.match(prompts.INSTALL_PROMPT, /Do not buy tokens, move funds or sign transactions during setup/);
  assert.match(prompts.INSTALL_PROMPT, /Keep wallet authentication, token eligibility and score verification separate/);
  assert.match(prompts.INSTALL_PROMPT, /Keep simulations, physical Seeker tests, signed APK creation and Store publication status distinct/);
  assert.match(prompts.INSTALL_PROMPT, /Owner review, merge and successful deployment publish the gallery entry/);
  assert.match(prompts.INSTALL_PROMPT, /every stage/);
  assert.match(prompts.INSTALL_PROMPT, /below 50 FPS after warmup/);
  assert.match(prompts.INSTALL_PROMPT, /Missing hardware evidence blocks release, not ongoing development/);
  assert.match(prompts.INSTALL_PROMPT, /over 25,000,000 bytes/);
  assert.match(prompts.INSTALL_PROMPT, /never upload keys, credentials or private checkpoints/);
  for (const ref of ['season-pass', 'in-game-market', 'gamedev-skills', 'game-studio', '3d-assets-and-characters', 'visual-realism', 'logo-and-store-art', 'sound-prompts', 'music-prompts', 'release-pitfalls', 'rpc-proxy', 'public-site', 'incremental-build', 'performance-and-capture', 'release-updates']) {
    assert.ok(prompts.INSTALL_PROMPT.includes(`references/${ref}.md`), ref);
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

test('the DevFridge intro choice reaches the copied brief and stays out until answered', () => {
  const page = landing();
  const brief = () => page.render().find(node => node.type === 'textarea' && node.props['aria-label'] === 'Generated game builder prompt').props.value;
  assert.match(brief(), /DevFridge intro before the game opens: Ask me/);
  page.select('DevFridge intro before the game opens', 'include');
  assert.ok(brief().includes(prompts.devFridgeIntroPrompt('include')));
  page.select('DevFridge intro before the game opens', 'exclude');
  assert.ok(brief().includes(prompts.devFridgeIntroPrompt('exclude')));
  assert.match(brief(), /Do not add the DevFridge intro/);
});
