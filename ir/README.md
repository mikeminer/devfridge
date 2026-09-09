# DevFridge Investor Relations

Public chat: https://ir.devfridge.cool . Grok answers in the language of each question using Synapse, current official documentation and X search restricted to `anonimocommando`. The interface offers an initial welcome, suggested questions, streamed answers, source links and an optional Solana tip address.

The product is positioned for advisors and introducers connecting corporate clients and major investors with the founder. It helps prepare investor briefs and diligence questions. The visible referral section is explicitly a proposal: conversation signed by the client wallet → verified eligible investment → creator fees attributable to that wallet’s actual trading volume reward the intermediary. The beneficiary and creator-fee funding source are defined. The share, attribution window and payment terms still need confirmation. The fee base is the sum of creator fees actually received from eligible verified client-wallet trades, using each asset/venue’s applicable fee; it excludes other wallets’ volume and unrelated protocol/LP fees. Signing/submission, attribution, fee accounting and payouts are not implemented or advertised as live. Grok's instructions preserve this status; the chat cannot create a reward entitlement or send a conversation to anyone.

The fixed tip address `GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W` was checked against the published pappardelle.sol CEO profile, associated with the same X handle, in Synapse's verified Team evidence on 9 September 2026. It is a wallet, not the PASTA mint or a lock PDA. Tips do not affect answers.

## Sources and privacy

The server retrieves Synapse's Markdown brief plus the program and SDK docs, cached for five minutes per runtime instance. Grok can request any of the 15 explicitly allowed documentation pages; it cannot fetch arbitrary URLs. If Synapse is unavailable the request fails visibly. Missing documentation is labelled unavailable. X search is invoked when relevant, with exact post citations and a visible indicator of whether the tool was used. Searches may not find every post. Source data is treated as untrusted, separate from server instructions.

History exists only in the open browser tab and is sent with each question. No application database or chat log is created. Messages are processed by Vercel AI Gateway and xAI under those providers' policies; xAI response storage is disabled with `store:false`. Application error logs contain stage, error type, source failure status and timeout status, not questions, answers or credentials.

## Runtime and publication

Uses Node 24, AI SDK 7 and the live Gateway catalog's `spacexai/grok-4.6` model. `IR_MODEL` may override it with a compatible Grok model. AI Gateway authenticates using project-scoped Vercel OIDC at runtime; no key is sent to the browser. For local development, obtain a current project OIDC environment file via `vercel env pull`, then use `node --env-file=.env.local server.mjs`. Never commit environment files.

Run `npm ci`, `npm test` and `npm run build`. The local server listens on port 4180. The production Vercel project is `devfridge-ir` with `ir.devfridge.cool` attached. Export this directory to a standalone publishing folder, excluding `server.mjs`, `node_modules`, `dist`, `.env*` and `.vercel`. Retain the destination's Vercel project link and credentials; deploy with `vercel --prod`. Do not deploy the parent Scanner project. Synapse links to the chat independently.

The production firewall limits `/api/chat` to eight requests per minute per IP. This is a platform rule configured outside the repository; recreate it when moving projects. API inputs are capped at seven alternating messages, 2,000 characters per question, 30,000 total characters; generation is capped at three agent steps and 2,200 output tokens per step with a 52-second timeout. These limits reduce abuse but are not a total billing cap. Check Gateway usage and budget settings when changing traffic or model limits.

## License

This chat follows the repository's BSL 1.1 license. See the root LICENSE for its additional grant and change terms. Dependencies retain their respective licenses.
