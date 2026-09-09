const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, unpackMint, getAssociatedTokenAddressSync } = require('@solana/spl-token');
const evidence = require('../lib/solana-evidence.ts');
const checks = require('../lib/scan-evidence-checks.ts');
const fixture = require('../../integrations/webacy/fixtures/pasta-mainnet.json');
const clone = () => structuredClone(fixture.lock.snapshot);
const lockAddress = fixture.lock.evidence.address;
const mintAddress = fixture.lock.evidence.mint;
const verify = snapshot => evidence.verifyLockSnapshot(lockAddress, snapshot.keys, snapshot);
function mutate(snapshot, address, fn) {
  const account = snapshot.value[snapshot.keys.indexOf(address)];
  const data = Buffer.from(account.data[0], 'base64'); fn(data, account); account.data[0] = data.toString('base64');
}

test('real snapshot verifies exact raw balance, beneficiary, active date and immutable metadata', () => {
  const result = verify(clone());
  assert.equal(result.actualBalanceRaw, '100000000000000');
  assert.equal(result.beneficiary, 'GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W');
  assert.equal(new Date(result.unlockAt * 1000).toISOString(), '2027-08-18T22:02:00.000Z');
  assert.equal(result.state, 'active');
  assert.equal(result.metadata.state, 'immutable');
  assert.equal(result.ownershipExcluded, false);
  assert.ok(result.extensionTypes.includes(18) && result.extensionTypes.includes(19));
});
test('current balance, including unsolicited deposits, takes precedence over recorded amount', () => {
  const snapshot = clone();
  mutate(snapshot, fixture.lock.evidence.vault, d => d.writeBigUInt64LE(100000000000001n, 64));
  assert.equal(verify(snapshot).actualBalanceRaw, '100000000000001');
  assert.ok(verify(snapshot).caveats.some(c => c.includes('differs')));
});
test('unlock boundary is expired and unclaimed, never claimed or burned', () => {
  const snapshot = clone();
  mutate(snapshot, snapshot.keys[5], d => d.writeBigInt64LE(BigInt(fixture.lock.evidence.unlockAt), 32));
  assert.equal(verify(snapshot).state, 'expired_unclaimed');
});
test('unknown address absence does not claim a successful redemption', async () => {
  const result = await evidence.collectLockEvidence(async () => ({ context: { slot: 1 }, value: [null, null] }), lockAddress);
  assert.equal(result.state, 'absent');
  assert.match(result.note, /does not prove/);
});
for (const [name, change] of [
  ['wrong lock program', (d, a) => { a.owner = TOKEN_2022_PROGRAM_ID.toBase58(); }],
  ['wrong discriminator', d => { d[0] ^= 1; }],
  ['altered depositor', d => { d[8] ^= 1; }],
  ['altered mint', d => { d[40] ^= 1; }],
  ['altered lock ID', d => { d[97] ^= 1; }],
  ['altered PDA bump', d => { d[96] ^= 1; }],
  ['executable lock', (d, a) => { a.executable = true; }],
]) test(`rejects ${name}`, () => { const s = clone(); mutate(s, lockAddress, change); assert.throws(() => verify(s)); });
test('rejects truncated lock', () => {
  const s = clone(); s.value[0].data[0] = Buffer.alloc(104).toString('base64'); assert.throws(() => verify(s));
});
for (const [name, offset] of [['wrong vault mint', 0], ['wrong vault authority', 32]]) {
  test(`rejects ${name}`, () => { const s = clone(); mutate(s, fixture.lock.evidence.vault, d => { d[offset] ^= 1; }); assert.throws(() => verify(s)); });
}
test('rejects classic SPL mint for a Fridge lock', () => {
  const s = clone(); s.value[1].owner = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; assert.throws(() => verify(s));
});
test('surfaces program upgrade authority and frozen vault without hiding lock ownership', () => {
  const s = clone();
  mutate(s, s.keys[4], d => { d[12] = 1; new PublicKey(mintAddress).toBuffer().copy(d, 13); });
  mutate(s, fixture.lock.evidence.vault, d => { d[108] = 2; });
  const r = verify(s); assert.equal(r.upgradeAuthority, mintAddress); assert.equal(r.vaultFrozen, true); assert.ok(r.caveats.some(c => c.includes('upgradeable')));
});
test('decoder supports another mint and depositor without a PASTA exception', () => {
  const s = clone(), data = Buffer.from(s.value[0].data[0], 'base64');
  const mint = new PublicKey('So11111111111111111111111111111111111111112');
  const depositor = new PublicKey(mintAddress);
  depositor.toBuffer().copy(data, 8); mint.toBuffer().copy(data, 40);
  const [address, bump] = PublicKey.findProgramAddressSync([Buffer.from('lock'), depositor.toBuffer(), mint.toBuffer(), data.subarray(97)], evidence.FRIDGE_PROGRAM);
  data[96] = bump; s.value[0].data[0] = data.toString('base64');
  const r = evidence.decodeVerifiedLock(address.toBase58(), s.value[0]);
  assert.equal(r.mint, mint.toBase58());
  assert.equal(r.vault, getAssociatedTokenAddressSync(mint, address, true, TOKEN_2022_PROGRAM_ID).toBase58());
});
test('Token-2022 pointer and update authorities are assessed separately', () => {
  const raw = fixture.lock.snapshot.value[1];
  const mint = unpackMint(new PublicKey(mintAddress), evidence.accountInfo(raw), TOKEN_2022_PROGRAM_ID);
  for (const type of [18, 19]) {
    const copy = { ...mint, tlvData: Buffer.from(mint.tlvData) };
    let at = 0;
    while (at < copy.tlvData.length) {
      const t = copy.tlvData.readUInt16LE(at), len = copy.tlvData.readUInt16LE(at + 2);
      if (t === type) { copy.tlvData[at + 4] = 1; break; } at += 4 + len;
    }
    assert.equal(evidence.token2022Metadata(copy).state, 'mutable');
  }
  assert.equal(evidence.token2022Metadata({ ...mint, tlvData: Buffer.alloc(0) }).state, 'unknown');
});
test('real canonical pool validates reserve accounts and zero outstanding LP supply', () => {
  const last = fixture.poolReads.at(-1);
  const p = evidence.verifyPoolSnapshot(fixture.pool.address, mintAddress, last.params[0], last.result);
  assert.equal(evidence.canonicalPumpPool(mintAddress), fixture.pool.address);
  assert.equal(p.lpSupplyRaw, '0'); assert.equal(p.funded, true);
  const corrupted = structuredClone(last.result); const raw = corrupted.value[1];
  const d = Buffer.from(raw.data[0], 'base64'); d[32] ^= 1; raw.data[0] = d.toString('base64');
  assert.throws(() => evidence.verifyPoolSnapshot(fixture.pool.address, mintAddress, last.params[0], corrupted));
});
test('provider outage and empty coverage never assert absent liquidity', () => {
  for (const status of ['ok', 'unavailable']) {
    const check = checks.liquidityCheck(null, status, [], false);
    assert.equal(check.level, 'unknown'); assert.notEqual(check.amount, 'None');
  }
});
test('verified funded pool overrides stale curve feed; outstanding LP stays unverified', () => {
  assert.equal(checks.liquidityCheck(fixture.pool, 'unavailable', [], true).amount, 'Zero LP supply');
  assert.equal(checks.liquidityCheck({ ...fixture.pool, lpSupplyRaw: '1' }, 'ok', [], false).level, 'caution');
  assert.equal(checks.liquidityCheck({ ...fixture.pool, funded: false }, 'ok', [], false).level, 'caution');
});
test('Metaplex flag is decoded after variable strings and optional creators, not update authority byte', () => {
  const string = value => { const bytes = Buffer.from(value); const len = Buffer.alloc(4); len.writeUInt32LE(bytes.length); return Buffer.concat([len, bytes]); };
  for (const creators of [false, true]) for (const mutable of [false, true]) {
    const head = Buffer.alloc(65); head[0] = 4; head[1] = mutable ? 0 : 1; new PublicKey(mintAddress).toBuffer().copy(head, 33);
    const creator = creators ? Buffer.concat([Buffer.from([1, 1, 0, 0, 0]), Buffer.alloc(34)]) : Buffer.from([0]);
    const data = Buffer.concat([head, string('Name'), string('T'), string('https://example.org'), Buffer.alloc(2), creator, Buffer.from([0, Number(mutable)])]);
    const parsed = checks.decodeMetaplexMetadata(data, mintAddress, b => new PublicKey(b).toBase58());
    assert.equal(parsed.isMutable, mutable); assert.equal(parsed.uri, 'https://example.org');
    assert.throws(() => checks.decodeMetaplexMetadata(data.subarray(0, -1), mintAddress, b => new PublicKey(b).toBase58()));
  }
});
