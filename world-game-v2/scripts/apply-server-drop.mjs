import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url);
let js = await readFile(path, "utf8");

const localDrop =
  "async function TA(){if(!zA()||rA||iA||wA||$(`dialog`).open||Qk.mode!==`fridge`)return;SA();Q.drop(Qk.aim)}";
const serverDrop =
  "async function TA(){if(!zA()||rA||iA||wA||$(`dialog`).open||Qk.mode!==`fridge`)return;SA();let e=Q;if(!e.inputs.length){wA=!0;try{await kk(e)}finally{wA=!1}}Q!==e||!zA()||rA||iA||$(`dialog`).open||Qk.mode!==`fridge`||await Nk(Q,Qk.aim)}";

if (js.includes(localDrop)) js = js.replace(localDrop, serverDrop);
else if (!js.includes("await Nk(Q,Qk.aim)")) throw new Error("neither local nor server TA found");

const loadNeedle =
  "await Qk.load((e,t)=>{$(`load-progress`).textContent=`${e} / ${t}`,$(`load-bar`).style.width=`${e/t*100}%`}),Qk.preview?.dispose()";
const loadInsert =
  "await Qk.load((e,t)=>{$(`load-progress`).textContent=`${e} / ${t}`,$(`load-bar`).style.width=`${e/t*100}%`}),await kk(Q),Qk.preview?.dispose()";

if (js.includes(loadNeedle)) js = js.replace(loadNeedle, loadInsert);
else if (!js.includes("await kk(Q),Qk.preview")) throw new Error("load site not found");

if (!js.includes("await Nk(Q,Qk.aim)")) throw new Error("Nk not wired");
if (!js.includes("portraits.get(a.tier)")) throw new Error("sprite pieces missing");

await writeFile(path, js);
console.log("ok: server drop + preload ticket, sprites kept");
