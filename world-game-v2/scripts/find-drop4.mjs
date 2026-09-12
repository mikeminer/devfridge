import { readFile } from "node:fs/promises";
const js = await readFile(new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url), "utf8");
function snip(s, back = 80, n = 600) {
  const i = js.indexOf(s);
  console.log("\n---", s, "@", i, "---");
  if (i >= 0) console.log(js.slice(Math.max(0, i - back), i + n));
}
snip("async function TA");
snip("function TA(");
snip("wA=!1");
snip("pointerup");
snip("ih(n.scene)");
