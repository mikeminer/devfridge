import { locksForDepositor, type FridgeLock } from "./fridge";
import { tokenIdentity } from "./identity";
import { usdPrice } from "./price";

export type WorldFaction = {
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  usd: number;
  amount: string;
  lockAddress: string;
  color: string;
};

function colorFromMint(mint: string): string {
  let h = 0;
  for (let i = 0; i < mint.length; i++) h = (h * 33 + mint.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 55%)`;
}

export async function factionForWallet(wallet: string): Promise<WorldFaction | null> {
  const locks = await locksForDepositor(wallet);
  const now = Math.floor(Date.now() / 1000);
  const live = locks.filter((l) => l.unlockAt > now);
  if (live.length === 0) return null;

  const scored = await Promise.all(
    live.map(async (lock) => {
      const ui = Number(lock.amount) / 1e6;
      const px = await usdPrice(lock.mint).catch(() => null);
      const usd = px != null && Number.isFinite(ui) ? ui * px : ui;
      return { lock, usd };
    })
  );
  scored.sort((a, b) => b.usd - a.usd);
  const top = scored[0];
  const id = await tokenIdentity(top.lock.mint).catch(() => ({
    name: top.lock.mint.slice(0, 4),
    symbol: "TKN",
    image: null as string | null,
  }));
  return {
    wallet,
    mint: top.lock.mint,
    name: id.name,
    symbol: id.symbol,
    image: id.image,
    usd: top.usd,
    amount: top.lock.amount,
    lockAddress: top.lock.address,
    color: colorFromMint(top.lock.mint),
  };
}

export function sameFaction(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a === b);
}
