# Proposed technical integration discussion

Subject: Solana protocol-account classification: DevFridge timelocks and PumpSwap reserves

Hello Webacy team,

I'm the developer of DevFridge, a Solana Token-2022 timelock program (`9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`). I'd like to contribute independently verifiable protocol data for your holder analysis.

Our reproducible example is mint `39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump`. The DD top-holder view includes the canonical PumpSwap pool owner and a DevFridge lock PDA. At finalized slots 445691026–445691030, the pool held about 76.76% of mint supply and that vault held 100 million tokens (about 10.38%), with an unlock time of 18 August 2027 at 22:02 UTC.

The displayed balances agree with on-chain state. We'd like to clarify whether and how the UI and concentration signals distinguish AMM reserves, beneficial ownership, and balances currently subject to a timelock. We are not asking for a safe-list or for historical bundling/sniping signals to be removed.

We have prepared a generic decoder, raw RPC fixtures, negative tests, and reproduction instructions. The decoder verifies owners, discriminators, PDA/ATA bindings, actual balances and expiry against the Solana clock. It preserves the beneficiary and discloses program upgrade authority and Token-2022 controls. We have also corrected our scanner's own provider-error and metadata interpretation issues.

Your documentation mentions direct protocol-data integrations. Which interface or repository would you recommend for reviewing this adapter? Would you prefer protocol fixtures, a data feed, or an SDK example after agreeing the schema and licensing? Can you also clarify the denominator, protocol-account treatment and historical observation window used by this DD report?

Evidence and instructions: `integrations/webacy/README.md` in the accompanying DevFridge branch/PR.

Report: https://dapp.webacy.com/dyor/address/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump?chain=sol

Official project contacts: https://connect.devfridge.cool/
