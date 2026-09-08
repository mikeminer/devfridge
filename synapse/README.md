# DevFridge Synapse

Public viewer: https://synapse.devfridge.cool

Synapse adapts the Magistra vault viewer for DevFridge's investor knowledge. Rotate the 3D graph, search full token addresses or note text, filter Solana/Robinhood assets, follow links and backlinks, and read complete Markdown notes. Each note has a shareable URL hash. The note list works with a keyboard and remains available if WebGL cannot initialize.

## Data updates

The viewer reads https://raw.githubusercontent.com/mikeminer/devfridge/master/knowledge/data/vault.json on load, manual refresh, and every five minutes while visible. The DevFridge daily knowledge workflow produces this complete feed, so data updates do not require redeploying Synapse. No GitHub token is exposed or required.

The included vault.json is a dated fallback for the initial visit when the live source is unavailable. The UI labels this saved copy and its timestamp. Subsequent fetch errors preserve the current notes. A snapshot older than 36 hours is labelled older; individual observations may be stale even in a recent snapshot. Read the freshness report before interpreting data.

## Development and publication

Run npm ci, npm test, npm run build, then npm run dev. The local viewer listens at http://127.0.0.1:4178. The build bundles pinned Three.js and Lucide files locally, with their licenses; it does not depend on CDN scripts.

Before publishing a new viewer version, replace the fallback vault.json with the latest knowledge/data/vault.json, test and build, then publish the exact source to the Sites project recorded in .openai/hosting.json. Source changes need a new Sites version; daily knowledge updates do not.

This directory is the public corresponding source of the standalone Sites checkout. Do not add Sites source credentials or other secrets to it. The three existing Vercel websites ignore Synapse-only changes.

## License and attribution

This viewer and its modifications are GNU AGPL v3. See LICENSE and NOTICE.md for the original Magistra reference, adaptation details and dependency licenses. Other DevFridge components keep their own licenses.
