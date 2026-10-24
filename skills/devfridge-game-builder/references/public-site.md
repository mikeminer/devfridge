# Landing, privacy and terms generated from the actual app

For every Seeker release, prepare a public app/publisher website plus **separate HTTPS privacy and terms pages**. Browser games need the same accurate public disclosures when applicable. Reuse the owner's working domain and pages; do not overwrite established legal text or invent a legal entity, data practice, jurisdiction, address, age rating or refund policy. A real identity domain is a release requirement, not a reason to stop building locally.

Use [generate-site.py](../assets/public-site/generate-site.py) and [the configuration example](../assets/public-site/site.example.json). The agent fills the configuration from repository/provider evidence and the owner's confirmed facts, generates the pages, then deploys within the already authorized hosting scope. Ask only for missing facts that cannot be established from the project. Never ask the user to paste an RPC key or keystore into this configuration.

```sh
python assets/public-site/generate-site.py --config game-site.json --out public-site-draft --draft
# Fill every placeholder, review against the actual app and set factsReviewed: true.
python assets/public-site/generate-site.py --config game-site.json --out public-site-release
python -m unittest discover -s assets/public-site -p '*_test.py'
```

The generator creates `index.html`, `privacy/index.html`, `terms/index.html`, responsive CSS, robots rules and a hash/URL manifest. Drafts are visibly marked and noindex. Release generation rejects example domains, unresolved example copy, unsafe URLs and detected secrets; it escapes prose and never overwrites an existing output directory. `factsReviewed` records the builder's review; it does **not** establish legal compliance, domain ownership or Store acceptance. The supplied starter headings are English; generate and review separate translated pages when required rather than labeling English headings as another language.

## Facts to resolve

- Publisher/app identity, real support contact, intended audience, actual supported platforms and owned identity domain. For `seeker-bundled` only, publish a support/landing site without a web-game button. This does not make Game Room inclusion applicable.
- Data actually processed: wallet/public chain data; local preferences/saves, authorization and pending payment state; backend scores/accounts; RPC/proxy and hosting IP logs; retention and deletion; external wallet services. A bundled APK with online RPC is not automatically a no-data app.
- Only the selected ads, analytics, crash reporting and other third parties, with purposes and relevant privacy links in reviewed prose. The default generated site adds no trackers, cookies, external fonts or analytics itself. This does not make claims about the game or its host.
- Real free/paid access, prices/durations/network fees, recipient and refund/recovery behavior. If the Fridge Season Pass is selected, disclose its 2% fee and route restrictions accurately. Do not add financial promises or sample-game fees.
- Intellectual property, conduct, availability, consumer rights and applicable dispute rules consistent with the publisher's actual circumstances. Obtain appropriate legal review where needed; the generator cannot decide these facts.

## Release acceptance

Deploy the static output to the actual approved host. Verify all three URLs over HTTPS without login, redirects to unrelated sites or placeholder content; test navigation and support contact on mobile. Compare statements to the exact build and current provider behavior. Connect the native/browser wallet identity to the same owned origin, following its actual SDK and domain-verification requirements; the generated URL manifest alone does not prove ownership or implement Digital Asset Links.

Scan output and archive for secrets. Keep public files separate from server environment settings. Record the live URLs/status in release evidence and link them from the Store and app settings. Keep this site and disclosures updated when ads, RPC providers, account/data practices or payments change.

Sources reviewed 2026-10-24: [new-app submission](https://docs.solanamobile.com/dapp-store/submit-new-app), [listing requirements](https://docs.solanamobile.com/dapp-store/listing-page-guidelines).
