# Logo and Store art

Use the owner's artwork first and record provenance in [ASSETS_LICENSES](../assets/templates/ASSETS_LICENSES.md). Otherwise request original art through an approved image tool and record the tool, generation date and applicable terms. Do not invent a licence, copy another game's art or use real people's likenesses or third-party logos without permission. Match the owner's chosen style; horror is only an example below.

## Menu identity

Extract the owner's logo with matte removal, edge defringe and a tight transparent crop. Keep an editable original. Export `public/<game>-logo.webp` and PNG fallback at roughly twice the intended display width. Place the logo inside the menu `h1` with `picture`, WebP `source`, a PNG `img`, `alt` equal to the actual game name and explicit width/height. Preserve accessible text and prevent layout shift. Once the approved logo exists, replace the plain text title.

## Adaptive launcher

Run [make-adaptive-icons.py](../assets/make-adaptive-icons.py) with source art, output Android `res` directory, Store directory and a dark background. Choose `--badge-center X Y --badge-radius R` in source-image pixels or `--full-bleed`. Full-bleed places the art into the background and repeats its focal design in the safe foreground; review that composition rather than assuming it fits every logo. White backgrounds are rejected.

The script emits 108 dp foreground/background/monochrome layers at every density (432 px at xxxhdpi), with focal foreground art inside the central 66 dp; XML for normal and round adaptive icons; full-bleed legacy PNGs at 48 dp per density; an opaque RGB 512-square Store icon; and a six-panel light/dark mask preview. It preflights all generated paths and refuses to overwrite its source artwork. The monochrome template uses the foreground alpha silhouette: a rectangular opaque source may need a separately prepared silhouette for a useful themed icon. Preview masks approximate circle, squircle and rounded square; launcher-specific masks still require device inspection.

Set manifest `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`. Run [launcher-icon.test.mjs](../assets/launcher-icon.test.mjs) against real output using `ICON_RES_DIR`, `ICON_STORE_DIR`, `ANDROID_MANIFEST`. Without these, the test creates synthetic artwork in a temporary directory. Install the signed build and inspect the actual physical Seeker launcher; file dimensions alone do not prove a good icon. See [Android](seeker-android.md) and [release pitfalls](release-pitfalls.md).

## Store images and truthful screenshots

- Icon: opaque RGB 512 × 512.
- Banner: 1200 × 600, approved logo and brief tagline over a genuine gameplay frame.
- Feature art: 1200 × 1200. The publishing specification verifies this size as `featureGraphic`; the requested portal field name `editorsChoiceGraphicUrl` has not been independently verified. Prepare it, then upload only when the portal or Solana Mobile team requests it. This never promises Editor's Choice selection.
- Optional campaign art: 1920 × 1080 or 1024 × 500, identified as marketing art rather than a required Store slot.
- Screenshot set: 4–8 genuine captures, consistent 9:16 or 16:9 dimensions; use 1080 × 1920 or 1920 × 1080, each at most 3 MB. Current requirements and dated primary sources are in [Store publishing](solana-dapp-store.md).

Capture deterministically: enter the real game state, advance until actors have arrived and the claimed action is visible, freeze, then capture at native resolution. Keep HUD safe; avoid third-party wallet details, use the owner's address or explicitly disclose a redaction. For games with gore, use the store-build Reduced setting. No development labels, fabricated rewards, fake player counts or unimplemented features.

## Caption compositor

[store-compose.py](../assets/store-compose.py) takes a captions JSON array, a licensed local TTF/OTF, three palette colors (band/text/outline), band height and output orientation. Example input:

```json
[
  {"image":"gameplay.png","caption":"AIM FOR A NEW RECORD","output":"01-gameplay.jpg"},
  {"image":"pass.png","caption":"GET THE SEASON PASS","output":"02-pass.jpg"}
]
```

Use short uppercase captions naming implemented features. The compositor preserves the full capture/HUD inside a solid caption band layout; it does not invent gameplay or auto-crop important controls. Before writing, it rejects duplicate output names and any output that would overwrite the caption JSON, font or any input capture, including later entries. It supports consistent font sizing, outline and a chosen palette. `--check-set` validates unique image paths, count, identical dimensions, aspect, shortest edge ≥1080 and ≤3,000,000 bytes; `--validate <paths...>` validates an existing set. The ≥1080 rule is a chosen quality gate, stricter than a recommendation. Unsupported fonts, long captions and bad dimensions fail. Make four real captures before passing the complete-set gate.

Use OFL-licensed lettering where suitable; copy the font's actual `OFL.txt` as `FONT-LICENSE-<font>-OFL.txt` into Store assets. Record its source and modified/unmodified status. Do not bundle the font in the APK unless the game UI needs it. A screenshot/render does not remove licence obligations for redistributed font files.

### Example (Street Meat) — optional horror treatment

The example uses Creepster lettering, cream outline, dark shadow, gradient red/green fill, a speckled dark band, torn edge and restrained blood-drip accents. The general compositor supplies the readable band/outline base; bespoke gradients, torn edges and drips require a separate art pass and review. These are optional style choices, never defaults for another game. Record the OFL licence alongside this example's assets.

## Acceptance

Run icon fixture and actual-output tests; render light/dark masks; inspect a physical Seeker; validate 4–8 captioned real screenshots; open every image at 100%; check that the visible text matches the chosen locale and current build. Document unperformed device/art checks instead of claiming them complete. The toolkit is newly authored from the requested specification; unavailable private example scripts were not copied.

## Automated ready-state capture

Use [the performance and capture runner](performance-and-capture.md) to wait for genuine game state before each capture, retain original pixels, add caption bands and validate Store dimensions/count/size. Scenes such as enemies arriving are configured predicates, not a hardcoded zombie requirement for every game. No fixed delay or fabricated composition substitutes for submitted-build gameplay.
