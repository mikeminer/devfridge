import { PASTA_MINT } from "./constants";
import { locksForDepositor } from "./fridge";
import { tokenIdentity } from "./identity";
import { usdPrice } from "./price";

export type WorldTeam = "pastalovers" | "shelf";

export const TEAM_META: Record<
  WorldTeam,
  { id: WorldTeam; name: string; color: string; blurb: string }
> = {
  pastalovers: {
    id: "pastalovers",
    name: "Pastalovers",
    color: "#f59e0b",
    blurb: "Live $PASTA lock — you cook in the pot.",
  },
  shelf: {
    id: "shelf",
    name: "The Shelf",
    color: "#4fc3f7",
    blurb: "Live lock of any other token — you live on the ice shelves.",
  },
};

export function teamFromMint(mint: string): WorldTeam {
  return mint === PASTA_MINT ? "pastalovers" : "shelf";
}

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
  team: WorldTeam;
  teamName: string;
};

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
  const team = teamFromMint(top.lock.mint);
  const meta = TEAM_META[team];
  return {
    wallet,
    mint: top.lock.mint,
    name: id.name,
    symbol: id.symbol,
    image: id.image,
    usd: top.usd,
    amount: top.lock.amount,
    lockAddress: top.lock.address,
    color: meta.color,
    team,
    teamName: meta.name,
  };
}

export function sameTeam(a?: WorldTeam | null, b?: WorldTeam | null): boolean {
  return Boolean(a && b && a === b);
}
