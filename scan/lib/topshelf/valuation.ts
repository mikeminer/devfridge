import {formatUnits} from 'ethers';
import type {ShelfToken} from './config';

export type ShelfPrices = Record<string, number | null>;

function positivePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

// Flight text rows use UTF-8 byte lengths and need not end with a newline. Skip
// their payload rather than treating JSON-looking descriptions as token data.
function* flightModels(html: string): Generator<unknown> {
  let flight = '';
  for (const match of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)\s*;?\s*<\/script>/gs)) {
    try {
      const chunk = JSON.parse(match[1]);
      if (chunk[0] === 1 && typeof chunk[1] === 'string') flight += chunk[1];
    } catch { /* Ignore non-data script blocks. */ }
  }
  const bytes = new TextEncoder().encode(flight);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset < bytes.length) {
    const colon = bytes.indexOf(58, offset);
    // Resource hints may omit the row ID (for example :HL[...]).
    if (colon < 0 || !/^[\da-f]*$/i.test(decoder.decode(bytes.subarray(offset, colon)))) break;
    offset = colon + 1;
    if (bytes[offset] === 84) { // T<hex byte length>,<raw text><next record>
      const comma = bytes.indexOf(44, offset + 1);
      if (comma < 0) break;
      const size = decoder.decode(bytes.subarray(offset + 1, comma));
      if (!/^[\da-f]+$/i.test(size)) break;
      const end = comma + 1 + parseInt(size, 16);
      if (!Number.isSafeInteger(end) || end > bytes.length) break;
      offset = end;
      continue;
    }
    const newline = bytes.indexOf(10, offset);
    const end = newline < 0 ? bytes.length : newline;
    const row = decoder.decode(bytes.subarray(offset, end));
    offset = end + 1;
    try { yield JSON.parse(row); } catch { /* Imports and other typed rows are not models. */ }
  }
}

// Read Pons' precise token USD quote, never rounded UI text or market cap.
// HTML and Flight payloads are parsed as data; no page scripts are evaluated.
export function parsePonsPrice(html: string, address: string): number | null {
  const expected = address.toLowerCase();
  let legacyPrice: number | null = null;
  for (const model of flightModels(html)) {
    try {
      const pending: unknown[] = [model];
      while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object') continue;
        const props = value as Record<string, unknown>;
        if (typeof props.address === 'string' && props.address.toLowerCase() === expected && 'priceUsd' in props) {
          return positivePrice(props.priceUsd);
        }
        if (typeof props.token === 'string' && props.token.toLowerCase() === expected) {
          const priceQuote = positivePrice(props.initialPriceQuote), quoteUsd = positivePrice(props.quoteUsd);
          if (priceQuote !== null && quoteUsd !== null) legacyPrice = positivePrice(priceQuote * quoteUsd);
        }
        pending.push(...Object.values(props));
      }
    } catch { /* Ignore malformed or excessively nested records. */ }
  }
  return legacyPrice;
}

export function rankShelfTokens(tokens: ShelfToken[], prices: ShelfPrices) {
  return tokens.map(token => {
    const amount = Number(formatUnits(BigInt(token.balance), token.decimals));
    const priceUsd = positivePrice(prices[token.address.toLowerCase()]);
    const value = amount === 0 ? 0 : priceUsd !== null ? amount * priceUsd : null;
    const tvlUsd = value !== null && Number.isFinite(value) ? value : null;
    return {token, amount, priceUsd, tvlUsd};
  }).sort((a, b) => {
    // Funded jars precede empty ones even without a quote; never rank raw units.
    const aFunded = BigInt(a.token.balance) > 0n, bFunded = BigInt(b.token.balance) > 0n;
    if (aFunded !== bFunded) return aFunded ? -1 : 1;
    if (a.tvlUsd === null && b.tvlUsd !== null) return 1;
    if (b.tvlUsd === null && a.tvlUsd !== null) return -1;
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0) || a.token.address.toLowerCase().localeCompare(b.token.address.toLowerCase());
  });
}

export function summarizePoolValue(tokens: ShelfToken[], prices: ShelfPrices, field: 'balance' | 'available' | 'reserved') {
  let valueUsd = 0, pricedTokens = 0, unpricedTokens = 0;
  for (const token of tokens) {
    const raw = BigInt(token[field]);
    if (raw <= 0n) continue;
    const price = positivePrice(prices[token.address.toLowerCase()]);
    const value = price === null ? null : Number(formatUnits(raw, token.decimals)) * price;
    if (value === null || !Number.isFinite(value)) { unpricedTokens++; continue; }
    valueUsd += value;
    pricedTokens++;
  }
  const fundedTokens = pricedTokens + unpricedTokens;
  return {
    valueUsd: (fundedTokens > 0 && pricedTokens === 0) || !Number.isFinite(valueUsd) ? null : valueUsd,
    pricedTokens, unpricedTokens, fundedTokens,
    partial: pricedTokens > 0 && unpricedTokens > 0,
  };
}
