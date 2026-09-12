import { readFile } from "node:fs/promises";
const js = await readFile(new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url), "utf8");
function snip(s, back = 50, n = 400) {
  let idx = 0;
  let nfound = 0;
  while ((idx = js.indexOf(s, idx)) !== -1 && nfound < 6) {
    console.log("\n---", s, "#", nfound, "@", idx, "---");
    console.log(js.slice(Math.max(0, idx - back), idx + n));
    idx += s.length;
    nfound++;
  }
}
snip("TA()");
snip("function bA(");
snip("setPreview(Q.next)");
snip("pointerup");
snip("Qk.aim=");
