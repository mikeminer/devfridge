import { readFile } from "node:fs/promises";
const js = await readFile(new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url), "utf8");
function snip(s, back = 80, n = 900) {
  const i = js.indexOf(s);
  console.log("\n---", s, "@", i, "---");
  if (i >= 0) console.log(js.slice(Math.max(0, i - back), i + n));
}
snip("ev.type===`drop`");
snip("type===`drop`");
snip("visuals.set");
snip("this.visuals.set");
snip("Nk(Q");
snip("ranked");
snip("function Mk(");
snip("live ranked");
snip("this.avatar(a.tier");
snip("this.avatar(e.tier");
