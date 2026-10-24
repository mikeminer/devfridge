# Private RPC proxy: runnable template and deployment

Use when a browser or Seeker game needs a paid/private Solana RPC. Copy [assets/rpc-proxy](../assets/rpc-proxy/) to a dedicated server project; do not put it in a public assets directory. The template is generic and does not patch or deploy an existing game. The source and local fixtures are runnable with Node.js **24.18.0**, pinned in the `node-version.txt` template and the Dockerfile. The package has no dependencies. Review current Node/container advisories, verify the image and pin a digest before production; rerun tests when changing that pin. A Dockerfile alone does not mean the image has been built, security-scanned or deployed.

The game talks to `https://rpc.your-game.example/rpc`. Only the server knows `RPC_UPSTREAM_URL`, including the Alchemy/provider credential. Configure that URL in the host's server-side secret store or a private environment file. Never put it in `NEXT_PUBLIC_*`, `VITE_*`, JavaScript bundles, APK resources, screenshots, logs, analytics or repository history. A static password/token shipped in the APK is extractable and is **not** this design's access control. No seed phrase or signing key belongs on the proxy.

## Endpoints and failure semantics

| Endpoint | Behaviour |
| --- | --- |
| `POST /rpc` | JSON-RPC 2.0, bounded single request or batch. IDs are safe integers or 1–64 ASCII letters/digits/`_.:-`; notifications are denied. No query string or client-selected upstream. |
| `OPTIONS /rpc` | Approved browser origin, POST and Content-Type only; no cookie/credential CORS. |
| `GET /healthz` | `{ "ok": true }`, no upstream call, endpoint, provider, key or wallet data. This is process liveness only. |

Malformed or forbidden requests get HTTP 400/403/405/413/415; exhausted budgets get 429 with Retry-After, capacity gets 503. JSON-RPC upstream failures use a fixed message and numeric error code; provider messages, bodies and error data are discarded. Successful results receive defense-in-depth redaction of the full endpoint, query values and path pieces. Pieces under eight characters match complete tokens so a public route such as `/v2` does not corrupt unrelated base58 keys; longer values also match embedded occurrences. This cannot detect arbitrary re-encoding or an unknown provider's secret format: use a trusted provider and never rely on response scrubbing to make a secret-bearing client architecture safe. Do not log the upstream object or raw request/response body through a hosting error reporter. The optional logger receives only status, number of RPC calls and elapsed time.

`sendTransaction` success is a **signature, not confirmation**. On an attempted send with timeout, disconnection, malformed/oversize response or provider error, the proxy returns an unknown outcome where it can respond; it never retries the send. A lost HTTP response is also unknown, even if it has no JSON error body. Keep the original signed transaction/signature and blockhash validity evidence, query status and the confirmed transaction, and verify the expected payer, recipient, amount, instruction and unique game receipt before granting access. Do not request another payment simply because this endpoint timed out. The proxy does not implement wallet ownership, payment consumption, replay protection, Season Pass entitlement or score authorization; those stay in the game's verified server rules.

## Method policy

The default set contains only these reads; use `RPC_METHODS` to narrow it for the game. All supported options are validated and unknown options rejected. Confirmed is the default commitment; only confirmed/finalized are allowed. No WebSocket proxy is supplied; use bounded HTTP status polling with backoff and pause background polling.

| Methods | Bounds / supported shape |
| --- | --- |
| `getAccountInfo`, `getMultipleAccounts` | 32-byte base58 public keys; at most 64 accounts; base64 data. |
| `getProgramAccounts` | Only a configured program/mint/schema rule with all four exact filters described below. No broad query, extra filter, jsonParsed or dataSlice. |
| `getTokenAccountsByOwner` | Owner plus one configured mint; no token-program-wide filter. Mints from GPA rules are also allowed here. |
| `getTokenAccountBalance`, `getBalance`, `isBlockhashValid` | One 32-byte base58 account/blockhash and bounded read options. |
| `getLatestBlockhash`, `getBlockHeight`, `getSlot`, `getGenesisHash` | Validated read options; genesis hash takes no parameters. |
| `getSignatureStatuses` | At most 20 exact 64-byte base58 signatures; optional boolean searchTransactionHistory. |
| `getTransaction` | One signature; JSON or base64, maxSupportedTransactionVersion 0. |
| `getSignaturesForAddress` | Limit 1–100, default 20; validated before/until signatures. |
| `getMinimumBalanceForRentExemption` | Account size 0–16,384 bytes. |
| `getFeeForMessage` | Canonical base64, at most 1,232 decoded bytes. |
| `simulateTransaction` | Off until explicitly enabled; bounded transaction/program checks below. |
| `sendTransaction` | Off until explicitly enabled; every signature verified locally; bounded transaction/program checks below. |

Do not silently broaden the allowlist to satisfy an SDK. Record its exact failing method/options, verify why the game needs them and add a narrow validator plus denial tests. A program-account response can still exceed the cap even with valid filters; report incomplete evidence, never an authoritative “no pass” or successful verification.

### Bounded Fridge account query

Set `RPC_TOKEN_MINTS` to the game's approved mint(s). For Season Pass discovery, set `RPC_GPA_RULES` to a JSON array of explicit schema rules. The following is a **configuration shape**: replace `GAME_MINT` with the real verified 32-byte base58 mint; leaving the placeholder makes startup fail.

```json
[{"programId":"9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6","mint":"GAME_MINT","dataSize":105,"discriminatorHex":"08ff24cad2163989","depositorOffset":8,"mintOffset":40}]
```

These Fridge schema values come from the dated IDL evidence in [program-and-verification.md](program-and-verification.md), not a fresh assertion about the live deployed binary. Recheck deployment/schema before a game's release. A permitted client query must include exactly `dataSize:105` and memcmp filters at 0 (the base58 encoding of the eight discriminator bytes), 8 (the wallet) and 40 (the configured mint). Order is flexible; offsets, sizes, encoding and values are not. Rules are capped at eight. Returned accounts still require owner, discriminator, PDA, vault, mint, amount, expiry and wallet verification in [season-pass.md](season-pass.md). A client-supplied wallet filter does not prove ownership of that wallet.

### Simulation and optional signed relay

Set `RPC_ENABLE_SIMULATION=true` only if this service must simulate transactions, and `RPC_ENABLE_SEND=true` only if the wallet flow actually sends via this service. Some wallets perform broadcasting themselves. Each enabled transaction method requires `RPC_TX_PROGRAM_IDS` (every allowed top-level instruction program) and `RPC_REQUIRED_TX_PROGRAM_IDS` (a nonempty subset; at least one must appear). For a Fridge activation flow, the required program would be the verified Fridge program; include only the additional top-level programs the real builder uses, such as compute-budget or associated-token instructions. Do not copy a generic “allow every program” list.

The decoder bounds serialized transactions to 1,232 bytes, eight signers, 64 static accounts and 16 instructions. It accepts legacy and v0 messages with **no address lookup tables**; unsupported routes are rejected. It validates indices, exact bytes consumed and the explicit program policy. `sendTransaction` verifies every Ed25519 signature, forces base64 and preflight, and caps maxRetries to 2 (default 0). Unsigned simulation is allowed with sigVerify false; replacing the blockhash cannot be combined with signature verification. Simulation can return at most ten requested base64 accounts and no inner instructions.

This is a bounded relay policy, **not full transaction intent validation**. It cannot establish the payer's ownership or an expected recipient, amount, mint, expiry, slippage or account permissions merely from a program allowlist. Verify those separately for the actual transaction before presenting it and after confirmation; the wallet owns signing. Required-program presence does not prevent unrelated instructions to other allowed programs. If the game needs a server-authorized transaction service, add a one-use server intent and exact instruction/account verification; do not represent this generic proxy as that service. Optional in-game market routes that use lookup tables need a separately reviewed validator or their own appropriate integration, not silent relaxation here.

## Origins, native callers and IP identity

`RPC_ALLOWED_ORIGINS` is a comma-separated list of exact HTTPS origins, without paths or trailing slashes. No wildcard. For localhost development only, `RPC_ALLOW_HTTP_LOCAL_ORIGINS=true` permits HTTP localhost/loopback origins. The upstream still requires HTTPS. The server binds loopback by default.

Origin/CORS prevents an unapproved browser page from reading the endpoint; **it is not authentication**. A non-browser client can forge an allowed Origin. Native apps often have no Origin: they are denied unless `RPC_ALLOW_NO_ORIGIN=true`. If enabled, `RPC_NATIVE_METHODS` is a separate subset and defaults to reads even when browser simulation/send are enabled. Add transaction methods to that subset only for an approved native flow. This remains a public, budget-limited service; it does not prove Seeker ownership. For higher-value access use a server-issued short-lived session after a verified nonce/signature or the app's supported identity flow, plus per-account limits and replay protection. Do not put a shared “native API key” into the app.

Without `RPC_TRUST_PROXY_IPS`, the quota key is the TCP peer; arbitrary X-Forwarded-For and X-Real-IP are ignored. Behind an edge this can group all players under one edge IP, reducing availability but avoiding spoofed limits. Set **only exact edge peer IPs** after the edge is configured to overwrite X-Real-IP from the actual client connection and direct access to Node is blocked. A configured trusted peer requires a single valid X-Real-IP for `/rpc`; comma-separated lists, hostnames and malformed addresses are rejected. X-Forwarded-For is never parsed. Health probes use their actual peer and need no forwarded header. If the platform has changing proxies and cannot provide this guarantee, leave trust disabled or implement its documented trusted-proxy adapter with tests. Never trust `0.0.0.0/0` or an arbitrary incoming header.

IPv4-mapped IPv6 addresses normalize to IPv4. Native IPv6 quotas group a `/64` to reduce address-rotation bypass; this can group legitimate clients. IP limits cannot identify users behind NAT, stop distributed abuse, or guarantee a fixed number of simultaneous players.

## Defaults and quota budgeting

| Control | Default |
| --- | --- |
| Request / response cap | 32 KiB / 1 MiB; response cap also applies to the combined batch |
| Batch length | 5; all members validated before any upstream call |
| Body / upstream deadline | 5 / 6 seconds |
| Per-IP / global sustained units | 60 / 600 per minute |
| Per-IP / global burst | 30 / 100 units |
| Active HTTP requests | 4 per IP, 24 global |
| Active upstream RPC calls | 8 per IP, 24 global |
| IP quota entries | 10,000; idle entries may expire after two minutes |

Each HTTP request, including a rejected request, preflight or health probe, costs one unit after IP admission. Each approved RPC member additionally costs 10 for program-account queries/simulation/send, 5 for transaction/history reads, and 1 for other reads. This is a local policy unit, **not the provider's compute-unit bill**. Bodies are streamed with a cap, headers are bounded and sockets have timeouts; the edge must also cap slow headers, total connections and request size. All quota and concurrency state is in memory per process. A restart resets it, replicas multiply it and distributed attackers can exhaust it. Put aggregate limits at the edge and provider account/project level; for multiple instances use a shared budget/limiter. Do not promise unlimited protection, a hard monetary ceiling or “2,000 simultaneous players” from these defaults.

Before rollout, estimate each session's reads/simulations and the provider's current billing weights. Set a low dedicated project budget/alerts and any supported hard usage limit with the owner; cap autoscaling, upstream concurrency and edge request rate. If the provider offers alerts but no hard cap, say so and plan an operational kill switch. Report 429/503 with polite backoff; cache non-personal safe reads briefly where appropriate, never cache wallet entitlement indefinitely. Load test a staging endpoint within an approved budget, including NAT/mobile traffic, not the paid upstream by accident.

## Deploy on a Node host or container

1. Copy this directory to its own server project. Run `node --test server.test.mjs` with the pinned Node 24 release. Tests only create local HTTP fixtures; no provider credential or chain access is needed.
2. First copy `gitignore.txt` to `.gitignore`, `dockerignore.txt` to `.dockerignore` and `node-version.txt` to `.node-version` in the dedicated server directory. The templates have public filenames for reliable download; the copied ignore files protect the real deployment. Create a **server-only** `.env` from `env.example.txt`, or configure equivalent host secrets. Fill your own provider's HTTPS URL, actual game origins and required mint/schema rules. Empty credentials fail closed. Keep transaction methods and native no-Origin disabled until needed. Do not commit `.env`.
3. For a plain Node host, run `node --env-file=.env server.mjs` as a dedicated unprivileged service behind the host's TLS edge. Bind `127.0.0.1:8787` when the edge is on the same host; bind a private interface for a controlled private network. For a managed host that requires `HOST=0.0.0.0`, ensure only its TLS ingress reaches the port. Use a service manager with restart/backoff and the secret-free health probe; keep raw-body/error reporting off.
4. The optional container recipe below uses only explicit source COPY statements. Runtime secrets are not build arguments or image layers. Create the environment file on the host outside the build context with restrictive permissions. The image pin must be verified/digest-pinned for the deployment; no image build was performed while writing this template.

```sh
docker build --pull -t game-rpc:1.7.5 .
docker run -d --name game-rpc --restart unless-stopped \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 256m --cpus 1 --pids-limit 64 \
  --env-file /secure/game-rpc.env --env HOST=0.0.0.0 \
  --publish 127.0.0.1:8787:8787 game-rpc:1.7.5
```

5. Terminate HTTPS at the approved reverse proxy/CDN. For example, a Caddy edge on the same host can use the following mapping; replace the example hostname with a domain you control. The `header_up` **overwrites** the supplied client header. Do not configure Node to trust that peer until its actual IP has been checked and bypass access is blocked. With Docker, Node may see a bridge peer rather than loopback; do not guess it or trust the whole bridge range.

```caddyfile
rpc.your-game.example {
  request_body {
    max_size 32KB
  }
  reverse_proxy 127.0.0.1:8787 {
    header_up X-Real-IP {remote_host}
  }
}
```

The Caddy example is a TLS/reverse-proxy mapping, not an aggregate rate limiter or provider budget. Add the deployment's real edge rate/connection/body limits and spending controls separately. If another CDN sits in front of Caddy, `{remote_host}` is that peer; use its documented trusted-client configuration before treating a forwarded address as a user IP. Keep access logs free of secrets and wallet/request bodies. The upstream URL is fixed by trusted deployment configuration, not a client allowlist; restrict server egress if the environment needs DNS/private-network SSRF controls.

6. Configure browser/Seeker clients with only the public HTTPS `/rpc` URL. Do not use WebSocket subscriptions through this HTTP-only endpoint. Test health, approved browser and native routes, rejected origins/methods and quota recovery on the deployed service. An HTTP 200 health response does not test the upstream. Use one approved read such as getLatestBlockhash for a real provider check, verify mainnet genesis against your chosen cluster, then record time and outcome without credentials. Do not send or sign a real transaction for a health check.
7. Inspect the generated website bundles, APK and public logs for the private host/key using a local scanner without printing matches. Confirm the provider URL is absent, edge bypass is blocked, spending controls are configured, and mobile timeout/retry UI preserves unknown payments. Record “not verified” for any untested deployment/device behaviour.

## Evidence and source review

Local automated fixtures cover HTTP origin/native policy, canonical read options, fixed schema/mint filters, malformed/duplicate batches, transaction signature and program restrictions, upstream error redaction, refused redirects, body/response caps, unknown send outcomes, quota refill, forwarded-header spoofing, IPv6 grouping, bounded IP state, concurrency cleanup and slow uploads. They do **not** establish live provider compatibility, deployed TLS/edge settings, container availability, billing protections, mobile wallet behaviour or payment authorization.

Official sources reviewed **2026-10-24**: [Solana getProgramAccounts](https://solana.com/docs/rpc/http/getprogramaccounts), [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction), [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [Node 24 HTTP server](https://nodejs.org/docs/latest-v24.x/api/http.html), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) and [request body cap](https://caddyserver.com/docs/caddyfile/directives/request_body). Recheck provider support and wallet-specific behaviour for the generated game; this narrower template deliberately does not expose every Solana RPC option.
