import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {copy} from './android-locales/base.mjs';
import {fields, translations} from './android-locales/translations.mjs';
import {regions, languages} from './android-locales/regions.mjs';
import {privacy, privacyLinks} from './android-locales/privacy.mjs';
import {storeCopy} from './android-locales/store.mjs';

const out = fileURLToPath(new URL('../public/world/android/', import.meta.url));
const r = JSON.parse(readFileSync(join(out, 'release.json'), 'utf8'));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const international = {id:'index', country:null, lang:'en', path:'/android'};
const pages = [international, ...regions];
const storeLive = r.storeStatus === 'live';
if (storeLive && r.storeUrl !== `solanadappstore://details?id=${r.package}`) throw Error('Invalid dApp Store listing URL');
for (const {lang} of pages) {
  if (!storeCopy[lang] || storeCopy[lang].length !== 3 || storeCopy[lang].some(value => !value.trim())) throw Error(`Incomplete store translation: ${lang}`);
}
if (storeLive && !existsSync(join(out,'solana-dapp-store-badge.svg'))) throw Error('Missing official dApp Store badge');

// Fail the build rather than silently showing English in an incomplete locale.
for (const [lang, values] of Object.entries(translations)) {
  if (values.length !== fields.length || values.some(v => typeof v !== 'string' || !v.trim())) {
    throw Error(`Incomplete ${lang} translation: ${values.length}/${fields.length}`);
  }
  const c = Object.fromEntries(fields.map((key, i) => [key, values[i]]));
  copy[lang] = {
    ...c, badge:'ANDROID · BETA', walletSol:'Solana / Seed Vault', walletEvm:'Robinhood / Phantom',
    store:'Solana dApp Store', rulesPath:'/android/rules', privacyPath:'/android/privacy',
    features:[['01',c.play,c.playText],['02',c.keep,c.keepText],['03',c.share,c.shareText]],
    install:[[c.deviceTitle,c.deviceText],[c.installAppTitle,c.installText],[c.connectTitle,c.connectText]],
  };
}
Object.assign(copy.en, {
  countryLabel:'Country & language',help:'Support',skip:'Skip to content',tagline:'MERGE. CHILL. REPEAT.',
  gameLabel:'THE GAME',improveLabel:'LET’S MAKE IT BETTER',
  docsNote:'Documentation is available in English and Italian.',
  regionNote:'Choosing a country changes the language, not TopShelf eligibility.',
});
Object.assign(copy.it, {
  countryLabel:'Paese e lingua',help:'Assistenza',skip:'Vai al contenuto',tagline:'UNISCI. RILASSATI. RIPETI.',
  gameLabel:'IL GIOCO',improveLabel:'MIGLIORIAMOLA INSIEME',
  docsNote:'Documentazione disponibile in inglese e italiano.',
  regionNote:'La scelta del paese cambia la lingua, non l’ammissibilità a TopShelf.',
});
for (const region of regions) {
  if (!copy[region.lang]) throw Error(`Missing language: ${region.lang}`);
  if (!existsSync(join(out,'flags',`${region.country.toLowerCase()}.svg`))) throw Error(`Missing flag: ${region.country}`);
}

function flag(region) {
  return region.country
    ? `<img class="flag" src="/world/android/flags/${region.country.toLowerCase()}.svg" width="28" height="21" alt="">`
    : '<span class="globe" aria-hidden="true">🌐</span>';
}

function countryPicker(region) {
  const c = copy[region.lang];
  const names = new Intl.DisplayNames([region.lang], {type:'region'});
  const sorted = [...regions].sort((a,b) => names.of(a.country).localeCompare(names.of(b.country), region.lang));
  return `<details class="country-picker"><summary>${flag(region)}<span>${esc(c.countryLabel)}<small>${esc(languages[region.lang])}</small></span></summary>
    <div class="country-panel"><p class="picker-title">${esc(c.countryLabel)}</p>
      <div class="country-grid">${[international,...sorted].map(item => `<a class="country-option" href="${item.path}"${item.id===region.id?' aria-current="page"':''}>
        ${flag(item)}<span>${esc(item.country ? names.of(item.country) : 'International')}<small lang="${item.lang}" dir="auto">${esc(languages[item.lang])}</small></span>
      </a>`).join('')}</div><p class="picker-note">${esc(c.regionNote)}</p>
    </div></details>`;
}

function shell(region, title, path, body, {legal=false}={}) {
  const c = copy[region.lang];
  const docLang = region.lang==='it'?'it':'en';
  const docSuffix = ['en','it'].includes(region.lang) ? '' : ' (English)';
  const alternates = legal ? '' : pages.map(p => `<link rel="alternate" hreflang="${p.country ? (p.lang==='pt-BR'?'pt-BR':`${p.lang}-${p.country}`) : 'x-default'}" href="https://world.devfridge.cool${p.path}">`).join('');
  return `<!doctype html>
<html lang="${region.lang}" dir="${region.lang==='ar'?'rtl':'ltr'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${esc(title)} · DevFridge World</title><meta name="description" content="${esc(c.lead)} ${esc(c.small)}">
<link rel="canonical" href="https://world.devfridge.cool${path}">${alternates}
<meta property="og:title" content="${esc(title)} · DevFridge World"><meta property="og:description" content="${esc(c.lead)}">
<meta property="og:image" content="https://world.devfridge.cool/world/android/artwork.png">
<link rel="icon" href="/world/android/artwork.png"><link rel="stylesheet" href="/world/android/android.css">
</head><body><a class="skip" href="#main">${esc(c.skip)}</a>
<header class="wrap nav"><a class="wordmark" href="https://world.devfridge.cool" dir="ltr">DEVFRIDGE<span>WORLD</span></a>
<nav aria-label="${esc(c.countryLabel)}"><a href="${region.path}#install">${esc(c.how)}</a><a href="mailto:welcome@devfridge.cool">${esc(c.help)}</a>${countryPicker(region)}</nav></header>
${body}
<footer class="wrap footer"><a class="wordmark" href="https://world.devfridge.cool" dir="ltr">DEVFRIDGE<span>WORLD</span></a>
<div><p dir="ltr">Published by <a href="https://x.com/AnonimoCommando" rel="me">pastaman</a></p>
<a href="${c.privacyPath}" lang="${docLang}">${esc(c.privacy+docSuffix)}</a> · <a href="${c.rulesPath}" lang="${docLang}">${esc(c.rules+docSuffix)}</a>
<p><a href="mailto:welcome@devfridge.cool" dir="ltr">welcome@devfridge.cool</a></p></div>
<small dir="ltr">© 2026 DevFridge<br>Android ${esc(r.version)}</small></footer></body></html>`;
}

function landing(region) {
  const c = copy[region.lang];
  const [storeOpen,storeAvailable,storeHelp] = storeCopy[region.lang];
  const storeBadge = storeLive ? `<a class="store-badge" href="${esc(r.storeUrl)}" aria-label="${esc(storeOpen)} · DevFridge World" aria-describedby="store-help"><img src="/world/android/solana-dapp-store-badge.svg" alt="Solana dApp Store" width="232" height="91"></a>` : '';
  const docSuffix = ['en','it'].includes(region.lang) ? '' : ' (English)';
  return shell(region, c.download, region.path, `<main id="main">
<section class="wrap hero"><div class="hero-copy"><p class="eyebrow"><span class="dot"></span>${esc(c.badge)}</p>
<h1>${c.title.split('\n').map(esc).join('<br>')}</h1><p class="lead">${esc(c.lead)}</p>
<div class="download-actions">${storeBadge}<a class="cta" href="${esc(r.downloadUrl)}" aria-describedby="beta-note">${esc(c.download)}<span aria-hidden="true">↗</span></a></div>
${storeLive?`<p class="store-help" id="store-help">${esc(storeHelp)}</p>`:''}
<p class="micro"><bdi>${esc(r.version)} · ${(r.bytes/1048576).toFixed(1)} MiB</bdi><br>${esc(c.small)}</p></div>
<div class="poster"><img src="/world/android/artwork.png" alt="DevFridge World" width="1254" height="1254" fetchpriority="high"><span class="sticker" dir="ltr">BETA<br>01</span></div></section>
<div class="ticker" aria-hidden="true"><span>${esc(c.tagline)}</span><span>DEVFRIDGE WORLD ✳ ANDROID</span><span>${esc(c.tagline)}</span></div>
<section class="wrap beta-note" id="beta-note"><span class="tag">BETA</span><div><h2>${esc(c.beta)}</h2><p>${esc(storeLive?`${storeAvailable} ${c.small}`:c.betaText)}</p></div></section>
<section class="wrap section"><p class="eyebrow">${esc(c.gameLabel)}</p><h2>${esc(c.nativeTitle)}</h2><div class="features">${c.features.map(([n,t,d])=>`<article><span class="number">${n}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}</div></section>
<section class="dark-section" id="install"><div class="wrap section"><p class="eyebrow" dir="ltr">ANDROID 9+</p><h2>${esc(c.installTitle)}</h2>
<ol class="steps">${c.install.map(([t,d],i)=>`<li><span class="step">0${i+1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join('')}</ol>
<details><summary>${esc(c.old)}</summary><p>${esc(c.oldText)}</p></details></div></section>
<section class="wrap section"><p class="eyebrow" dir="ltr">SOLANA + ROBINHOOD</p><h2>${esc(c.walletTitle)}</h2><div class="wallets">
<article><span class="wallet-label" dir="ltr">01 / SOLANA</span><h3 dir="ltr">${esc(c.walletSol)}</h3><p>${esc(c.walletSolText)}</p></article>
<article><span class="wallet-label" dir="ltr">02 / EVM</span><h3 dir="ltr">${esc(c.walletEvm)}</h3><p>${esc(c.walletEvmText)}</p></article></div>
<aside class="rules-note"><h3>${esc(c.before)}</h3><p>${esc(c.beforeText)}</p><a href="${c.rulesPath}">${esc(c.rules+docSuffix)} ↗</a><p class="docs-language">${esc(c.docsNote)}</p></aside></section>
<section class="wrap bottom-grid"><article class="store"><p class="eyebrow">DAPP STORE</p><h2>${esc(c.store)}</h2><p>${esc(storeLive?storeAvailable:c.storeText)}</p>${storeLive?`<p>${esc(storeHelp)}</p><a href="${esc(r.storeUrl)}">${esc(storeOpen)} ↗</a>`:''}</article>
<article class="support"><p class="eyebrow">${esc(c.improveLabel)}</p><h2>${esc(c.support)}</h2><p>${esc(c.supportText)}</p><a href="mailto:welcome@devfridge.cool" dir="ltr">welcome@devfridge.cool ↗</a></article></section>
<section class="wrap integrity"><details><summary>${esc(c.verify)}</summary><dl><dt>${esc(c.file)}</dt><dd dir="ltr">${esc(r.file)}</dd><dt>${esc(c.size)}</dt><dd><bdi>${new Intl.NumberFormat(region.lang).format(r.bytes)} B</bdi></dd><dt>APK SHA-256</dt><dd dir="ltr"><code>${esc(r.sha256)}</code></dd><dt>${esc(c.cert)}</dt><dd dir="ltr"><code>${esc(r.certificateSha256)}</code></dd></dl><a href="/world/android/release.json">JSON</a> · <a href="${esc(r.releaseUrl)}">GitHub</a></details>
${c.changes?`<details><summary>${esc(c.changes)}</summary><p>${esc(c.changeText)}</p></details>`:''}</section></main>`);
}

function document(lang, kind) {
  const region = lang==='it' ? regions.find(p=>p.id==='it') : international;
  if (kind === 'privacy') {
    const policy = privacy[lang];
    const path = `/android/privacy${lang==='it'?'-it':''}`;
    const otherPath = `/android/privacy${lang==='it'?'':'-it'}`;
    const toc = policy.sections.map(([id,title])=>`<li><a href="#${id}">${esc(title.replace(/^\d+\.\s*/,''))}</a></li>`).join('');
    const sections = policy.sections.map(([id,title,paragraphs])=>`<section aria-labelledby="${id}"><h2 id="${id}">${esc(title)}</h2>${paragraphs.map(p=>`<p>${esc(p).replaceAll('welcome@devfridge.cool','<a href="mailto:welcome@devfridge.cool">welcome@devfridge.cool</a>')}</p>`).join('')}</section>`).join('');
    const providerLinks = privacyLinks.map(([label,href])=>`<li><a href="${href}" rel="external">${esc(label)}</a></li>`).join('');
    return shell(region,policy.title,path,`<main class="wrap document privacy-policy" id="main"><a href="${region.path}">← ${esc(copy[lang].back)}</a><p class="eyebrow">${esc(policy.updated)}</p><h1>${esc(policy.title)}</h1><p><a href="${otherPath}" lang="${lang==='it'?'en':'it'}">${lang==='it'?'Read in English':'Leggi in italiano'}</a> · <a href="/world/android/device-data-${lang}.txt">${lang==='it'?'Versione testo':'Plain text version'}</a></p><p class="doc-note">${esc(policy.intro)}</p><nav aria-label="${lang==='it'?'Indice privacy':'Privacy contents'}"><ol>${toc}</ol></nav>${sections}<section aria-labelledby="provider-links"><h2 id="provider-links">${esc(policy.linksTitle)}</h2><ul>${providerLinks}</ul></section></main>`,{legal:true});
  }
  const c = copy[lang], file = 'topshelf';
  const paragraphs = readFileSync(join(out,`${file}-${lang}.txt`),'utf8').split(/\r?\n\s*\r?\n/).filter(Boolean);
  return shell(region,c.rulesTitle,`/android/${kind}${lang==='it'?'-it':''}`,`<main class="wrap document" id="main"><a href="${region.path}">← ${esc(c.back)}</a><p class="eyebrow">${esc(c.updated)}</p><h1>${esc(c.rulesTitle)}</h1><p class="doc-note">${esc(c.docNote)}</p>${paragraphs.slice(2).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('')}</main>`,{legal:true});
}

mkdirSync(out,{recursive:true});
for (const [lang, policy] of Object.entries(privacy)) {
  const text = [policy.title, policy.updated, policy.intro, ...policy.sections.flatMap(([,title,paragraphs])=>[title,...paragraphs]), policy.linksTitle, ...privacyLinks.map(([label,url])=>`${label}: ${url}`)].join('\n\n')+'\n';
  writeFileSync(join(out,`device-data-${lang}.txt`),text);
}
for (const region of pages) writeFileSync(join(out,`${region.id}.html`),landing(region));
for (const lang of ['en','it']) for (const kind of ['privacy','rules']) writeFileSync(join(out,`${kind}${lang==='it'?'-it':''}.html`),document(lang,kind));
writeFileSync(join(out,'countries.json'), JSON.stringify({source:'https://superteam.fun/',checked:'2026-09-19',purpose:'Display language only; not a country eligibility list.',pages:pages.map(p=>({...p,language:languages[p.lang]}))},null,2)+'\n');
console.log(`Built ${pages.length} country/language pages in ${Object.keys(copy).length} languages and four legal pages. No client scripts or analytics.`);
