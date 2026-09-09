# Production source alignment before PR #41 merge

The GitHub scanner tree was missing code and assets already published by CLI deployments. Merging the previous PR would have redeployed an older World/Connect implementation. This change restores the production inputs and retains the Solana evidence fixes.

Source-of-truth deployments, verified through Vercel's source-file manifest:

| Surface | Deployment | Source files checked |
| --- | --- | ---: |
| Scan, World, Connect, Docs, SDK, Bridge and related aliases | `dpl_3zAycYtNmSCx9V8SUEFyXSRrRE42` | 275 |
| Main DevFridge dApp | `dpl_EVuLFJhgbAnumKp6RvMYGxjzXDn8` | 45 |

The Team production deployment identifies commit `2a8914016a37c8ac26ef95bdecf0a9a43504391a`; Team application source is unchanged from that commit. Its existing knowledge-only build guard is retained. The separate Vercel `fridge` service identifies `cc9a41351e1363360fe74bc97e44cbbcc5607210`; no bot source is modified by this alignment.

Restored features include the World launch countdown, gameplay assets and audio, guide/share interactions, the inline Paragraph email form and server-side SDK route, Connect's publication/community/CEO links, IR/Synapse/Marketing links, and the main dApp's Pump.fun TVL pricing behavior.

The two intentional differences from CLI deployment inputs are `app/vercel.json` and `scan/vercel.json`: both retain the already-committed `ignoreCommand` that skips knowledge-only website builds. All other deployment settings match. These guards allow this feature-restoration commit to build. No production secret is added to Git. The existing sensitive Production variables `PARAGRAPH_API_KEY`, `KV_REST_API_URL` and `KV_REST_API_TOKEN` remain on the same scanner Vercel project.

## Recheck source parity

```sh
node scripts/verify-live-baseline.cjs
```

The [baseline manifest](live-baseline-2026-09-09.json) records each original source SHA-1 and a normalized SHA-256. Text CRLF/LF differences are ignored; binary game/audio/image files must match byte-for-byte. The check intentionally covers a historical snapshot; it is a pre-merge audit, not an invariant for all future feature changes.

## Build and regression checks

```sh
npm ci --prefix scan
node --test scan/tests/*.test.cjs
npm run build --prefix scan
npm ci --prefix app
npm test --prefix app
npm run build --prefix app
```

The newsletter tests use isolated in-memory providers: no email is sent. They cover consent, origin validation, body limits, rate limiting, missing configuration, and Paragraph success/failure behavior. Production email delivery is not inferred from mocked tests. Preview deployments do not have the Production-only Paragraph/Redis secrets; do not copy those secrets into Preview merely to exercise the form.
