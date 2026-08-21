import { DOCS_ORIGIN } from "@/lib/docs";
import { PASTA_MINT, PROGRAM_ID } from "@/lib/constants";

export const runtime = "nodejs";

export function GET() {
  const body = `# DevFridge

> Token-2022 time-lock on Solana. Scanner that checks a live Fridge vault. Featured listings buy and burn $PASTA.

- Fridge: https://devfridge.cool
- Scanner: https://scan.devfridge.cool
- Docs: ${DOCS_ORIGIN}
- Feature a memecoin: ${DOCS_ORIGIN}/feature
- Connect (only official contacts): https://connect.devfridge.cool
- GitHub: https://github.com/mikeminer/devfridge

Program: ${PROGRAM_ID}
$PASTA: ${PASTA_MINT}

Feature packages: 0.1 SOL / 24h, 0.18 SOL / 48h, 0.5 SOL / 7d. Requires a live Fridge lock. SOL is swapped to $PASTA and burned. The buyer never holds that $PASTA.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
