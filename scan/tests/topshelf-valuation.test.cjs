const assert = require('node:assert/strict');
const test = require('node:test');
const {parsePonsPrice, rankShelfTokens} = require('../lib/topshelf/valuation.ts');

const token = (address, balance, decimals = 0) => ({address, balance, decimals});

const page = props => '<script>self.__next_f.push(' + JSON.stringify([1, 'a:'+JSON.stringify(['$', 'screen', null, props])+'\n']) + ')</script>';
test('reads precise Pons quotes from structured token props only', () => {
  assert.equal(parsePonsPrice(page({token:'0xa',initialPriceQuote:1.5e-9,quoteUsd:2000}),'0xa'), .000003);
  for (const quote of [null, -2, 0]) assert.equal(parsePonsPrice(page({token:'0xa',initialPriceQuote:quote,quoteUsd:2000}),'0xa'), null);
  assert.equal(parsePonsPrice(page({token:'0xb',initialPriceQuote:1,quoteUsd:2000}),'0xa'), null);
  assert.equal(parsePonsPrice(page({description:'"initialPriceQuote":1,"quoteUsd":2000'}),'0xa'), null);
  assert.equal(parsePonsPrice('<dd>$0.000004</dd>','0xa'), null);
});
test('ranks by USD balance, not raw units; respects decimals and keeps input intact', () => {
  const tokens = [token('0xa', '1000000'), token('0xb', '500000000', 6)];
  const rows = rankShelfTokens(tokens, {'0xa': .000001, '0xb': .01});
  assert.deepEqual(rows.map(row => [row.token.address, row.tvlUsd]), [['0xb', 5], ['0xa', 1]]);
  assert.equal(tokens[0].address, '0xa');
});
test('missing positive balances are unranked, zeros need no quote, ties are deterministic', () => {
  const rows = rankShelfTokens([token('0xc', '5'), token('0xb', '0'), token('0xa', '0')], {});
  assert.deepEqual(rows.map(row => [row.token.address, row.tvlUsd]), [['0xa', 0], ['0xb', 0], ['0xc', null]]);
});
