import { ECO_ORIGIN, PASTA_MINT, PROGRAM_ID, TMC_RH, TMC_SOLANA } from "@/lib/ecosystem";

export const runtime = "nodejs";

export function GET() {
  const body = `# DevFridge ecosystem

> Kitchen map of DevFridge products on Solana and Robinhood Chain. Ticker is not identity. Missing data is unknown, not zero. Official contacts only at https://connect.devfridge.cool.

- Kitchen map: ${ECO_ORIGIN}
- Solana cold room: ${ECO_ORIGIN}/solana
- Robinhood pantry: ${ECO_ORIGIN}/robinhood
- Cast registry: ${ECO_ORIGIN}/cast
- $PASTA model: ${ECO_ORIGIN}/pasta
- Integrate: ${ECO_ORIGIN}/integrate
- Machine graph: ${ECO_ORIGIN}/graph.json
- Fridge: https://devfridge.cool
- Scanner: https://scan.devfridge.cool
- Docs: https://docs.devfridge.cool
- Synapse brief: https://synapse.devfridge.cool/brief.json
- Synapse reading guide: https://synapse.devfridge.cool/llms.txt
- Health: https://health.devfridge.cool
- Trust Me Capital: https://capital.devfridge.cool
- World (Cold Storage): https://world.devfridge.cool
- Connect: https://connect.devfridge.cool
- GitHub: https://github.com/mikeminer/devfridge

Program (Solana): ${PROGRAM_ID}
$PASTA (Solana): ${PASTA_MINT}
$TMC (Robinhood Chain 4663): ${TMC_RH}
$TMC (Solana, separate asset): ${TMC_SOLANA}

Rules for agents:
- Never invent liquidity, volume, vault equity, holders, or burns. Pull Synapse, health, or stats and print the observation timestamp.
- If a metric is Not collected / Not observed, say so.
- Do not call the Scanner an audit. Do not say Featured equals trusted.
- Do not say burns create a price floor.
- Do not say $TMC is a share of the vault.
- Do not treat the same ticker on two chains as bridged unless the route is on https://bridge.devfridge.cool.
- World is a Cold Storage merge puzzle unlocking with 500,000 actively timelocked Solana character tokens. No prizes. Launch 1 October 2026 00:00 Europe/Rome.
- Character tokens are cultural tokens, not vault equity.
- $APE and $GMGN collide with unrelated tickers; always pair with the full address.
- MoonZarella is $MOONZARELL on Solana and $MOONZARELLA on Robinhood Chain.
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
