import {formatUnits} from 'ethers';
import type {ShelfToken} from './config';

export type ShelfPrices = Record<string, number | null>;

// Read the precise quote supplied to Pons' token screen, never its rounded UI price.
// The HTML is data only: no scripts are evaluated.
export function parsePonsPrice(html: string, address: string): number | null {
  let flight = '';
  for (const match of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
    try {
      const chunk = JSON.parse(match[1]);
      if (chunk[0] === 1 && typeof chunk[1] === 'string') flight += chunk[1];
    } catch { /* Ignore non-data script blocks. */ }
  }
  for (const line of flight.split('\n')) {
    const record = line.match(/^[\da-f]+:(.*)$/i);
    if (!record) continue;
    try {
      const pending: unknown[] = [JSON.parse(record[1])];
      while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object') continue;
        const props = value as Record<string, unknown>;
        if (typeof props.token === 'string' && props.token.toLowerCase() === address.toLowerCase() &&
            typeof props.initialPriceQuote === 'number' && typeof props.quoteUsd === 'number') {
          const price = props.initialPriceQuote * props.quoteUsd;
          return Number.isFinite(price) && props.initialPriceQuote > 0 && props.quoteUsd > 0 && price > 0 ? price : null;
        }
        pending.push(...Object.values(props));
      }
    } catch { /* Other Flight record types do not contain token-screen props. */ }
  }
  return null;
}

export function rankShelfTokens(tokens: ShelfToken[], prices: ShelfPrices) {
  return tokens.map(token => {
    const amount = Number(formatUnits(BigInt(token.balance), token.decimals));
    const price = prices[token.address.toLowerCase()];
    const value = amount === 0 ? 0 : typeof price === 'number' && price > 0 ? amount * price : null;
    const tvlUsd = value !== null && Number.isFinite(value) ? value : null;
    return {token, amount, tvlUsd};
  }).sort((a, b) => {
    // Unknown values are explicitly unranked and follow all valued jars.
    if (a.tvlUsd === null && b.tvlUsd !== null) return 1;
    if (b.tvlUsd === null && a.tvlUsd !== null) return -1;
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0) || a.token.address.toLowerCase().localeCompare(b.token.address.toLowerCase());
  });
}
