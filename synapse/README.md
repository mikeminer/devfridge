# DevFridge Synapse

Public investor brief: https://synapse.devfridge.cool

Mobile knowledge graph: https://synapse.devfridge.cool/graph.html

The Three.js graph distributes neurons through a 3D volume. Notes have organic cell bodies, tapered branching dendrites and a soft membrane glow. Existing knowledge links become curved, volumetric axons attached to actual dendrite terminals. Each neuron is one merged mesh plus its glow; axons use instanced cylinders, and phone meshes use fewer branches and vertices. Selection and search brighten cells and their connections. The camera includes the full dendrite extent, and desktop and phone views open with panels closed so the network fills the canvas. The appearance does not add or infer new relationships in the knowledge data.

The homepage is a readable research brief for Pump.fun buyers: full mint identities, dated indexed liquidity and volume, supply controls, missing lock/holder evidence, and all official documentation references. It contains the complete content in the first HTML response, with Open Graph metadata, Schema.org metadata, robots.txt, sitemap.xml and alternate links to /brief.md and /brief.json. /llms.txt provides a short reading guide. AI services may apply their own fetching policies and latency; these formats do not guarantee indexing or an answer time.

Synapse adapts the Magistra vault viewer for DevFridge's investor knowledge. Rotate the 3D graph, search full token addresses or note text, filter Solana/Robinhood assets, follow links and backlinks, and read complete Markdown notes. Each note has a shareable URL hash. The note list works with a keyboard and remains available if WebGL cannot initialize.

## Data updates

The daily knowledge refresh also indexes the published Connect directory and the public `/api/team` roster used by team.devfridge.cool. Search the graph for contacts, CEO, a name, handle or public wallet. Contact notes preserve source dates and link back to the directory and roster. The same contacts appear in the initial HTML, Markdown and JSON brief. Connect failures retain prior contacts marked stale. Team profiles are included only after a fresh PASTA lock check meets the Team tier amount and original-duration criteria (including its one-day tolerance). Failed, insufficient or expired checks exclude the profile; failed roster requests never restore old profiles. Each included member carries dated commitment evidence. The brief also hides expired proofs and observations older than 36 hours when served. Roles remain project labels; commitment is not real-world identity verification.

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
