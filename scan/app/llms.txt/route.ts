import { DOCS_ORIGIN } from "@/lib/docs";
import { PASTA_MINT, PROGRAM_ID } from "@/lib/constants";

export const runtime = "nodejs";

export function GET() {
  const body = `# DevFridge

> Solana Token-2022 time-lock and token risk scanner. Reports observable signals; it does not certify tokens as safe.

- Fridge: https://devfridge.cool
- Scanner: https://scan.devfridge.cool
- Ecosystem kitchen map: https://ecosystem.devfridge.cool
- Docs: ${DOCS_ORIGIN}
- Risk methodology: ${DOCS_ORIGIN}/methodology
- Security and disclosure: ${DOCS_ORIGIN}/security
- Listing kit: ${DOCS_ORIGIN}/listing-kit
- Feature a memecoin: ${DOCS_ORIGIN}/feature
- Connect (only official contacts): https://connect.devfridge.cool
- GitHub: https://github.com/mikeminer/devfridge

Program: ${PROGRAM_ID}
DevFridge $PASTA — Solana mint: ${PASTA_MINT}
Ticker is not identity. Not affiliated with any other token using the PASTA ticker. Lead promotions with the full mint and verify it at ${DOCS_ORIGIN}/program.

Feature packages: 0.1 SOL / 24h, 0.18 SOL / 48h, 0.5 SOL / 7d, plus network fees. Requires a live Fridge lock. SOL is swapped to $PASTA and burned. The buyer never holds that $PASTA.

Telegram: @frigopastabot supports /scan <mint>, /fridge <mint>, /badge <mint>. For expiry DMs, /register takes the lock account PDA, not the token mint.

World: https://world.devfridge.cool hosts Cold Storage, a single-player brainrot merge game with a walkable kitchen. The game is deployed as a pre-launch build; the homepage keeps its countdown and runway until 1 October 2026, 00:00 Europe/Rome. Access requires Solana wallet sign-in and at least 500,000 tokens of one of the ten supported character mints actively timelocked in DevFridge, checked through sdk.devfridge.cool. Same-mint active locks in the connected wallet add together; different mints do not combine. No market-value ranking, per-run payments, game escrow or prizes. Eligible tokens unlock their corresponding memes. Fridge visits use saved snapshots; progress and reactions are browser-local, with no live multiplayer or authoritative leaderboard. Share photo & score prepares a fridge image, caption and World link for social apps, with download/copy fallback. Current rules and controls: ${DOCS_ORIGIN}/world.

Sponsored placement never changes scan checks, warnings, or risk grades.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
