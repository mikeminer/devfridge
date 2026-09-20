
export type PoolJar = { address: string; symbol: string; balance: string; tvlUsd: number | null };
export type PoolState = { status: 'loading' | 'ready' | 'unavailable' | 'unconfigured'; jars: PoolJar[] };

/** Same USD balance ordering and address tie-break as the public TopShelf leaderboard. */
export function topPoolJars(value: unknown, quotes: unknown): PoolState {
  const data = value as { configured?: boolean; tokens?: unknown[] };
  const prices = (quotes as { prices?: Record<string, unknown> })?.prices;
  if (data?.configured === false) return { status: 'unconfigured', jars: [] };
  if (data?.configured !== true || !Array.isArray(data.tokens) || !prices || typeof prices !== 'object') throw Error('Invalid pool');
  const seen = new Set<string>();
  const jars = data.tokens.map(value => {
    const token = value as {address: string; symbol: string; balance: string; decimals: number};
    if (!token || !/^0x[0-9a-fA-F]{40}$/.test(token.address) || typeof token.symbol !== 'string' || token.symbol.length > 64 || !/^\d{1,78}$/.test(token.balance) || !Number.isInteger(token.decimals) || token.decimals < 0 || token.decimals > 255 || seen.has(token.address.toLowerCase())) throw Error('Invalid pool token');
    seen.add(token.address.toLowerCase());
    // Convert to an approximate display value only; no token transactions use this number.
    const amount = Number(`${token.balance}e-${token.decimals}`);
    const price = prices[token.address.toLowerCase()];
    const valueUsd = amount === 0 ? 0 : typeof price === 'number' && price > 0 ? amount * price : null;
    return { address: token.address, symbol: token.symbol, balance: token.balance, tvlUsd: valueUsd !== null && Number.isFinite(valueUsd) ? valueUsd : null };
  });
  jars.sort((a, b) => {
    if (a.tvlUsd === null && b.tvlUsd !== null) return 1;
    if (b.tvlUsd === null && a.tvlUsd !== null) return -1;
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0) || a.address.toLowerCase().localeCompare(b.address.toLowerCase());
  });
  return { status: 'ready', jars: jars.slice(0, 4) };
}

export class KitchenPool {
  private active = false;
  private request?: AbortController;
  private lastAttempt = -Infinity;
  constructor(private changed: (state: PoolState) => void, private fetcher: typeof fetch = (input, init) => fetch(input, init), private now = () => Date.now()) {}
  setActive(active: boolean) {
    if (active === this.active) return;
    this.active = active;
    if (!active) { if(this.request)this.lastAttempt=-Infinity;this.request?.abort(); this.request = undefined; }
    else void this.refresh();
  }
  async refresh() {
    if (!this.active || this.request || this.now() - this.lastAttempt < 60_000) return;
    this.lastAttempt = this.now();
    const request = new AbortController(); this.request = request;
    const timeout = setTimeout(() => request.abort(), 15_000);
    try {
      const responses = await Promise.all(['/api/world/topshelf', '/api/world/topshelf/prices'].map(url => this.fetcher(url, {signal: request.signal, cache: 'no-store'})));
      if (responses.some(response => !response.ok)) throw Error('Pool unavailable');
      const [pool, prices] = await Promise.all(responses.map(response => response.json()));
      const state = topPoolJars(pool, prices);
      if (this.request === request && this.active && !request.signal.aborted) this.changed(state);
    } catch {
      if (this.request === request && this.active) this.changed({status: 'unavailable', jars: []});
    } finally { clearTimeout(timeout); if (this.request === request) this.request = undefined; }
  }
}
