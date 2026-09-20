import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep the deployed v2 engine and its optimized assets intact. Only add furniture hooks.
const root = fileURLToPath(new URL('../', import.meta.url));
const assets = fileURLToPath(new URL('../../scan/public/world/game-v2/assets/', import.meta.url));
await build({
  configFile: false, root, publicDir: false,
  build: {
    target: 'es2022', outDir: assets, emptyOutDir: false, minify: true,
    lib: { entry: `${root}src/kitchen-shelf.ts`, formats: ['es'], fileName: () => 'kitchen-shelf.js' },
  },
});

const path = `${assets}cold-storage.js`;
let code = await readFile(path, 'utf8');
function replaceOnce(before, after) {
  if (code.includes(after)) return;
  if (code.split(before).length !== 2) throw Error(`Expected exactly one hook: ${before}`);
  code = code.replace(before, after);
}
replaceOnce(
  'this.box(this.kitchen,6.45,4.65,-1.7,4.4,4.4,.2,xg),this.kitchen.add(this.kitchenBoard.mesh)',
  'this.box(this.kitchen,6.45,4.05,-1.7,3.3,3.3,.2,xg),this.kitchenBoard.mesh.scale.setScalar(.75),this.kitchenBoard.mesh.position.y=4.05,this.kitchen.add(this.kitchenBoard.mesh)',
);
replaceOnce('update(e,t,n,r,i,a){if(this.clock+=t,',
  'update(e,t,n,r,i,a){this.tickKitchenShelf();if(this.clock+=t,');
// Retry failed imports after one minute. Ignore late loading outside the kitchen.
const hook = 'tickKitchenShelf(){const active=this.mode===`kitchen`&&!document.hidden;if(this.tokenShelf){this.tokenShelf.tick(active);return}if(!active||this.tokenShelfLoading||Date.now()<(this.tokenShelfRetry||0))return;this.tokenShelfLoading=true;import(`/world/game-v2/assets/kitchen-shelf.js?v=1`).then(({KitchenShelf})=>{this.tokenShelf=new KitchenShelf;this.kitchen.add(this.tokenShelf.root);this.tokenShelf.tick(this.mode===`kitchen`&&!document.hidden)}).catch(()=>{this.tokenShelfRetry=Date.now()+60000}).finally(()=>{this.tokenShelfLoading=false})}';
replaceOnce('buildKitchen(){', `${hook}buildKitchen(){`);
await writeFile(path, code);
console.log('Built the lazy kitchen shelf and applied idempotent scene hooks.');
