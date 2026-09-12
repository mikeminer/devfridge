import { readFile } from "node:fs/promises";
const js = await readFile(new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url), "utf8");
function snip(s, back = 60, n = 700) {
  const i = js.indexOf(s);
  console.log("\n---", s, "@", i, "---");
  if (i >= 0) console.log(js.slice(Math.max(0, i - back), i + n));
}
snip("function Ok(");
snip("Ok(Q,Lk)");
snip("class wg");
snip("wg=class");
snip("avatar(e,t=gr");
snip("await Nk(Q");
snip("$(`drop`).onclick");
snip("id=`drop`");
snip("tA.effect");
snip("linearDamping(.38)");
