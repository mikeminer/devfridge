import { readFile, writeFile } from "node:fs/promises";
const path = new URL("../../scan/public/world/game-v2/assets/cold-storage.js", import.meta.url);
let js = await readFile(path, "utf8");

const bootOld = "Q=new wr(vr(),Yk),Qk=new Tg($(`game`),Zk),Ok(Q,Lk),zk=";
const bootNew = "Q=new wr(vr(),Yk),Qk=new Tg($(`game`),Zk),zk=";
if (!js.includes(bootOld)) throw new Error("boot Ok not found");
js = js.replace(bootOld, bootNew);

const loadOld =
  "await Qk.load((e,t)=>{$(`load-progress`).textContent=`${e} / ${t}`,$(`load-bar`).style.width=`${e/t*100}%`}),await kk(Q),Qk.preview?.dispose()";
const loadNew =
  "await Qk.load((e,t)=>{$(`load-progress`).textContent=`${e} / ${t}`,$(`load-bar`).style.width=`${e/t*100}%`}),Ok(Q,Lk),Qk.preview?.dispose()";
if (!js.includes(loadOld)) throw new Error("load kk not found");
js = js.replace(loadOld, loadNew);

if (!js.includes("await Nk(Q,Qk.aim)")) throw new Error("Nk missing");
if (js.includes("await kk(Q),Qk.preview")) throw new Error("kk still blocks load");

await writeFile(path, js);
console.log("lazy start: Ok after load, not awaited; first drop still waits on kk+Nk");
