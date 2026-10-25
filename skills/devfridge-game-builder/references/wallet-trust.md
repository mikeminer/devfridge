# Wallet trust and transaction simulation

Sources reviewed **2026-10-25**. Use this before proposing a Seeker dApp Store submission, and before any release whose wallet identity is shown to Seed Vault Wallet, Phantom or another wallet that simulates the domain. Local development may continue. A failed check blocks submission, not the rest of the build.

The wallet judges the domain in the Mobile Wallet Adapter identity and the transaction it is asked to sign. Listing text, a privacy URL and a signed APK do not replace that judgment. A v0.1.5 review rejection, "Transaction simulation: scam site detected", came from the identity domain, not from the APK signature.

## Real domain from the first submittable build

The identity URI (`identityUri` / `appIdentity.uri`) must already be a domain the owner has registered and controls:

- HTTPS, with a publicly trusted certificate
- `favicon.ico`, or the relative icon path the identity actually uses, returns HTTP 200
- `https://<domain>/.well-known/assetlinks.json` is JSON, with no redirect, and contains an `android_app` statement for this package name and the SHA-256 fingerprint of the **release** signing certificate

A placeholder such as `streetmeat.app`, a domain the owner does not control, or a local asset URL fails the gate. If any item is missing, do not propose that build for submission.

Confirm the live file and compare the fingerprint with `apksigner verify --print-certs` on the candidate:

```text
curl --fail --silent https://<domain>/.well-known/assetlinks.json
```

How to set the identity in Seeker Connect or MWA stays in [Seeker wallets](seeker-wallet.md). This page is the submission gate.

## Domains with a prior block are excluded

Before choosing the domain, search public wallet-warning reports for that exact hostname. Reject a host previously shown as a scam, malicious or blocked site. `devfridge.cool` is a known example and must not be a game's identity URI. Give each game its own domain. A clean search is not a clearance from Blockaid or Phantom.

## Reputation requests before Store submission

As soon as the real site is online, prepare two review requests. Send them only after the owner agrees:

- **Phantom.** Use the domain-review form linked from the current [domain and transaction warnings](https://docs.phantom.com/developer-powertools/domain-and-transaction-warnings) page. Checked 2026-10-25, that page links `https://docs.google.com/forms/d/1JgIxdmolgh_80xMfQKBKx9-QPC7LRdN6LHpFFW8BlKM/viewform`. Open the docs page again before sending. Do not use the retired Blowfish review form or `review@blowfish.xyz`.
- **Blockaid.** Open [Blockaid contact](https://blockaid.io/contact) and use the current Report an Issue / support portal for a false-positive or project-verification request. Recheck the live link. Do not pay a third-party whitelist service.

Wait several days, and finish the Seeker simulation test below, before proposing Store submission. Do not submit on the day the requests are sent. A filed request is not itself a pass.

## Simulation test on the Seeker

Before submission, the owner makes one real transaction from the game with Seed Vault Wallet on a physical Seeker and sends the screenshot. The agent does not sign it. Classify the wallet sheet:

| Sheet | Decision |
| --- | --- |
| An error, or "scam site", malicious or blocked | Block submission |
| "We cannot guarantee", or a new/unreviewed-domain caution | Allow only when the shown amounts are correct and both domain reviews are already submitted |
| A clean simulation with the correct amounts | Pass |

Treat equivalent wording the same way. Record the date, device, wallet, identity domain, amounts, classification and screenshot location in the notes for the reviewer. No screenshot means the test was not done.

## Transactions the wallet can simulate

Use one transaction per player action. Allow only known programs: the pinned Fridge program, the System Program, Token Program and Token-2022, plus the pump.fun programs the selected [market validator](in-game-market.md) already pins. Compute Budget and the Associated Token program are allowed only where the existing Season Pass or market validator already requires them. Amounts must be visible and match the reviewed product. No opaque instructions and no partial signatures.

The documented MWA −32601 sign-then-send of the **same complete** transaction stays in [Seeker wallets](seeker-wallet.md). That fallback is not a partial signature.

Submit the game mint for Jupiter verification at [verified.jup.ag](https://verified.jup.ag), the free standard submission. Do not call the Express API or pay 1000 JUP unless the owner explicitly authorizes that payment. Wallets may show an orange unverified-token mark until Jupiter marks the mint verified. Record the request. Do not claim the mark is gone until a fresh wallet view shows that.

## RPC with no key in the APK

A private or paid RPC requires a proxy. This is a submission requirement, not a preference. Follow [the RPC proxy](rpc-proxy.md): a fixed server-only upstream, a method allowlist, limits and no key in the client. A Cloudflare Worker that meets that policy is an acceptable host.

Scan the final signed APK, not only the source. Extract it and run [check-no-secrets.py](../assets/check-no-secrets.py) on the extracted tree. Also search the extracted strings for a provider host that carries a credential, such as an Alchemy or Helius URL with a key or a query secret. A hit blocks submission. The public proxy origin without a secret may appear. A source scan does not replace this APK scan.

## Content for review

When the game can show gore or violence, the submitted build and its screenshots default to **Off**: no blood, dismemberment or gore sound. Full and Reduced may remain as player settings after install. This is the submission default. Victims stay unambiguously adult.

Declare age **17+** with the content-rating control the portal actually offers. If no control is literally named 17+, use the offered classification that means 17+ and record its field name. Do not invent a field. A setting or rating does not guarantee acceptance.

Persist progress, and show **Continue** that restores it. Screenshots, including Continue and the Off state, come from the submitted build. Count, size and dimensions stay in [the Store guide](solana-dapp-store.md).

## When review says "Transaction simulation: scam site detected"

The cause is the MWA identity domain. The remedy is a real controlled HTTPS domain, favicon, `assetlinks.json` for the release certificate, Blockaid and Phantom reviews already sent, a passing Seeker classification, and a **new** APK with a higher `versionCode`. Put the domain, the two review requests and what changed in the note for the reviewer. Do not resubmit the same APK. Map the finding in [the Store failure table](solana-dapp-store.md#handle-review-failures-and-launch-requests).
