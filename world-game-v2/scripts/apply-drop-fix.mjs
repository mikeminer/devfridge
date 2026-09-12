import { readFile, writeFile } from "node:fs/promises";
const path = new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url);
let js = await readFile(path, "utf8");
const reps = [
  [
    `o||(o=this.avatar(a.tier),this.visuals.set(a.id,o),this.fridge.add(o.root))`,
    `o||(o=new wg(a.tier,gr[a.tier-1],void 0,this.cast[a.tier-1],this.portraits.get(a.tier)),this.visuals.set(a.id,o),this.fridge.add(o.root))`,
  ],
  [
    `this.preview=this.avatar(e),this.preview.root.position.set(this.aim,mr,.82)`,
    `this.preview=new wg(e,gr[e-1],void 0,this.cast[e-1],this.portraits.get(e)),this.preview.root.position.set(this.aim,mr,.82)`,
  ],
];
for (const [a, b] of reps) {
  if (!js.includes(a)) throw new Error("missing: " + a.slice(0, 80));
  js = js.replace(a, b);
}
await writeFile(path, js);
console.log("drop lag patches applied");
