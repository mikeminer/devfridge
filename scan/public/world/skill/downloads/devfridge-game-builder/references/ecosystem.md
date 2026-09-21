# Ecosystem integration map

Reviewed 2026-09-22 against the live graph, docs, SDK and repository. Choose a subset. A product link does not prove a third-party API or permission to use its production infrastructure.

| Component | Appropriate game use | Boundary |
| --- | --- | --- |
| [Fridge](https://devfridge.cool) | Player-created Solana Token-2022 timelocks | Depositor vaults, expiry/redeem; [docs](https://docs.devfridge.cool/fridge) |
| [SDK](https://sdk.devfridge.cool) | Read locks, access plans, lock/scan/badge URLs | No custody, authentication, score verification or transaction submission |
| [Scan](https://scan.devfridge.cool) | Mint report from onboarding | Automated evidence, not an audit; [methodology](https://docs.devfridge.cool/methodology) |
| [Badge](https://scan.devfridge.cool/badge) | Live supply-lock badge next to the token | Per-mint aggregate, never proof this player qualifies |
| [FrigoPasta](https://bot.devfridge.cool) | Telegram /scan, /fridge, /badge and /register lock-PDA expiry guidance | Read-only; no public game-notification API established |
| [Feature](https://docs.devfridge.cool/feature) / [Boost](https://docs.devfridge.cool/boost) | Optional discovery link | Paid scanner placement, independent of risk grades; never auto-purchase |
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

A small integration can be game + Phantom + Fridge/SDK with Scan/Badge in the token chooser. Social, EVM, bridges, payments and rewards remain separately scoped choices.

Known conflict: the current ecosystem graph and some World prose say local scores/no prizes, while repository code and the deployed TopShelf leaderboard expose optional Robinhood score registration and season claims. Do not blend these claims. Inspect the selected game version/contract, label unresolved details and confirm third-party access with its operator.
