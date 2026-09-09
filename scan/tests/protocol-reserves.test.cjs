const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } = require('@solana/spl-token');
const { RESERVE_PROGRAMS: P, curveAddress, raydiumAuthority, decodeReserveState, collectProtocolReserves } = require('../lib/protocol-reserves.ts');
const key = n => new PublicKey(Buffer.alloc(32, n));
const mint = key(1).toBase58(), quote = key(2).toBase58();
const disc = name => createHash('sha256').update('account:' + name).digest().subarray(0, 8);
const at = (d, offset, address) => new PublicKey(address).toBuffer().copy(d, offset);
const raw = (owner, d) => ({ owner, executable: false, data: [d.toString('base64'), 'base64'] });
const tokenRow = (pubkey, owner, program = TOKEN_PROGRAM_ID) => {
  const d = Buffer.alloc(165); at(d, 0, mint); at(d, 32, owner); d.writeBigUInt64LE(900n, 64); d[108] = 1;
  return { pubkey, account: raw(program.toBase58(), d) };
};
function curve(program, complete = false) {
  const address = curveAddress(mint), d = Buffer.alloc(115); disc('BondingCurve').copy(d); d[48] = +complete;
  d.writeBigUInt64LE(999999999999n, 8); // Synthetic reserves must not be used as balances.
  const vault = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(address), true, program).toBase58();
  return { address, vault, authority: address, account: raw(P.pump, d), program };
}
function pump(side = 0, program = TOKEN_PROGRAM_ID) {
  const d = Buffer.alloc(301); disc('Pool').copy(d); d.writeUInt16LE(7, 9); at(d, 11, key(3));
  at(d, 43, side ? quote : mint); at(d, 75, side ? mint : quote);
  const [address, bump] = PublicKey.findProgramAddressSync([Buffer.from('pool'), d.subarray(9, 11), d.subarray(11, 43), d.subarray(43, 75), d.subarray(75, 107)], new PublicKey(P.pumpswap)); d[8] = bump;
  const vault = getAssociatedTokenAddressSync(new PublicKey(mint), address, true, program).toBase58(); at(d, side ? 171 : 139, vault);
  return { address: address.toBase58(), vault, authority: address.toBase58(), account: raw(P.pumpswap, d), program };
}
function ray(kind, side = 0) {
  const program = kind === 'v4' ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
  const address = PublicKey.findProgramAddressSync([Buffer.from(kind)], key(40))[0].toBase58();
  let d, owner, authority, vault;
  if (kind === 'v4') {
    d = Buffer.alloc(752); owner = P.raydiumV4;
    const [a, bump] = raydiumAuthority(); authority = a.toBase58(); d.writeBigUInt64LE(6n); d.writeBigUInt64LE(BigInt(bump), 8);
    at(d, 400, side ? quote : mint); at(d, 432, side ? mint : quote); vault = key(50 + side).toBase58(); at(d, side ? 368 : 336, vault);
  } else {
    d = Buffer.alloc(kind === 'cpmm' ? 637 : 1544); disc('PoolState').copy(d);
    owner = kind === 'cpmm' ? P.raydiumCpmm : P.raydiumClmm;
    vault = PublicKey.findProgramAddressSync([Buffer.from('pool_vault'), new PublicKey(address).toBuffer(), new PublicKey(mint).toBuffer()], new PublicKey(owner))[0].toBase58();
    if (kind === 'cpmm') {
      const [a, bump] = raydiumAuthority(true); authority = a.toBase58(); d[328] = bump;
      at(d, 168, side ? quote : mint); at(d, 200, side ? mint : quote); at(d, 72 + side * 32, vault); at(d, 232 + side * 32, program);
    } else {
      authority = address; at(d, 73, side ? quote : mint); at(d, 105, side ? mint : quote); at(d, side ? 169 : 137, vault);
    }
  }
  return { address, vault, authority, account: raw(owner, d), program };
}
for (const program of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) for (const complete of [false, true]) test(`curve ${program === TOKEN_PROGRAM_ID ? 'SPL' : '2022'} complete=${complete} derives real token vault`, () => {
  const f = curve(program, complete), r = decodeReserveState(f.address, f.account, mint, program.toBase58());
  assert.equal(r[0].vault, f.vault); assert.equal(r[0].protocol, 'pump_curve');
});
for (const side of [0, 1]) for (const program of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) test(`secondary PumpSwap pool arbitrary quote and mint side ${side}, ${program}`, () => {
  const f = pump(side, program), r = decodeReserveState(f.address, f.account, mint, program.toBase58());
  assert.equal(r[0].vault, f.vault); assert.equal(r[0].authority, f.address);
});
for (const kind of ['v4', 'cpmm', 'clmm']) for (const side of [0, 1]) test(`Raydium ${kind} side ${side} verifies reserve`, async () => {
  const f = ray(kind, side), r = decodeReserveState(f.address, f.account, mint, f.program.toBase58());
  assert.equal(r[0].vault, f.vault); assert.equal(r[0].authority, f.authority);
  const snapshot = { context: { slot: 10 }, value: [tokenRow(f.vault, f.authority, f.program)] };
  const result = await collectProtocolReserves(async (method, params) => {
    if (method === 'getMultipleAccounts') return { context: { slot: 11 }, value: params[0].map(a => a === f.address ? f.account : null) };
    assert.equal(method, 'getProgramAccounts');
    return { context: { slot: 11 }, value: [{ pubkey: f.address, account: f.account }] };
  }, snapshot, mint, f.program.toBase58(), []);
  assert.equal(result.reserves.length, 1); // Base/quote query duplicate is not double-counted.
});
test('bonding curve discovery verifies stage, uses real balance and ignores unrelated wallets', async () => {
  const f = curve(TOKEN_2022_PROGRAM_ID), snapshot = { context: { slot: 10 }, value: [tokenRow(f.vault, f.authority, f.program)] };
  const r = await collectProtocolReserves(async (_, params) => ({ context: { slot: 11 }, value: params[0].map(a => a === f.address ? f.account : null) }), snapshot, mint, f.program.toBase58(), []);
  assert.equal(r.pumpStage, 'bonding_curve'); assert.equal(r.reserves[0].vault, f.vault);
});
for (const [name, make, mutate] of [
  ['curve discriminator', () => curve(TOKEN_PROGRAM_ID), d => d[0] ^= 1],
  ['curve completion flag', () => curve(TOKEN_PROGRAM_ID), d => d[48] = 2],
  ['PumpSwap bump', pump, d => d[8] ^= 1],
  ['PumpSwap vault', pump, d => at(d, 139, key(80))],
  ['Raydium V4 nonce', () => ray('v4'), d => d[8] ^= 1],
  ['CPMM authority', () => ray('cpmm'), d => d[328] ^= 1],
  ['CLMM vault', () => ray('clmm'), d => at(d, 137, key(80))],
]) test(`rejects malformed ${name}`, () => {
  const f = make(), d = Buffer.from(f.account.data[0], 'base64'); mutate(d); f.account.data[0] = d.toString('base64');
  assert.throws(() => decodeReserveState(f.address, f.account, mint, f.program.toBase58()));
});
test('lookalike pool owned by an unknown program is never excluded', () => {
  const f = pump(); f.account.owner = key(70).toBase58();
  assert.deepEqual(decodeReserveState(f.address, f.account, mint, f.program.toBase58()), []);
});
test('truncated protocol lookup and RPC failures reject classification', async () => {
  const f = curve(TOKEN_PROGRAM_ID), snapshot = { context: { slot: 10 }, value: [tokenRow(f.vault, f.authority)] };
  await assert.rejects(collectProtocolReserves(async () => ({ context: { slot: 10 }, value: [] }), snapshot, mint, f.program.toBase58(), []));
  await assert.rejects(collectProtocolReserves(async () => { throw Error('outage'); }, snapshot, mint, f.program.toBase58(), []));
});
test('unmapped shared Raydium custody stays explicit and is never called a verified pool', async () => {
  const f = ray('v4'), snapshot = { context: { slot: 10 }, value: [tokenRow(f.vault, f.authority)] };
  const r = await collectProtocolReserves(async (method, params) => ({ context: { slot: 10 }, value: method === 'getMultipleAccounts' ? params[0].map(() => null) : [] }), snapshot, mint, f.program.toBase58(), []);
  assert.deepEqual(r.unclassifiedCustody, [f.vault]); assert.equal(r.reserves.length, 0);
});


for (const side of [0, 1]) for (const kind of ['orca', 'dlmm']) test(`${kind} reserve validates mint side ${side} and authority`, async () => {
  const owner = kind === 'orca' ? P.orca : P.meteoraDlmm;
  const d = Buffer.alloc(kind === 'orca' ? 653 : 904); disc(kind === 'orca' ? 'Whirlpool' : 'LbPair').copy(d);
  let address, vault;
  if (kind === 'orca') {
    at(d, 8, key(44)); at(d, 101, side ? quote : mint); at(d, 181, side ? mint : quote); d.writeUInt16LE(64, 43);
    const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('whirlpool'), d.subarray(8,40), d.subarray(101,133), d.subarray(181,213), d.subarray(43,45)], new PublicKey(owner));
    address = pda.toBase58(); d[40] = bump; vault = key(56).toBase58(); at(d, side ? 213 : 133, vault);
  } else {
    address = PublicKey.findProgramAddressSync([Buffer.from('test-lb-pair')], new PublicKey(owner))[0].toBase58();
    at(d, 88, side ? quote : mint); at(d, 120, side ? mint : quote);
    vault = PublicKey.findProgramAddressSync([new PublicKey(address).toBuffer(), new PublicKey(mint).toBuffer()], new PublicKey(owner))[0].toBase58(); at(d, side ? 184 : 152, vault);
  }
  const account = raw(owner, d), r = decodeReserveState(address, account, mint, TOKEN_PROGRAM_ID.toBase58());
  assert.equal(r[0].vault, vault); assert.equal(r[0].authority, address);
  const snapshot = { context: { slot: 10 }, value: [tokenRow(vault, address)] };
  const coverage = await collectProtocolReserves(async (_, params) => ({ context: { slot: 11 }, value: params[0].map(a => a === address ? account : null) }), snapshot, mint, TOKEN_PROGRAM_ID.toBase58(), []);
  assert.equal(coverage.reserves.length, 1);
  const bad = structuredClone(snapshot); bad.value[0] = tokenRow(vault, key(44).toBase58());
  // On-chain reserve authorities, not third-party labels, determine discoverability.
  const unrelated = await collectProtocolReserves(async (_, params) => ({ context: { slot: 11 }, value: params[0].map(() => null) }), bad, mint, TOKEN_PROGRAM_ID.toBase58(), []);
  assert.equal(unrelated.reserves.length, 0);
});


for (const f of require('../../integrations/holders/fixtures/mainnet.json')) test(`recorded mainnet ${f.reserve.protocol} binds the actual mint and vault authority`, () => {
  const decoded = decodeReserveState(f.reserve.address, f.state.account, f.mint, f.tokenProgram);
  assert.deepEqual(decoded[0], f.reserve);
  const data = Buffer.from(f.tokenAccount.account.data[0], 'base64');
  assert.equal(f.tokenAccount.pubkey, decoded[0].vault);
  assert.equal(new PublicKey(data.subarray(0, 32)).toBase58(), f.mint);
  assert.equal(new PublicKey(data.subarray(32, 64)).toBase58(), decoded[0].authority);
  assert.ok(data.readBigUInt64LE(64) > 0n);
});
