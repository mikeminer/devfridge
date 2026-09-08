# DevFridge Synapse

Public investor brief: https://synapse.devfridge.cool

Mobile knowledge graph: https://synapse.devfridge.cool/graph.html

The Three.js graph renders notes as neuron-shaped cells with tapered, forked dendrites and curved fibres for the existing knowledge links. Each note is one merged mesh; phone meshes use fewer branches and vertices. Selection and search brighten the cells, and the phone camera includes the full dendrite extent when fitting the graph. The appearance does not add or infer new relationships in the knowledge data.

The homepage is a readable research brief for Pump.fun buyers: full mint identities, dated indexed liquidity and volume, supply controls, missing lock/holder evidence, and all official documentation references. It contains the complete content in the first HTML response, with Open Graph metadata, Schema.org metadata, robots.txt, sitemap.xml and alternate links to /brief.md and /brief.json. /llms.txt provides a short reading guide. AI services may apply their own fetching policies and latency; these formats do not guarantee indexing or an answer time.

Synapse adapts the Magistra vault viewer for DevFridge's investor knowledge. Rotate the 3D graph, search full token addresses or note text, filter Solana/Robinhood assets, follow links and backlinks, and read complete Markdown notes. Each note has a shareable URL hash. The note list works with a keyboard and remains available if WebGL cannot initialize.

## Data updates

The brief's Vercel function reads knowledge/data/snapshot.json from GitHub and renders HTML, Markdown and JSON from the same observations. It uses a 2.5-second upstream timeout and a five-minute CDN cache. If GitHub is unavailable or returns invalid data, it serves the bundled snapshot.json with a prominent fallback label and a 30-second cache. Each source retains its last-success timestamp; observations older than 36 hours are marked stale. If both sources fail, it returns HTTP 503. These endpoints require no wallet, credentials or client-side JavaScript. /llms.txt is a discovery guide, not an AI indexing guarantee.

On phones, Graph opens without covering panels. Use Explore & search to browse notes, or tap a graph node to open Read note. The bottom navigation returns to the unobstructed graph. Pinch zoom and drag rotation do not select notes. The graph fits the available viewport on rotation, uses larger tap targets, and limits overlapping labels.

The viewer reads https://raw.githubusercontent.com/mikeminer/devfridge/master/knowledge/data/vault.json on load, manual refresh, and every five minutes while visible. The DevFridge daily knowledge workflow produces this complete feed, so data updates do not require redeploying Synapse. No GitHub token is exposed or required.

The included vault.json is a dated fallback for the initial visit when the live source is unavailable. The UI labels this saved copy and its timestamp. Subsequent fetch errors preserve the current notes. A snapshot older than 36 hours is labelled older; individual observations may be stale even in a recent snapshot. Read the freshness report before interpreting data.

## Development and publication

Run npm ci, npm test, npm run build, then npm run dev. The local viewer listens at http://127.0.0.1:4178. The build bundles pinned Three.js and Lucide files locally, with their licenses; it does not depend on CDN scripts.

Before publishing, replace vault.json and snapshot.json with their latest knowledge/data/ equivalents, then test and build. Export this directory to a standalone deployment folder outside the repository (exclude node_modules, dist, .openai, .vercel and .env files). Keep api/, brief.mjs, snapshot.json, build.mjs, package files and vercel.json. Run `vercel link --project synapse-devfridge-cool`, then `vercel --prod` from that standalone folder; this avoids the CLI selecting the parent monorepo. The included vercel.json builds dist and routes the brief formats through the read-only function. The production deployment must include the function, not only dist. Viewer code changes require a deployment; daily knowledge updates do not.

The primary domain is hosted by the Vercel project synapse-devfridge-cool. Hosting moved to Vercel after a Sites publishing conflict blocked the mobile update. The original Sites project recorded in .openai/hosting.json remains a separate, older fallback; publishing there does not update the primary domain.

This directory is the public corresponding source of the deployed viewer. Do not add hosting credentials or other secrets to it. The three other Vercel websites ignore Synapse-only changes.

## License and attribution

This viewer and its modifications are GNU AGPL v3. See LICENSE and NOTICE.md for the original Magistra reference, adaptation details and dependency licenses. Other DevFridge components keep their own licenses.
