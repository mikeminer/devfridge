import { isIP } from 'node:net';
import { createPublicKey, verify } from 'node:crypto';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const METHODS = Object.freeze([
  'getAccountInfo', 'getMultipleAccounts', 'getProgramAccounts', 'getTokenAccountsByOwner',
  'getTokenAccountBalance', 'getBalance', 'getLatestBlockhash', 'getBlockHeight', 'getSlot',
  'getGenesisHash', 'isBlockhashValid', 'getSignatureStatuses', 'getTransaction',
  'getSignaturesForAddress', 'getMinimumBalanceForRentExemption', 'getFeeForMessage',
  'simulateTransaction', 'sendTransaction',
]);
export const READ_METHODS = METHODS.filter(method => !['simulateTransaction', 'sendTransaction'].includes(method));
export class PolicyError extends Error {
  constructor(code = -32602, message = 'Request parameters are not permitted.') { super(message); this.code = code; }
}
const fail = () => { throw new PolicyError(); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, allowed) { if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(); return value; }
function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) { if (!Number.isSafeInteger(value) || value < min || value > max) fail(); return value; }
function bool(value) { if (typeof value !== 'boolean') fail(); return value; }
export function base58Encode(bytes) {
  let number = 0n; for (const byte of bytes) number = number * 256n + BigInt(byte);
  let value = ''; while (number) { value = ALPHABET[Number(number % 58n)] + value; number /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; value = '1' + value; }
  return value;
}
export function base58Bytes(value, length = 32) {
  if (typeof value !== 'string' || !value.length || value.length > Math.ceil(length * 1.38)) fail();
  let number = 0n;
  for (const character of value) { const index = ALPHABET.indexOf(character); if (index < 0) fail(); number = number * 58n + BigInt(index); }
  const bytes = []; while (number) { bytes.unshift(Number(number & 255n)); number >>= 8n; }
  for (const character of value) { if (character !== '1') break; bytes.unshift(0); }
  if (bytes.length !== length) fail();
  return Buffer.from(bytes);
}
const address = value => { base58Bytes(value); return value; };
const signature = value => { base58Bytes(value, 64); return value; };
function base64(value, maxBytes = 1232) {
  if (typeof value !== 'string' || !value.length || value.length > Math.ceil(maxBytes / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail();
  const decoded = Buffer.from(value, 'base64');
  if (!decoded.length || decoded.length > maxBytes || decoded.toString('base64') !== value) fail();
  return decoded;
}
const split = value => String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);
function setting(env, name, fallback, min, max) {
  const value = env[name] === undefined || env[name] === '' ? fallback : Number(env[name]);
  try { return integer(value, min, max); } catch { throw Error(`Invalid ${name} configuration.`); }
}
function toggle(env, name, fallback = false) {
  if (env[name] === undefined || env[name] === '') return fallback;
  if (!['true', 'false'].includes(env[name])) throw Error(`Invalid ${name} configuration.`);
  return env[name] === 'true';
}
export function canonicalIp(value) {
  if (typeof value !== 'string' || !isIP(value) || value.includes('%')) return null;
  if (value.toLowerCase().startsWith('::ffff:') && isIP(value.slice(7)) === 4) return value.slice(7);
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  // URL canonicalization represents IPv4-mapped addresses as hexadecimal.
  const pieces = canonical.split('::');
  const left = pieces[0] ? pieces[0].split(':') : [];
  const right = pieces[1] ? pieces[1].split(':') : [];
  const expanded = pieces.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  if (expanded.length !== 8) return null;
  const words = expanded.map(word => Number.parseInt(word, 16));
  if (words.slice(0, 5).every(word => word === 0) && words[5] === 65535) return `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
  return words.map(word => word.toString(16).padStart(4, '0')).join(':');
}
export function ipQuotaKey(ip) { const canonical = canonicalIp(ip); return canonical?.includes(':') ? `v6:${canonical.split(':').slice(0, 4).join(':')}` : canonical; }

export function readConfig(env = process.env) {
  let upstream;
  try {
    upstream = new URL(env.RPC_UPSTREAM_URL);
    if (upstream.protocol !== 'https:' || upstream.username || upstream.password || upstream.hash || isIP(upstream.hostname.replace(/^\[|\]$/g, '')) || /(^localhost$|\.(?:localhost|local|internal)$)/i.test(upstream.hostname)) throw Error();
  } catch { throw Error('Set a valid fixed HTTPS RPC_UPSTREAM_URL in server-only configuration.'); }
  const allowHttpOrigins = toggle(env, 'RPC_ALLOW_HTTP_LOCAL_ORIGINS');
  const origins = new Set(split(env.RPC_ALLOWED_ORIGINS));
  for (const origin of origins) {
    let url; try { url = new URL(origin); } catch { throw Error('Invalid RPC_ALLOWED_ORIGINS configuration.'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.origin !== origin || url.username || url.password || (url.protocol !== 'https:' && !(allowHttpOrigins && local && url.protocol === 'http:'))) throw Error('Use exact HTTPS origins in RPC_ALLOWED_ORIGINS.');
  }
  const allowNative = toggle(env, 'RPC_ALLOW_NO_ORIGIN');
  if (!origins.size && !allowNative) throw Error('Configure an allowed browser origin or explicitly enable native no-Origin access.');
  const trustedProxies = new Set(split(env.RPC_TRUST_PROXY_IPS).map(value => { const ip = canonicalIp(value); if (!ip) throw Error('Invalid RPC_TRUST_PROXY_IPS configuration.'); return ip; }));
  const enabled = new Set(env.RPC_METHODS ? split(env.RPC_METHODS) : READ_METHODS);
  if ([...enabled].some(method => !METHODS.includes(method))) throw Error('Unknown RPC_METHODS configuration.');
  const allowSend = toggle(env, 'RPC_ENABLE_SEND');
  const allowSimulation = toggle(env, 'RPC_ENABLE_SIMULATION');
  if (allowSend) enabled.add('sendTransaction'); else enabled.delete('sendTransaction');
  if (allowSimulation) enabled.add('simulateTransaction'); else enabled.delete('simulateTransaction');
  const nativeMethods = new Set(env.RPC_NATIVE_METHODS ? split(env.RPC_NATIVE_METHODS) : READ_METHODS);
  if ([...nativeMethods].some(method => !METHODS.includes(method))) throw Error('Unknown RPC_NATIVE_METHODS configuration.');
  let gpaRules;
  try {
    gpaRules = JSON.parse(env.RPC_GPA_RULES || '[]');
    if (!Array.isArray(gpaRules) || gpaRules.length > 8) fail();
    for (const rule of gpaRules) {
      keys(rule, ['programId', 'mint', 'dataSize', 'discriminatorHex', 'depositorOffset', 'mintOffset']);
      address(rule.programId); address(rule.mint); integer(rule.dataSize, 72, 16384);
      if (typeof rule.discriminatorHex !== 'string' || !/^[0-9a-f]{16}$/i.test(rule.discriminatorHex)) fail();
      integer(rule.depositorOffset, 8, rule.dataSize - 32); integer(rule.mintOffset, 8, rule.dataSize - 32);
      if (Math.abs(rule.depositorOffset - rule.mintOffset) < 32) fail();
      rule.discriminator = base58Encode(Buffer.from(rule.discriminatorHex, 'hex'));
    }
  } catch { throw Error('Invalid fixed RPC_GPA_RULES configuration.'); }
  const tokenMints = new Set([...split(env.RPC_TOKEN_MINTS), ...gpaRules.map(rule => rule.mint)]);
  const txPrograms = new Set(split(env.RPC_TX_PROGRAM_IDS));
  const requiredTxPrograms = new Set(split(env.RPC_REQUIRED_TX_PROGRAM_IDS));
  try { for (const pubkey of [...tokenMints, ...txPrograms, ...requiredTxPrograms]) address(pubkey); } catch { throw Error('Invalid configured mint or transaction program.'); }
  if ((allowSend || allowSimulation) && (!requiredTxPrograms.size || !txPrograms.size || [...requiredTxPrograms].some(id => !txPrograms.has(id)))) throw Error('Transaction methods require explicit allowed and required program IDs.');
  return Object.freeze({
    upstream: upstream.href, origins, allowNative, trustedProxies, enabled, nativeMethods, gpaRules, tokenMints, txPrograms, requiredTxPrograms,
    host: env.HOST || '127.0.0.1', port: setting(env, 'PORT', 8787, 1, 65535),
    maxBodyBytes: setting(env, 'RPC_MAX_BODY_BYTES', 32768, 1024, 262144),
    maxResponseBytes: setting(env, 'RPC_MAX_RESPONSE_BYTES', 1048576, 1024, 4194304),
    maxBatch: setting(env, 'RPC_MAX_BATCH', 5, 1, 10),
    requestTimeoutMs: setting(env, 'RPC_REQUEST_TIMEOUT_MS', 5000, 100, 15000),
    upstreamTimeoutMs: setting(env, 'RPC_UPSTREAM_TIMEOUT_MS', 6000, 100, 15000),
    ipRate: setting(env, 'RPC_IP_UNITS_PER_MINUTE', 60, 1, 100000),
    ipBurst: setting(env, 'RPC_IP_BURST_UNITS', 30, 1, 100000),
    globalRate: setting(env, 'RPC_GLOBAL_UNITS_PER_MINUTE', 600, 1, 1000000),
    globalBurst: setting(env, 'RPC_GLOBAL_BURST_UNITS', 100, 1, 1000000),
    maxRequests: setting(env, 'RPC_MAX_REQUESTS', 24, 1, 1000),
    maxRequestsPerIp: setting(env, 'RPC_MAX_REQUESTS_PER_IP', 4, 1, 100),
    maxUpstream: setting(env, 'RPC_MAX_UPSTREAM', 24, 1, 1000),
    maxUpstreamPerIp: setting(env, 'RPC_MAX_UPSTREAM_PER_IP', 8, 1, 100),
    maxIpEntries: setting(env, 'RPC_MAX_IP_ENTRIES', 10000, 10, 100000),
  });
}

function readOptions(value = {}, extra = []) {
  keys(value, ['commitment', 'minContextSlot', ...extra]);
  const result = { ...value, commitment: value.commitment ?? 'confirmed' };
  if (!['confirmed', 'finalized'].includes(result.commitment)) fail();
  if (result.minContextSlot !== undefined) integer(result.minContextSlot);
  if (extra.includes('encoding')) { if (value.encoding !== undefined && value.encoding !== 'base64') fail(); result.encoding = 'base64'; }
  return result;
}
function count(params, min, max = min) { if (params.length < min || params.length > max) fail(); }
function list(values, max, mapper) { if (!Array.isArray(values) || !values.length || values.length > max) fail(); return values.map(mapper); }

/** Bounded legacy/v0 static-account decoder, not a game-intent/payment validator. LUTs denied. */
export function validateTransaction(encoded, config, requireSignatures) {
  const bytes = base64(encoded); let offset = 0;
  const byte = () => { if (offset >= bytes.length) fail(); return bytes[offset++]; };
  const take = size => { if (size < 0 || offset + size > bytes.length) fail(); const out = bytes.subarray(offset, offset + size); offset += size; return out; };
  const short = () => { let value = 0, shift = 0; for (let i = 0; i < 3; i++) { const next = byte(); value |= (next & 127) << shift; if (!(next & 128)) { if (i > 0 && next === 0) fail(); return value; } shift += 7; } fail(); };
  const signatures = integer(short(), 1, 8); const sigs = Array.from({ length: signatures }, () => take(64));
  const messageStart = offset; const first = byte(); const versioned = (first & 128) !== 0;
  if (versioned && first !== 128) fail();
  const required = versioned ? byte() : first; const readOnlySigned = byte(), readOnlyUnsigned = byte();
  const accountCount = integer(short(), 1, 64);
  if (required !== signatures || required > accountCount || readOnlySigned >= required || readOnlyUnsigned > accountCount - required) fail();
  const accounts = Array.from({ length: accountCount }, () => take(32)); take(32);
  const instructionCount = integer(short(), 1, 16); let hasRequiredProgram = false;
  for (let i = 0; i < instructionCount; i++) {
    const programIndex = byte(); if (programIndex >= accountCount || programIndex < required) fail();
    const program = base58Encode(accounts[programIndex]); if (!config.txPrograms.has(program)) fail();
    if (config.requiredTxPrograms.has(program)) hasRequiredProgram = true;
    const indexes = take(integer(short(), 0, 64)); for (const index of indexes) if (index >= accountCount) fail();
    take(integer(short(), 0, 1232));
  }
  if (versioned && short() !== 0) fail();
  if (offset !== bytes.length || !hasRequiredProgram) fail();
  if (requireSignatures) for (let i = 0; i < signatures; i++) {
    const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), accounts[i]]), format: 'der', type: 'spki' });
    if (!verify(null, bytes.subarray(messageStart), key, sigs[i])) fail();
  }
  return bytes;
}

export function validateCall(call, config, native = false) {
  keys(call, ['jsonrpc', 'id', 'method', 'params']);
  if (call.jsonrpc !== '2.0' || !(Number.isSafeInteger(call.id) || (typeof call.id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(call.id)))) throw new PolicyError(-32600, 'A bounded JSON-RPC request ID is required.');
  if (!config.enabled.has(call.method) || (native && !config.nativeMethods.has(call.method))) throw new PolicyError(-32601, 'RPC method is not enabled.');
  const params = call.params ?? []; if (!Array.isArray(params)) fail(); let out;
  switch (call.method) {
    case 'getAccountInfo': count(params, 1, 2); out = [address(params[0]), readOptions(params[1], ['encoding'])]; break;
    case 'getMultipleAccounts': count(params, 1, 2); out = [list(params[0], 64, address), readOptions(params[1], ['encoding'])]; break;
    case 'getProgramAccounts': {
      count(params, 2); address(params[0]); const options = readOptions(params[1], ['encoding', 'filters', 'withContext']);
      if (options.withContext !== undefined) bool(options.withContext);
      if (!Array.isArray(options.filters) || options.filters.length !== 4) fail();
      let accepted = false;
      for (const rule of config.gpaRules.filter(item => item.programId === params[0])) {
        try {
          const size = options.filters.filter(item => object(item) && Object.keys(item).length === 1 && item.dataSize === rule.dataSize);
          const memcmps = options.filters.filter(item => object(item) && Object.keys(item).length === 1 && object(item.memcmp)).map(item => keys(item.memcmp, ['offset', 'bytes', 'encoding']));
          if (size.length !== 1 || memcmps.length !== 3 || new Set(memcmps.map(item => item.offset)).size !== 3) continue;
          if (memcmps.some(item => item.encoding !== undefined && item.encoding !== 'base58')) continue;
          const disc = memcmps.find(item => item.offset === 0), owner = memcmps.find(item => item.offset === rule.depositorOffset), mint = memcmps.find(item => item.offset === rule.mintOffset);
          if (!disc || !owner || !mint || disc.bytes !== rule.discriminator || mint.bytes !== rule.mint) continue;
          address(owner.bytes); accepted = true; break;
        } catch { /* Try only another explicitly configured bounded rule. */ }
      }
      if (!accepted) fail(); out = [params[0], options]; break;
    }
    case 'getTokenAccountsByOwner': {
      count(params, 2, 3); keys(params[1], ['mint']); if (!config.tokenMints.has(params[1].mint)) fail();
      out = [address(params[0]), { mint: address(params[1].mint) }, readOptions(params[2], ['encoding'])]; break;
    }
    case 'getTokenAccountBalance': case 'getBalance': case 'isBlockhashValid': count(params, 1, 2); out = [address(params[0]), readOptions(params[1])]; break;
    case 'getLatestBlockhash': case 'getBlockHeight': case 'getSlot': count(params, 0, 1); out = [readOptions(params[0])]; break;
    case 'getGenesisHash': count(params, 0); out = []; break;
    case 'getMinimumBalanceForRentExemption': count(params, 1, 2); out = [integer(params[0], 0, 16384), readOptions(params[1])]; break;
    case 'getFeeForMessage': count(params, 1, 2); base64(params[0]); out = [params[0], readOptions(params[1])]; break;
    case 'getSignatureStatuses': {
      count(params, 1, 2); const options = keys(params[1] ?? {}, ['searchTransactionHistory']);
      if (options.searchTransactionHistory !== undefined) bool(options.searchTransactionHistory);
      out = [list(params[0], 20, signature), options]; break;
    }
    case 'getTransaction': {
      count(params, 1, 2); keys(params[1] ?? {}, ['commitment', 'minContextSlot', 'encoding', 'maxSupportedTransactionVersion']);
      const { encoding, ...rest } = params[1] ?? {}; const options = readOptions(rest, ['maxSupportedTransactionVersion']);
      // Instruction/account verification needs JSON; accept only known transaction versions.
      if (encoding !== undefined && !['json', 'base64'].includes(encoding)) fail();
      options.encoding = encoding ?? 'json';
      if (options.maxSupportedTransactionVersion !== undefined && options.maxSupportedTransactionVersion !== 0) fail();
      options.maxSupportedTransactionVersion = 0; out = [signature(params[0]), options]; break;
    }
    case 'getSignaturesForAddress': {
      count(params, 1, 2); const options = readOptions(params[1], ['limit', 'before', 'until']);
      options.limit = integer(options.limit ?? 20, 1, 100);
      if (options.before !== undefined) signature(options.before); if (options.until !== undefined) signature(options.until);
      out = [address(params[0]), options]; break;
    }
    case 'simulateTransaction': {
      count(params, 1, 2); const options = readOptions(params[1], ['encoding', 'sigVerify', 'replaceRecentBlockhash', 'accounts', 'innerInstructions']);
      options.sigVerify = options.sigVerify === undefined ? false : bool(options.sigVerify);
      options.replaceRecentBlockhash = options.replaceRecentBlockhash === undefined ? !options.sigVerify : bool(options.replaceRecentBlockhash);
      if (options.sigVerify && options.replaceRecentBlockhash) fail();
      if (options.innerInstructions !== undefined && options.innerInstructions !== false) fail();
      if (options.accounts !== undefined) { keys(options.accounts, ['encoding', 'addresses']); if (options.accounts.encoding !== 'base64') fail(); list(options.accounts.addresses, 10, address); }
      validateTransaction(params[0], config, options.sigVerify); out = [params[0], options]; break;
    }
    case 'sendTransaction': {
      count(params, 1, 2); const options = keys(params[1] ?? {}, ['encoding', 'skipPreflight', 'preflightCommitment', 'maxRetries', 'minContextSlot']);
      if ((options.encoding !== undefined && options.encoding !== 'base64') || (options.skipPreflight !== undefined && options.skipPreflight !== false)) fail();
      if (!['confirmed', 'finalized'].includes(options.preflightCommitment ?? 'confirmed')) fail();
      if (options.minContextSlot !== undefined) integer(options.minContextSlot);
      validateTransaction(params[0], config, true);
      out = [params[0], { ...options, encoding: 'base64', skipPreflight: false, preflightCommitment: options.preflightCommitment ?? 'confirmed', maxRetries: integer(options.maxRetries ?? 0, 0, 2) }]; break;
    }
    default: throw new PolicyError(-32601, 'RPC method is not enabled.');
  }
  const cost = ['getProgramAccounts', 'simulateTransaction', 'sendTransaction'].includes(call.method) ? 10 : ['getTransaction', 'getSignaturesForAddress'].includes(call.method) ? 5 : 1;
  return { request: { jsonrpc: '2.0', id: call.id, method: call.method, params: out }, cost };
}
