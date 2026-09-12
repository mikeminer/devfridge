import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, copyFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") || join(root, "../node_modules/ffmpeg-static/ffmpeg.exe");
const root = dirname(fileURLToPath(import.meta.url));
const v1 = join(root, "../../scan/public/world/game");
const out = join(root, "../public");
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

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> ${code}`))));
  });
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function limit(items, n, fn) {
  const q = [...items];
  const workers = Array.from({ length: Math.min(n, q.length) }, async () => {
    while (q.length) await fn(q.shift());
  });
  await Promise.all(workers);
}

await mkdir(join(out, "models"), { recursive: true });
await mkdir(join(out, "portraits"), { recursive: true });
await mkdir(join(out, "audio"), { recursive: true });
await mkdir(join(out, "vendor"), { recursive: true });

const gltfBin = join(root, "../node_modules/@gltf-transform/cli/bin/cli.js");

await limit(ids, 8, async (id) => {
  const srcGlb = join(v1, "models", `${id}.glb`);
  const dstGlb = join(out, "models", `${id}.glb`);
  try {
    await run(process.execPath, [
      gltfBin,
      "optimize",
      srcGlb,
      dstGlb,
      "--compress",
      "draco",
      "--texture-compress",
      "webp",
    ]);
  } catch (err) {
    console.warn("draco failed, copying original", id, err.message);
    await copyFile(srcGlb, dstGlb);
  }

  const srcPng = join(v1, "portraits", `${id}.png`);
  const dstWebp = join(out, "portraits", `${id}.webp`);
  await sharp(srcPng).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 72 }).toFile(dstWebp);

  for (const kind of ["sfx", "voice", "signature"]) {
    const wav = join(v1, "audio", `${id}-${kind}.wav`);
    const mp3 = join(out, "audio", `${id}-${kind}.mp3`);
    if (await exists(wav)) {
      await run(ffmpeg, ["-y", "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "6", "-ar", "22050", "-ac", "1", mp3]);
    }
  }

  const themeWav = join(v1, "audio", "lyria", `${id}-theme.wav`);
  const themeMp3Src = join(v1, "audio", "lyria", `${id}-full.mp3`);
  const themeOut = join(out, "audio", `${id}-theme.mp3`);
  if (await exists(themeMp3Src)) {
    await run(ffmpeg, ["-y", "-i", themeMp3Src, "-codec:a", "libmp3lame", "-qscale:a", "7", "-ar", "22050", "-ac", "1", "-t", "24", themeOut]);
  } else if (await exists(themeWav)) {
    await run(ffmpeg, ["-y", "-i", themeWav, "-codec:a", "libmp3lame", "-qscale:a", "7", "-ar", "22050", "-ac", "1", "-t", "24", themeOut]);
  }
});

await copyFile(join(v1, "vendor", "devfridge-sdk.js"), join(out, "vendor", "devfridge-sdk.js"));
await copyFile(join(v1, "favicon.svg"), join(out, "favicon.svg"));
await copyFile(join(v1, "economy.json"), join(out, "economy.json"));

const v1Cast = JSON.parse(await (await import("node:fs/promises")).readFile(join(v1, "cast.json"), "utf8"));
v1Cast.base = "/world/game-v2/";
v1Cast.cast = v1Cast.cast.map((c) => ({
  ...c,
  glb: `/models/${c.id}.glb`,
  png: `/portraits/${c.id}.webp`,
  webp: `/portraits/${c.id}.webp`,
  wav: `/audio/${c.id}-signature.mp3`,
  voice: `/audio/${c.id}-voice.mp3`,
  sfx: `/audio/${c.id}-sfx.mp3`,
  theme: `/audio/${c.id}-theme.mp3`,
}));
await writeFile(join(out, "cast.json"), JSON.stringify(v1Cast, null, 2));
console.log("assets ready");
