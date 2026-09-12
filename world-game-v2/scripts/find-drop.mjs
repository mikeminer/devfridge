import { readFile } from "node:fs/promises";
const js = await readFile(new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url), "utf8");
function snip(s, back = 100, n = 800) {
  const i = js.indexOf(s);
  console.log("\n---", s, "@", i, "---");
  if (i >= 0) console.log(js.slice(Math.max(0, i - back), i + n));
}
snip("lastDrop>=28");
snip("tick-this.lastDrop");
snip("type:`drop`");
snip(".drop(");
snip("spawn(tier");
snip("pieces.size>10");
snip("new wg(");
snip("setPreview");
snip("preview=");
