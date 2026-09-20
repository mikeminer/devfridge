import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const result = await build({
  entryPoints: [fileURLToPath(new URL('./kitchen-pool.test.ts', import.meta.url))],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
