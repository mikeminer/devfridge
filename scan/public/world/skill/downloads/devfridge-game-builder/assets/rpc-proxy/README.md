# Private Solana RPC proxy template

Node.js **24.18.0**, standard library only; no install step or runtime dependencies. The supplied tests use loopback HTTP fixtures and synthetic signatures only. They never call Solana or send a real transaction.

```sh
node --test server.test.mjs
```

The downloadable templates use visible filenames so static hosts can serve them safely. In your dedicated server project, copy `gitignore.txt` to `.gitignore`, `dockerignore.txt` to `.dockerignore`, and `node-version.txt` to `.node-version` before creating secrets or building an image. Copy `env.example.txt` to a private server `.env`, fill your own provider URL and exact game origin, then run:

```sh
node --env-file=.env server.mjs
```

The only public application endpoint is `POST /rpc`; `GET /healthz` is secret-free liveness, not proof of upstream health. The private URL exists only on this server. Browser/APK builds contain the public proxy URL, never the provider URL or a shared static proxy password.

Read [the deployment, policy and verification reference](../../references/rpc-proxy.md) before publishing an endpoint. It covers fixed mint/schema query rules, optional transaction relay, exact Origin limits, native no-Origin access, trusted-edge IPs, budgets, HTTPS and operational limitations.

The Dockerfile is a deployment template, not evidence that an image was built or a service deployed. It copies only the two source modules and package metadata. The supplied Node pin is the locally tested release, not a claim to be the newest secure patch. Review current Node/container advisories, verify the image and pin its digest before production; rerun the fixtures when changing the pin.
