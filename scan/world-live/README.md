# World live worker

Long-lived Node process that keeps Rapier worlds in RAM. Redis remains the source of truth (CAS). Next.js still does origin checks, `start`, and Solana/EVM. The worker only runs `move` / `finish`.

Security is the same protocol: sealed ticket, sequenced nonce, server physics, no replay uploads, no optimistic drops.

## Run locally

From `scan/`:

```
WORLD_LIVE_WORKER=1 PORT=8787 WORLD_LIVE_SECRET=... TOPSHELF_RUN_SECRET=... KV_REST_API_URL=... KV_REST_API_TOKEN=... npx tsx world-live/server.ts
```

Then in the Next app:

```
WORLD_LIVE_WORKER_URL=http://127.0.0.1:8787
WORLD_LIVE_SECRET=<same secret, 32+ chars>
```

Without those two Next env vars, live moves stay in-process (current Vercel fallback).

## Fly.io

```
cd scan
fly apps create devfridge-world-live
fly secrets set WORLD_LIVE_SECRET=... TOPSHELF_RUN_SECRET=... KV_REST_API_URL=... KV_REST_API_TOKEN=... -a devfridge-world-live
fly deploy --config world-live/fly.toml --dockerfile world-live/Dockerfile -a devfridge-world-live
```

Set on Vercel (world.devfridge.cool):

```
WORLD_LIVE_WORKER_URL=https://devfridge-world-live.fly.dev
WORLD_LIVE_SECRET=<same>
```

Keep `min_machines_running = 1` and `auto_stop_machines = off` so the RAM cache stays warm. One machine = sticky. Two machines still correct (Redis CAS); RAM hit rate drops.

GET `/health` → `{ ok, worker, worlds }`.
# Live verification regression checks

From `scan`, run `node --test tests/live-verification.test.cjs tests/live-client-v2.test.cjs`.
The physics suite compares all ten characters across warm, cold and alternating worker
sessions and verifies the final server-recorded replay. It also rejects forged scores,
branches, uploaded replays and accelerated timelines.

Warm worlds must cross `checkpointPhysics` after each accepted drop, just like the
browser and cold snapshot restore. Store the snapshot **before** that restore so a
warm reuse and a cold restore cross exactly the same boundary.

Gateway and worker rate limits have separate namespaces; counting both in the same
bucket halves the intended allowance. Exact concurrent retries return the committed
acknowledgement. The client freezes its simulation while retrying a temporary error.

Worker changes require a separate Fly deployment in addition to the Vercel deployment.
`GET /health` reports `physicsCheckpoint: 2` for the corrected worker. Rejected live
transitions log their run ID, action, sequence, tick and verifier reason, without tickets
or wallet signatures. A previously interrupted unconfirmed score cannot be registered
by uploading a local replay.
