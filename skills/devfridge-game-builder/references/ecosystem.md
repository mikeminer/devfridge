# Ecosystem integration map

Reviewed 2026-09-22 against the live graph, docs, SDK and repository. Choose a subset. A product link does not prove a third-party API or permission to use its production infrastructure.

| Component | Appropriate game use | Boundary |
| --- | --- | --- |
| [Fridge](https://devfridge.cool) | In-app Season Pass on the existing Token-2022 program | Per-deposit amount/duration verification; developer mechanics in [program guide](program-and-verification.md), player terms in [Season Pass](season-pass.md). No new contract. |
| [SDK](https://sdk.devfridge.cool) | Optional read-only compatibility path, Scan/badge links | Summed floored-day plans differ from Season Pass tiers; no custody, authentication, score verification or transaction submission |
| [In-game token market](in-game-market.md) | Optional Buy <TOKEN> screen without leaving the game | Ask separately; detect curve/pool routes on-chain, quote, simulate, validate and recover uncertain outcomes. Never buy as a demonstration. |
| [Scan](https://scan.devfridge.cool) | Mint report from onboarding | Automated evidence, not an audit; [methodology](https://docs.devfridge.cool/methodology) |
| [Badge](https://scan.devfridge.cool/badge) | Live supply-lock badge next to the token | Per-mint aggregate, never proof this player qualifies |
| [FrigoPasta](https://bot.devfridge.cool) | Telegram /scan, /fridge, /badge and /register lock-PDA expiry guidance | Read-only; no public game-notification API established |
| [Feature](https://docs.devfridge.cool/feature) / [Boost](https://docs.devfridge.cool/boost) | Optional discovery link | Paid scanner placement, independent of risk grades; never auto-purchase |
| [OnlyFridge Club](https://club.devfridge.cool/download/onlyfridge-club) | Optional promotion before every new Free Play round | Ask the owner before building; explicit player click to open; Continue without opening/installing. See [integration](free-play-sponsors.md). |
| [OnlyFridge Game Room](https://onlyfridgeclub.online/) | Optional discovery/catalog inclusion for web-delivered games | Offer for Browser, Both or Seeker + hosted website; not Seeker + bundled only. Independent of Free Play and ads; verify the actual operator integration/review process and live status. See [Game Room](game-room.md), reviewed 2026-10-23. |
| [Scan Sponsored feed](https://scan.devfridge.cool/api/feed/boosted) | Optional top sponsor card during Free Play, or YOUR AD HERE | Separate owner choice before building; validated active boosts through the game's server adapter; no ads in paid/token-gated modes. See [integration](free-play-sponsors.md). |
| [World](https://world.devfridge.cool) | Reference for 3D, mobile, avatars and sharing | Ten mints/threshold are game-specific; check art/source licences |
| [TopShelf](https://world.devfridge.cool/leaderboard) | Season score/pool/claim architecture reference | Robinhood, separate from Solana access; operator/signer-controlled, not an open API for arbitrary games |
| [Trust Me Capital](https://capital.devfridge.cool) | External community information | Hyperliquid vault activity is not game income or token-holder equity |
| [Trust Rewards](https://capital.devfridge.cool/rewards) | Membership reference | Robinhood TimeVault/account-bound points, not Solana locks |
| [Kitchen desk](https://meme.devfridge.cool) | External holder community | Its access policy is separate from the new game |
| [Bridge](https://bridge.devfridge.cool) | Link when a selected asset has a verified route | Same ticker on two networks does not establish redeemability |
| [Connect](https://connect.devfridge.cool) | Official addresses/contacts | Do not substitute its tokens for the developer's own mint |
| [Synapse](https://synapse.devfridge.cool/brief.json) | Dated evidence for optional information panels | Snapshot, not a price feed or authorization source |
| [Health](https://health.devfridge.cool) | Status links/outage handling | No invented SLA; green status is not proof of access |
| [Team](https://team.devfridge.cool) | Contributor/roster link | Separate membership, not game authentication |
| [PastaCast](https://pastacast.devfridge.cool) | External lore reference if wanted | Confirm availability/asset rights; no assumed SDK |
| [Docs](https://docs.devfridge.cool) / [listing kit](https://docs.devfridge.cool/listing-kit) | Access explanations/release material | Submissions/publication are separate actions |

A small integration can be game + the runtime's verified wallet adapter + an in-app Season Pass on Fridge: Phantom/browser wallets and optional Seeker Connect web on the website, compatible Seeker Connect/Mobile Wallet Adapter in the Android host. SDK, Scan/Badge and the in-game market are optional. Bundled/hosted asset delivery does not determine wallet transport. Social, Game Room inclusion, advertisements, EVM, bridges, payments and rewards remain separately scoped choices. The Season Pass and market use the game's own identity and plain wording; technical ecosystem names stay in developer documentation or the explicitly approved Free Play placements.

Known conflict: the current ecosystem graph and some World prose say local scores/no prizes, while repository code and the deployed TopShelf leaderboard expose optional Robinhood score registration and season claims. Do not blend these claims. Inspect the selected game version/contract, label unresolved details and confirm third-party access with its operator.
