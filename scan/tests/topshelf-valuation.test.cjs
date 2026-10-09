const assert = require('node:assert/strict');
const test = require('node:test');
const {parsePonsPrice, rankShelfTokens, summarizePoolValue} = require('../lib/topshelf/valuation.ts');

const token = (address, balance, decimals = 0, reserved = '0') => ({address, balance, decimals, reserved, available: String(BigInt(balance) - BigInt(reserved))});
const flight = (...chunks) => chunks.map(chunk => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`).join('');
const model = props => '14:' + JSON.stringify(['$', 'screen', null, props]) + '\n';
const page = props => flight(model(props));
const address = '0x5c845330b41D9Bef68B46DC254353A770f44dee8';

test('current Pons launch data provides an exact address-matched USD quote', () => {
  // Shape and values from the public TMC launchpad page on 2026-10-09.
  const launch = {address: address.toLowerCase(), symbol: 'TMC', priceQuote: 1.868285421e-9, quoteUsd: 2471.145725072044, priceUsd: 0.0000046168055313185744, marketCapUsd: 4616.805531318574};
  assert.equal(parsePonsPrice(page({address, launch, trades: '$@27', candles: '$@28', partial: false}), address), launch.priceUsd);
  assert.equal(parsePonsPrice(page({launch}), '0xother'), null);
  assert.equal(parsePonsPrice(page({launch: {...launch, priceUsd: undefined}}), address), null);
  assert.equal(parsePonsPrice(page({description: JSON.stringify(launch)}), address), null);
});

test('UTF-8 length-framed text and split scripts cannot hide or impersonate the price model', () => {
  const rawText = `È una 🍝 descrizione\n${model({address, priceUsd: 999})}`;
  const prefix = '25:T' + Buffer.byteLength(rawText).toString(16) + ',' + rawText;
  const data = ':HL["/styles.css","style"]\n1:I["client-module"]\n' + prefix + model({address, launch: {address, priceUsd: 0.0000046168055313185744}});
  const split = data.length - 50;
  assert.equal(parsePonsPrice(flight(data.slice(0, split), data.slice(split)), address), 0.0000046168055313185744);
  assert.equal(parsePonsPrice(flight(prefix), address), null);
  assert.equal(parsePonsPrice(flight('25:Tffff,short'), address), null);
});

test('invalid USD quotes stay unavailable and market cap never substitutes for price', () => {
  for (const priceUsd of [null, -1, 0, '0.1', Infinity]) {
    assert.equal(parsePonsPrice(page({launch: {address, priceUsd, marketCapUsd: 1000000, totalSupply: 1000000}}), address), null);
  }
  assert.equal(parsePonsPrice('<dd>$0.000004</dd>', address), null);
  assert.equal(parsePonsPrice(flight('1:{broken}\n' + model({address, priceUsd: 0.25})), address), 0.25);
});

test('legacy precise quotes still work, but current direct USD data takes precedence', () => {
  assert.equal(parsePonsPrice(page({token: '0xa', initialPriceQuote: 1.5e-9, quoteUsd: 2000}), '0xa'), 0.000003);
  for (const quote of [null, -2, 0]) assert.equal(parsePonsPrice(page({token: '0xa', initialPriceQuote: quote, quoteUsd: 2000}), '0xa'), null);
  assert.equal(parsePonsPrice(page({token: '0xb', initialPriceQuote: 1, quoteUsd: 2000}), '0xa'), null);
  const old = model({token: address, initialPriceQuote: 1, quoteUsd: 2000});
  assert.equal(parsePonsPrice(flight(old + model({address, priceUsd: 0.5})), address), 0.5);
  assert.equal(parsePonsPrice(flight(old + model({address, priceUsd: null})), address), null);
});

test('ranks funded jars by USD with different decimals and normalized quotes', () => {
  const tokens = [token('0xa', '1000000'), token('0xb', '500000000', 6)];
  const rows = rankShelfTokens(tokens, {'0xa': 0.000001, '0xb': 0.01});
  assert.deepEqual(rows.map(row => [row.token.address, row.tvlUsd, row.priceUsd]), [['0xb', 5, 0.01], ['0xa', 1, 0.000001]]);
  assert.equal(tokens[0].address, '0xa');
});

test('funded unpriced jars follow priced jars and precede every empty jar', () => {
  const tokens = [token('0xc', '999999999999999999'), token('0xa', '0'), token('0xd', '1'), token('0xb', '0')];
  const rows = rankShelfTokens(tokens, {'0xd': 0.01});
  assert.deepEqual(rows.map(row => [row.token.address, row.tvlUsd]), [['0xd', 0.01], ['0xc', null], ['0xa', 0], ['0xb', 0]]);
  const unpriced = rankShelfTokens([token('0xc', '999999'), token('0xb', '1')], {});
  assert.deepEqual(unpriced.map(row => row.token.address), ['0xb', '0xc']);
});

test('invalid or non-finite quotes never create a jar valuation', () => {
  for (const price of [null, -1, 0, NaN, Infinity, '2']) {
    const [row] = rankShelfTokens([token('0xa', '2')], {'0xa': price});
    assert.equal(row.priceUsd, null);
    assert.equal(row.tvlUsd, null);
  }
});

test('pool totals distinguish deposited, available and reserved balances', () => {
  const tokens = [token('0xA', '2000000', 6, '500000'), token('0xb', '4000000000000000000', 18, '1000000000000000000')];
  const prices = {'0xa': 3, '0xb': 0.5};
  assert.deepEqual(summarizePoolValue(tokens, prices, 'balance'), {valueUsd: 8, pricedTokens: 2, unpricedTokens: 0, fundedTokens: 2, partial: false});
  assert.equal(summarizePoolValue(tokens, prices, 'available').valueUsd, 6);
  assert.equal(summarizePoolValue(tokens, prices, 'reserved').valueUsd, 2);
});

test('partial subtotals identify missing funded quotes without assigning zero value', () => {
  const tokens = [token('0xa', '2'), token('0xb', '9'), token('0xc', '0')];
  assert.deepEqual(summarizePoolValue(tokens, {'0xa': 3}, 'balance'), {valueUsd: 6, pricedTokens: 1, unpricedTokens: 1, fundedTokens: 2, partial: true});
  assert.deepEqual(summarizePoolValue(tokens, {}, 'balance'), {valueUsd: null, pricedTokens: 0, unpricedTokens: 2, fundedTokens: 2, partial: false});
  assert.deepEqual(summarizePoolValue(tokens, {}, 'reserved'), {valueUsd: 0, pricedTokens: 0, unpricedTokens: 0, fundedTokens: 0, partial: false});
  assert.equal(summarizePoolValue(tokens, {'0xa': Infinity, '0xb': -1}, 'balance').valueUsd, null);
});
