# Android download-page localization

Regenerate static pages with `npm run build:android` from `scan/`. Production `npm run build` also regenerates them through `prebuild`. Do not edit the generated HTML directly.

`regions.mjs` maps country choices to display languages and stable `/android/{country}` paths. `/android` remains international English; `/android/it` remains Italian. Canada offers English/French and India Hindi/English. Users make an explicit choice; there is no IP geolocation, external translation service, cookie or client-side script. Each URL preserves the selected country/language and can be bookmarked or shared.

The 24 country chapters were checked on https://superteam.fun/ on 19 September 2026. The publisher requested individual country/language choices for the regional Balkan chapter: Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Hungary, Kosovo, Montenegro, North Macedonia, Romania, Serbia and Slovenia. Italy is retained. This is a UI language catalogue, not a claim that each country has its own Superteam chapter, a partnership, or legal eligibility for paid TopShelf participation.

`base.mjs` retains English and Italian copy and legal-page context. `translations.mjs` supplies the same 46 named fields for every additional locale; the generator rejects missing or empty fields and missing flags instead of silently falling back to English. Product names and the actual Phantom control label remain unchanged. Arabic has RTL layout; complex scripts use suitable line height and spacing.

Privacy/rules documents remain in English and Italian, explicitly labelled as such on other-language landing pages. Their legal controller data remains distinct from the public footer credit, which is `Published by pastaman` linked to https://x.com/AnonimoCommando. Translation does not constitute final legal review.

Flags are unmodified local `flags/4x3` assets from the npm package `flag-icons@7.5.0` (https://github.com/lipis/flag-icons). The MIT license is included in `public/world/android/flags/LICENSE.txt`. No runtime npm dependency or remote flag requests were added.

The APK, signing certificate, download URL, version and hashes come from the existing `release.json`; localization does not rebuild or change the APK.
