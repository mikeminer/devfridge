import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const v1 = join(root, "../../scan/public/world/game");
const v2 = join(root, "../../scan/public/world/game-v2");
await mkdir(join(v2, "assets"), { recursive: true });

await copyFile(join(v1, "assets/index-BOCTkkHT.css"), join(v2, "assets/cold-storage.css"));
let js = await readFile(join(v1, "assets/index-BRorhYzL.js"), "utf8");

js = js.replaceAll("`/world/game/`", "`/world/game-v2/`");
js = js.replaceAll("/world/game/index.html", "/world/game-v2/index.html");

const oldLoad = `async load(e){let t=new oh,n=new Bu,r=[...this.cast],i=async()=>{for(;r.length;){let i=r.shift();try{let e=await t.loadAsync(i.glb);this.models.set(i.tier,e),this.bake(i.tier,e)}catch{console.warn(\`Model unavailable; using portrait capsule: \${i.id}\`);try{let e=await n.loadAsync(i.png);e.colorSpace=$i,this.portraits.set(i.tier,e)}catch{console.warn(\`Portrait unavailable: \${i.id}\`)}}e(++this.loaded,this.cast.length)}};await Promise.all([i(),i()])}`;

const newLoad = `async load(e){let t=new oh,n=new Bu,p=[...this.cast],w=Array.from({length:8},async()=>{for(;p.length;){let i=p.shift();try{let x=await n.loadAsync(i.png);x.colorSpace=$i,this.portraits.set(i.tier,x)}catch{console.warn(\`Portrait unavailable: \${i.id}\`)}e(this.portraits.size,this.cast.length)}});await Promise.all(w);let r=[...this.cast];(window.requestIdleCallback||(f=>setTimeout(f,200)))(()=>{let i=async()=>{for(;r.length;){let c=r.shift();try{let g=await t.loadAsync(c.glb);this.models.set(c.tier,g),this.bake(c.tier,g)}catch{console.warn(\`Model unavailable; using portrait capsule: \${c.id}\`)}}};Promise.all(Array.from({length:8},i))})}`;

if (!js.includes(oldLoad)) throw new Error("load() pattern not found — v1 bundle changed");
js = js.replace(oldLoad, newLoad);

const oldRenderer = `this.renderer=new eh({canvas:e,antialias:!0,alpha:!0,powerPreference:\`high-performance\`}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))`;
const newRenderer = `this.renderer=new eh({canvas:e,antialias:!matchMedia(\`(pointer:coarse),(max-width:900px)\`).matches,alpha:!0,powerPreference:matchMedia(\`(pointer:coarse)\`).matches?\`low-power\`:\`high-performance\`}),this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia(\`(pointer:coarse)\`).matches?1:1.25))`;
if (!js.includes(oldRenderer)) throw new Error("renderer pattern not found");
js = js.replace(oldRenderer, newRenderer);

await writeFile(join(v2, "assets/cold-storage.js"), js);
await writeFile(
  join(v2, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#171b18" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="description" content="Cold Storage v2 — same game as v1, faster assets." />
    <title>Cold Storage v2 · DevFridge</title>
    <link rel="icon" type="image/svg+xml" href="/world/game-v2/favicon.svg" />
    <script type="module" crossorigin src="/world/game-v2/assets/cold-storage.js"></script>
    <link rel="stylesheet" crossorigin href="/world/game-v2/assets/cold-storage.css">
  </head>
  <body><div id="app"></div></body>
</html>
`,
);
console.log("patched v1 into v2");
