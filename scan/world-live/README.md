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
