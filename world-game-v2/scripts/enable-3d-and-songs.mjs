import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const v1 = join(root, "../../scan/public/world/game");
const v2 = join(root, "../../scan/public/world/game-v2");
const ids = [
  "rugarugo",
  "aperitivo",
  "friedfomo",
  "fudfusilli",
  "lambocello",
  "gmgnocco",
  "sersugo",
  "moonzarella",
  "bonkatino",
  "ciccia",
];

await mkdir(join(v2, "audio", "lyria"), { recursive: true });
for (const id of ids) {
  await copyFile(join(v1, "models", `${id}.glb`), join(v2, "models", `${id}.glb`));
  await copyFile(join(v1, "audio", "lyria", `${id}-full.mp3`), join(v2, "audio", "lyria", `${id}-full.mp3`));
}

const castPath = join(v2, "cast.json");
const cast = JSON.parse(await readFile(castPath, "utf8"));
cast.cast = cast.cast.map((c) => ({ ...c, theme: `/audio/lyria/${c.id}-full.mp3` }));
await writeFile(castPath, JSON.stringify(cast, null, 2));

const jsPath = join(v2, "assets", "cold-storage.js");
let js = await readFile(jsPath, "utf8");

const oldLoad =
  "async load(e){let t=new oh,n=new Bu,p=[...this.cast],w=Array.from({length:8},async()=>{for(;p.length;){let i=p.shift();try{let x=await n.loadAsync(i.png);x.colorSpace=$i,this.portraits.set(i.tier,x)}catch{console.warn(`Portrait unavailable: ${i.id}`)}e(this.portraits.size,this.cast.length)}});await Promise.all(w);let r=[...this.cast];(window.requestIdleCallback||(f=>setTimeout(f,200)))(()=>{let i=async()=>{for(;r.length;){let c=r.shift();try{let g=await t.loadAsync(c.glb);this.models.set(c.tier,g),this.bake(c.tier,g)}catch{console.warn(`Model unavailable; using portrait capsule: ${c.id}`)}}};Promise.all(Array.from({length:8},i))})}";

const newLoad =
  "async load(e){let t=new oh,n=new Bu,p=[...this.cast],w=Array.from({length:8},async()=>{for(;p.length;){let i=p.shift();try{let x=await n.loadAsync(i.png);x.colorSpace=$i,this.portraits.set(i.tier,x)}catch{console.warn(`Portrait unavailable: ${i.id}`)}e(this.portraits.size,this.cast.length)}});await Promise.all(w);let fav=this.cast.find(c=>c.tier===(typeof Yk=='number'?Yk:1))||this.cast[0];try{let g=await t.loadAsync(fav.glb);this.models.set(fav.tier,g),this.bake(fav.tier,g)}catch{console.warn(`Model unavailable; using portrait capsule: ${fav.id}`)}let r=this.cast.filter(c=>c.tier!==fav.tier),promote=c=>{this.visuals.forEach((o,id)=>{if(o.tier===c.tier&&!o.mixer){o.dispose(),this.visuals.delete(id),this.staticVisuals.delete(id)}});if(this.preview&&this.preview.tier===c.tier){let a=this.aim;this.preview.dispose(),this.preview=this.avatar(c.tier),this.preview.root.position.set(a,mr,.82),this.fridge.add(this.preview.root)}this.frozen&&this.frozen.tier===c.tier&&this.setFavourite(c.tier)};(window.requestIdleCallback||(f=>setTimeout(f,400)))(()=>{let i=async()=>{for(;r.length;){let c=r.shift();try{let g=await t.loadAsync(c.glb);this.models.set(c.tier,g),this.bake(c.tier,g),promote(c)}catch{console.warn(`Model unavailable; using portrait capsule: ${c.id}`)}}};Promise.all(Array.from({length:2},i))})}";

if (!js.includes(oldLoad)) throw new Error("load() not found");
js = js.replace(oldLoad, newLoad);

const oldPiece = `o||(o=new wg(a.tier,gr[a.tier-1],void 0,this.cast[a.tier-1],this.portraits.get(a.tier)),this.visuals.set(a.id,o),this.fridge.add(o.root))`;
const newPiece = `o||(o=this.avatar(a.tier),this.visuals.set(a.id,o),this.fridge.add(o.root))`;
if (!js.includes(oldPiece)) throw new Error("piece visual not found");
js = js.replace(oldPiece, newPiece);

const oldPreview = `this.preview=new wg(e,gr[e-1],void 0,this.cast[e-1],this.portraits.get(e)),this.preview.root.position.set(this.aim,mr,.82)`;
const newPreview = `this.preview=this.avatar(e),this.preview.root.position.set(this.aim,mr,.82)`;
if (!js.includes(oldPreview)) throw new Error("preview visual not found");
js = js.replace(oldPreview, newPreview);

await writeFile(jsPath, js);
console.log("3d lazy + full songs enabled");
