# Android privacy operations

Policy effective 20 September 2026. Public English/Italian policy content is maintained in `scan/scripts/android-locales/privacy.mjs`; `npm run build:android` generates HTML and plain-text notices. The policy is served at `/android/privacy` and `/android/privacy-it`. This document is an operator procedure, not an assertion that every contractual/privacy obligation has been independently audited.

## Verified implementation and sources

| Processing | Implementation evidence | Retention/control |
| --- | --- | --- |
| Age check | `scan/app/api/world/compliance/route.ts`, `scan/lib/world-compliance.ts` | DOB checked without application storage; adult cookie 365 days |
| Self-exclusion | `scan/lib/world-compliance.ts` | 24h / 7d / 180d / 3650d; do not describe the last option as irreversible forever |
| Moves, state and run ticket | `scan/lib/topshelf/live-run.ts`, `registration.ts` | 21600-second server TTL; bounded in-memory cache is eviction/restart based |
| Mobile handoff | `scan/lib/topshelf/mobile-handoff.ts` | Original run expiry, up to 6h |
| Native approval/signature | `scan/lib/topshelf/mobile-signature.ts`, `registration.ts` | Up to 5 minutes / no later than run expiry |
| Verified proof | `registration.ts` | 90 days from creation |
| Activity log | `scan/lib/world-compliance.ts` | 90 days after latest write |
| Display name | `scan/lib/topshelf/names.ts` | No TTL; replacement or verified manual removal |
| Rate counters | `registration-security.ts`, `names.ts`, subscribe route | Usually 60s, names 300s, newsletter keyed IP hash 600s |
| Newsletter | `scan/app/api/world/subscribe/route.ts` | Explicit consent required; provider is Paragraph |
| Native app | `devfridge-world-mobile/app/src/main/AndroidManifest.xml`, `MainActivity.kt` in the companion workspace | INTERNET/VIBRATE; no backup; share-cache cleanup on next share, not a timer |
| Solana RPC | `scan/lib/rpc.ts` | Alchemy configured in production; Helius optional; public endpoint fallback |
| Hosting | Vercel project `prj_NqX4ZTxr7PZGmwGBeyapmINaRiyZ` | CLI verified Pro team on 20 Sep; no secret values printed |
| Optional worker | `scan/lib/topshelf/live-proxy.ts`, `scan/world-live/fly.toml` | Fly.io `iad` deployment supported; WORLD_LIVE_WORKER_URL was not listed in Vercel production env inventory on 20 Sep, so policy describes conditional use |
| Mail | Publisher configuration from this task | ImprovMX forwards welcome@devfridge.cool to the publisher's Gmail; do not publish the private forwarding destination |

The production environment confirms a Redis-compatible KV integration; the policy identifies its recipient category without inventing its vendor or region. Provider security logs/backups do not share application key TTLs. Do not state that all infrastructure logs disappear within 90 days, or that all providers process data solely in the EU.

Official references checked:

- GDPR Articles 6, 12–22 and Chapter V: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Solana Mobile Publisher Policy: https://legal.solanamobile.com/pl/publisher-policy
- Vercel Pro DPA / transfer clauses: https://vercel.com/legal/dpa
- Runtime log windows: https://vercel.com/docs/logs/runtime
- Google transfer frameworks: https://policies.google.com/privacy/frameworks
- Paragraph: https://paragraph.com/privacy
- ImprovMX: https://improvmx.com/transparency/privacy-policy/

## Handle an incoming privacy/deletion request

1. Monitor welcome@devfridge.cool. Record the date received, requested right and response deadline. Normally respond within one month; explain any lawful extension within the first month. Do not require a token purchase or a payment.
2. Ask for the minimum identifiers needed: public wallet(s), newsletter email, and any known run IDs. Verify control proportionately. If needed, use a fresh, purpose-specific non-transaction wallet message or a verification email to the subscribed address. Never request a recovery phrase/private key. Do not require identity documents by default.
3. Identify records with an authenticated backend connection. Relevant key patterns: `topshelf:name:4663:<lowercase EVM>`, `topshelf:proof:4663:<contract>:<runId>`, `topshelf:live:v2:<contract>:<runId>`, `world:log:v1:<runId>`, `world:exclude:v1:<Solana wallet>`. Handoffs/native challenges use the helpers in the corresponding source files. Use targeted lookup/controlled SCAN as necessary, not a blocking KEYS command or a bulk deletion.
4. For access/export, return only verified-requester data through the agreed channel. For correction/removal, act on the specific off-chain records under publisher control. A display name can be removed without changing the on-chain wallet link. Do not delete another wallet's records or tamper with the contract.
5. Assess whether any narrowly limited record must remain for an active self-exclusion, actual dispute, fraud prevention or legal obligation. Explain the specific reason and duration/criterion to the requester. Do not use a blanket blockchain exception to retain deletable off-chain data.
6. For newsletter withdrawal/removal, use Paragraph's subscriber controls, preserve only what is justified to honour the opt-out, and do not re-enrol the address. For email records, review the forwarded Gmail copies and attachments as well as any provider-held copies covered by a request.
7. Explain which records were removed, retained or beyond publisher control. Clearing local app data is not a server deletion. Public-chain records cannot be deleted, but off-chain mappings/names/support records must still be assessed separately.
8. Keep only the necessary record of the request and response. Reassess continued retention when the enquiry/dispute closes. Provider agreements and transfer safeguards must be maintained in the publisher's own account records; do not claim an unverified vendor/region or certification in public copy.

## Release boundary

The publisher requested removal of the personal name from the public notices on 20 September 2026. They now use the explicitly labelled public pseudonym pastaman and the support/privacy email. This editorial choice does not establish that a pseudonym satisfies GDPR Article 13 controller-identification requirements. Resolve legal controller identification before treating the notice as cleared for compliance; do not describe the pseudonym as a registered company or claim store/legal approval.

The APK already submitted to the store contains an older offline technical notice. Publishing this policy updates the URL in the store listing without replacing that signed APK. The new online notice explicitly identifies itself as the current policy. Sync the generated text notices to the Android document assets when preparing the next binary release; do not replace a published signed artifact under the same filename/version.
