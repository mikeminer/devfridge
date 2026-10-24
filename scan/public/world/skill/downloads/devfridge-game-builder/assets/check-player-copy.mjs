#!/usr/bin/env node
// Dependency-free lexical guard, NOT a full JS/TS parser or proof of rendered copy.
// Scan dedicated UI/error modules plus DOM/screenshot assertions in the actual game.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCOPES = new Set(['general', 'pass', 'market', 'details', 'free-play']);
const ATTRIBUTES = /^(?:alt|title|aria-label|aria-description|placeholder|value|content|android:label|android:text|android:contentDescription)$/i;
const normalize = text => text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/[_-]+/g, ' ');
const rules = [
  ['mechanics', /\b(?:lock(?:s|ed|ing)?|unlock(?:s|ed|ing)?|time\s?lock(?:s|ed|ing)?|withdraw\w*|redeem\w*|redemption\w*|refund\w*)\b/i],
  ['brand', /\b(?:dev\s?fridge|fridge)\b/i],
  ['pasta', /\bpasta\b/i],
  ['pass-commerce', /\b(?:pay(?:ing|ment|ments|s)?|price(?:s|d)?|charg(?:e|es|ed|ing))\b/i],
  ['token-promise', /\b(?:earn(?:s|ed|ing)?|prize(?:s)?|reward(?:s|ed|ing)?|profit(?:s|ed|ing|able)?)\b/i],
  ['release-placeholder', /\b(?:prototype|dev\sfixture|todo|placeholder)\b/i],
];

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const value = Number.parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10);
      return value <= 0x10ffff ? String.fromCodePoint(value) : match;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity.toLowerCase()];
  });
}

function decodeJs(text) {
  return text.replace(/\\(?:u\{([0-9a-f]+)\}|u([0-9a-f]{4})|x([0-9a-f]{2})|([\s\S]))/gi, (match, wide, unicode, hex, other) => {
    if (wide || unicode || hex) {
      const value = Number.parseInt(wide || unicode || hex, 16);
      return value <= 0x10ffff ? String.fromCodePoint(value) : match;
    }
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', '\n': '', '\r': '' })[other] ?? other;
  });
}

function jsStrings(source, base = 0) {
  const tokens = [];
  let i = 0;
  function walk(untilBrace = false) {
    let depth = 0;
    while (i < source.length) {
      if (source.startsWith('//', i)) { i = source.indexOf('\n', i + 2); if (i < 0) i = source.length; continue; }
      if (source.startsWith('/*', i)) { const end = source.indexOf('*/', i + 2); i = end < 0 ? source.length : end + 2; continue; }
      const char = source[i];
      if (char === '}' && untilBrace && depth === 0) { i++; return; }
      if (char === '{') depth++;
      if (char === '}') depth--;
      if (char === '"' || char === "'") {
        const quote = char, start = ++i;
        while (i < source.length && source[i] !== quote) { if (source[i] === '\\') i++; i++; }
        const end = i; i++;
        const before = source.slice(Math.max(0, start - 80), start - 1);
        const after = source.slice(i).trimStart();
        // Object property names and static module specifiers are not player copy.
        const objectKey = after.startsWith(':') && /[{,]\s*$/.test(before);
        if (!objectKey && !/\b(?:from|import)\s*$/.test(before)) tokens.push({ text: decodeJs(source.slice(start, end)), offset: base + start });
        continue;
      }
      if (char === '`') {
        let start = ++i, pieces = [], first = start;
        while (i < source.length) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === '`') { pieces.push(source.slice(start, i)); i++; break; }
          if (source.startsWith('${', i)) {
            pieces.push(source.slice(start, i)); pieces.push(' '); i += 2; walk(true); start = i; continue;
          }
          i++;
        }
        tokens.push({ text: decodeJs(pieces.join('')), offset: base + first });
        continue;
      }
      // Regex literals are skipped in unambiguous expression-start contexts.
      // Ambiguous grammar is deliberately conservative and needs rendered-UI tests.
      if (char === '/' && /(?:^|[=(:,!&|?;{}\[]|\breturn)\s*$/.test(source.slice(Math.max(0, i - 12), i))) {
        i++; let inClass = false;
        while (i < source.length) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === '[') inClass = true;
          if (source[i] === ']') inClass = false;
          if (source[i] === '/' && !inClass) { i++; while (/[a-z]/i.test(source[i] ?? '') && i < source.length) i++; break; }
          if (source[i] === '\n') break;
          i++;
        }
        continue;
      }
      i++;
    }
  }
  walk();
  return tokens;
}

function markupStrings(source) {
  const tokens = [];
  const clean = source.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '));
  const tags = /<[^>]+>|([^<]+)/g;
  let suppressed = null;
  for (const match of clean.matchAll(tags)) {
    const value = match[0], offset = match.index;
    if (value.startsWith('<')) {
      if (/^<\/(script|style)\b/i.test(value)) { suppressed = null; continue; }
      if (/^<(script|style)\b/i.test(value)) { suppressed = value.match(/^<(\w+)/)[1].toLowerCase(); continue; }
      for (const attr of value.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
        if (ATTRIBUTES.test(attr[1])) tokens.push({ text: decodeEntities(attr[2] ?? attr[3] ?? attr[4]), offset: offset + attr.index });
      }
    } else if (!suppressed && value.trim() && !value.startsWith('{')) {
      tokens.push({ text: decodeEntities(value.replace(/\{[^{}]*\}/g, ' ')), offset });
    }
  }
  return tokens;
}

function jsxChildStrings(source, base = 0) {
  const tokens = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  let depth = 0, i = 0;
  function quotedEnd(start) {
    const quote = source[start];
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') { cursor += 2; continue; }
      if (source[cursor] === quote) return cursor + 1;
      if (quote === '`' && source.startsWith('${', cursor)) { cursor = expressionEnd(cursor + 1); continue; }
      cursor++;
    }
    return cursor;
  }
  function expressionEnd(start) {
    let cursor = start + 1, nesting = 1;
    while (cursor < source.length) {
      if (source.startsWith('//', cursor)) { const end = source.indexOf('\n', cursor + 2); cursor = end < 0 ? source.length : end; continue; }
      if (source.startsWith('/*', cursor)) { const end = source.indexOf('*/', cursor + 2); cursor = end < 0 ? source.length : end + 2; continue; }
      const char = source[cursor];
      if (char === '"' || char === "'" || char === '`') { cursor = quotedEnd(cursor); continue; }
      if (char === '{') nesting++;
      if (char === '}') { nesting--; if (nesting === 0) return cursor + 1; }
      cursor++;
    }
    return cursor;
  }
  function tagAt(start) {
    const prefix = source.slice(start).match(/^<(\/)?([A-Za-z][\w.:-]*|(?=>))/);
    if (!prefix) return null;
    let cursor = start + prefix[0].length;
    while (cursor < source.length) {
      const char = source[cursor];
      if (char === '"' || char === "'") { cursor = quotedEnd(cursor); continue; }
      if (char === '{') { cursor = expressionEnd(cursor); continue; }
      if (char === '>') return { end: cursor + 1, closing: Boolean(prefix[1]), selfClosing: source[cursor - 1] === '/' || voidTags.has(prefix[2].toLowerCase()) };
      if (char === '<') return null;
      cursor++;
    }
    return null;
  }
  while (i < source.length) {
    if (source[i] === '<') {
      const tag = tagAt(i);
      if (tag) {
        depth = tag.closing ? Math.max(0, depth - 1) : tag.selfClosing ? depth : depth + 1;
        i = tag.end; continue;
      }
    }
    if (depth > 0) {
      if (source[i] === '{') {
        const end = expressionEnd(i);
        // A condition/interpolation may contain more JSX; inspect that subtree too.
        tokens.push(...jsxChildStrings(source.slice(i + 1, end - 1), base + i + 1));
        i = end; continue;
      }
      const start = i++;
      while (i < source.length && source[i] !== '<' && source[i] !== '{') i++;
      if (source.slice(start, i).trim()) tokens.push({ text: decodeEntities(source.slice(start, i)), offset: base + start });
    } else {
      if (source.startsWith('//', i)) { const end = source.indexOf('\n', i + 2); i = end < 0 ? source.length : end; continue; }
      if (source.startsWith('/*', i)) { const end = source.indexOf('*/', i + 2); i = end < 0 ? source.length : end + 2; continue; }
      if (source[i] === '"' || source[i] === "'" || source[i] === '`') i = quotedEnd(i);
      else i++;
    }
  }
  return tokens;
}

function markdownStrings(source, defaultScope) {
  const tokens = [];
  const blocks = /^```player-copy(?:\/|:)(general|pass|market|details|free-play)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
  for (const match of source.matchAll(blocks)) tokens.push({ text: match[2], scope: match[1] ?? defaultScope, offset: match.index + match[0].indexOf('\n') + 1 });
  return tokens;
}

function permitted(finding, allowlist) {
  return allowlist.some(entry => {
    if (!entry || typeof entry.reason !== 'string' || !entry.reason.trim() || typeof entry.text !== 'string' || !entry.text || entry.text.length > 512) return false;
    if (entry.file !== finding.file || entry.scope !== finding.scope || entry.text !== finding.text || !Array.isArray(entry.rules) || !entry.rules.includes(finding.rule)) return false;
    // Brand exemptions are confined to an explicitly opted-in Free Play sponsor card.
    if (finding.rule === 'brand' && finding.scope !== 'free-play') return false;
    return true;
  });
}

/** Returns findings; exact allowlists are code-review inputs, never generated from findings. */
export function scanPlayerCopy(source, { file = 'copy.txt', scope = 'general', format = path.extname(file).slice(1), allowlist = [], dist = false, tokenContext = false, release = true } = {}) {
  if (!SCOPES.has(scope) || typeof source !== 'string') throw Error('Invalid copy scan input');
  const findings = [];
  const position = offset => { const before = source.slice(0, offset).split('\n'); return { line: before.length, column: before.at(-1).length + 1 }; };
  let tokens;
  if (format === 'md') tokens = markdownStrings(source, scope);
  else if (['html', 'xml'].includes(format)) {
    tokens = markupStrings(source);
    if (format === 'html') for (const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) tokens.push(...jsStrings(script[1], script.index + script[0].indexOf('>') + 1));
  } else if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'json', 'kt', 'java'].includes(format)) {
    tokens = jsStrings(source);
    if (['jsx', 'tsx'].includes(format)) {
      // Keep text around expression containers; {icon} must not hide adjacent copy.
      tokens.push(...jsxChildStrings(source));
    }
  } else tokens = [{ text: source, offset: 0 }];
  for (const token of tokens) {
    const tokenScope = token.scope ?? scope;
    const text = normalize(token.text);
    for (const [rule, pattern] of rules) {
      if (rule === 'pasta' && tokenScope === 'details') continue;
      if (rule === 'pass-commerce' && !['pass', 'details'].includes(tokenScope)) continue;
      if (rule === 'token-promise' && !tokenContext && !['pass', 'market', 'details'].includes(tokenScope)) continue;
      if (rule === 'release-placeholder' && !release) continue;
      if (dist && rule !== 'brand' && rule !== 'release-placeholder') continue;
      if (!pattern.test(text)) continue;
      const finding = { file, scope: tokenScope, rule, text: token.text, ...position(token.offset) };
      if (!permitted(finding, allowlist)) findings.push(finding);
    }
  }
  if (dist) {
    // Catch identifiers and URL literals as well as text. A whole-file exemption is impossible.
    for (const match of source.matchAll(/devfridge/gi)) {
      let allowed = false;
      if (scope === 'free-play') for (const entry of allowlist) {
        if (!entry || entry.file !== file || entry.scope !== 'free-play' || !entry.rules?.includes('brand') || !entry.reason?.trim() || typeof entry.text !== 'string' || !entry.text || entry.text.length > 512) continue;
        let start = source.indexOf(entry.text);
        while (start >= 0) {
          if (match.index >= start && match.index + match[0].length <= start + entry.text.length) allowed = true;
          start = source.indexOf(entry.text, start + 1);
        }
      }
      if (!allowed) findings.push({ file, scope, rule: 'brand', text: match[0], ...position(match.index) });
    }
  }
  const unique = new Map(findings.map(item => [`${item.file}:${item.line}:${item.column}:${item.rule}`, item]));
  return [...unique.values()];
}

function filesAt(target) {
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink() || ['node_modules', '.git'].includes(entry.name)) return [];
    const full = path.join(target, entry.name);
    return entry.isDirectory() ? filesAt(full) : /\.(?:m?[jt]sx?|cjs|html|xml|md|json|kt|java|txt)$/i.test(entry.name) ? [full] : [];
  });
}

function main(args) {
  if (!args.length || args.includes('--help')) {
    console.log('Usage: node check-player-copy.mjs PATH... [--scope general|pass|market|details|free-play] [--dist] [--config CONFIG.json]');
    console.log('Config: { allowlist:[{file,scope,text,rules,reason}], tokenContext:false }. File paths are relative to cwd with / separators. Markdown scans only ```player-copy/<scope> fences.');
    return;
  }
  const targets = []; let scope = 'general', dist = false, config = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scope') scope = args[++i];
    else if (args[i] === '--dist') dist = true;
    else if (args[i] === '--config') config = JSON.parse(fs.readFileSync(args[++i], 'utf8'));
    else if (args[i].startsWith('--')) throw Error('Unknown option');
    else targets.push(args[i]);
  }
  if (!targets.length || !SCOPES.has(scope)) throw Error('Provide paths and a valid scope');
  let count = 0, scanned = 0;
  for (const target of targets) for (const filename of filesAt(target)) {
    scanned++;
    const file = path.relative(process.cwd(), filename).replaceAll('\\', '/');
    const findings = scanPlayerCopy(fs.readFileSync(filename, 'utf8'), { ...config, file, scope, dist });
    for (const finding of findings) console.log(`${finding.file}:${finding.line}:${finding.column} ${finding.rule} (${finding.scope})`);
    count += findings.length;
  }
  console.log(`Player copy: ${scanned} files, ${count} findings. Lexical check; rendered UI and translations still require review.`);
  if (count) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
