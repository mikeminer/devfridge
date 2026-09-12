import { readFile, writeFile } from "node:fs/promises";
const path = new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url);
let js = await readFile(path, "utf8");
const reps = [
  [
    `async function TA(){if(!zA()||rA||iA||wA||$(\`dialog\`).open||Qk.mode!==\`fridge\`)return;SA();let e=Q;if(!e.inputs.length){wA=!0;try{await kk(e)}finally{wA=!1}}Q!==e||!zA()||rA||iA||$(\`dialog\`).open||Qk.mode!==\`fridge\`||await Nk(Q,Qk.aim)}`,
    `async function TA(){if(!zA()||rA||iA||wA||$(\`dialog\`).open||Qk.mode!==\`fridge\`)return;SA();Q.drop(Qk.aim)}`,
  ],
  [`this.tick-this.lastDrop>=28`, `this.tick-this.lastDrop>=6`],
  [`setLinearDamping(.38)`, `setLinearDamping(.08)`],
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
