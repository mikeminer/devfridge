# DevFridge intro before the game opens

Reviewed **2026-11-04**. Ask the owner before building gameplay. The question is independent of platform, Game Room, the in-game market and both Free Play placements. Reuse an explicit include or exclude. Otherwise ask and wait. An unanswered choice stays pending and does not add the intro.

**“Show the DevFridge Games intro before the game opens?”**

Include means copy the [intro directory](../assets/devfridge-intro/) unchanged into the game and show `devfridge-intro.html` once on a cold open, before the menu, the pass and play. Exclude means do not add a splash, a logo sting or a link to the skill page. Do not infer consent from Free Play, a Seeker build or another game that has the intro.

## What the player sees

The HTML page is the intro. Do not redraw it. It runs about nine seconds: a fridge door, the DevFridge Games title, “Built for Seeker”, “Powered by Solana”, and a control that opens `https://world.devfridge.cool/skill` (“Build your own game”). Skip and the natural end both leave the intro. The door tap is required; it is the gesture that starts sound. Do not pass `autostart=1` or `record=1`.

On finish the page posts `{ type: 'devfridge:intro-done' }` to the parent, dispatches the same CustomEvent, and follows `next` only when that value is a same-origin path with one leading slash. Prefer a full-viewport iframe of the local file and remove it when the message arrives from the game’s own origin. A full navigation with `?next=/` is the alternative. Do not put player input into `next`, `logo` or `music`.

Mount this once at the root of a cold start. Do not remount it on a route change, pause, resume, wallet return or a new round. A new process or a full reload shows it again. After it closes, the game’s own first screen appears. Pass, wallet review and gameplay stay on the [subscription copy](season-pass.md#player-copy). The intro is the only player-facing place for this name and link.

## Inside the APK

On a Seeker APK, bundled or hosted, the directory is assets inside the package. Load the page from the local asset origin in [Android packaging](seeker-android.md). A hosted game plays this page from the APK before the approved website loads. A browser game serves the same directory from its own origin and iframes that local file.

The page, [logo-mark.jpg](../assets/devfridge-intro/logo-mark.jpg), the latin font files and the synth in the HTML are the whole intro. Do not fetch the page, the logo, the fonts or the sound. `logo` and `music` accept a file name in this directory; a URL, an absolute path or anything with `..` is ignored. No music file ships here, so the page uses its synth. Do not add `intro-theme.mp3` by downloading it at runtime. [OFL.txt](../assets/devfridge-intro/OFL.txt) travels with the fonts.

The skill link is an explicit tap. In a browser it may open a new tab. In the APK WebView, send only `https://world.devfridge.cool/skill` to the external browser and cancel any other navigation. That link is the only address outside the package. Do not widen the WebView to arbitrary hosts.

`prefers-reduced-motion` is already handled inside the file. Intro music ends with the intro; start the game’s own music after the iframe is gone so the two do not stack. The 50 FPS sample is gameplay after the intro, not the intro itself.

## Copy check

Keep the filename `devfridge-intro.html`. [check-player-copy.mjs](../assets/check-player-copy.mjs) ignores brand hits in that file only when its bytes match the packaged intro. A rename, an edit or the same words on another screen are brand findings. Pass, market and details scans stay strict. This is not a directory exemption.

```sh
node assets/check-player-copy.mjs path/to/devfridge-intro.html
node assets/check-player-copy.mjs src/ui/pass --scope pass
```
