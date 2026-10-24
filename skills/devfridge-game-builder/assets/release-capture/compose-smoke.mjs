#!/usr/bin/env node
/** Optional Pillow integration fixture, never Store or physical-device evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { composeCapturedSet } from './capture-release.mjs';
import { sha256 } from './scenario-runner.mjs';
const exec = promisify(execFile);
const args = Object.fromEntries(Array.from({ length: Math.ceil((process.argv.length - 2) / 2) }, (_, i) => [process.argv[2 + i * 2], process.argv[3 + i * 2]]));
if (!args['--font'] || process.argv.includes('--help')) {
  console.log('Usage: node compose-smoke.mjs --font /local/test-font.ttf [--python python3]\nSynthetic temporary images only. Requires Pillow. No browser/device evidence or publishable artwork is created.');
} else {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'release-compose-fixture-'));
  const python = args['--python'] || (process.platform === 'win32' ? 'python' : 'python3');
  const run = code => exec(python, ['-c', code, root], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 120000, maxBuffer: 1024 * 1024 });
  try {
    await run(`from PIL import Image, ImageDraw
from pathlib import Path
import json,sys
p=Path(sys.argv[1]); entries=[]
for i in range(4):
    im=Image.new('RGB',(1080,1920),(20+i*20,40,80)); d=ImageDraw.Draw(im)
    d.rectangle((0,0,1079,90),fill=(255,0,0)); d.rectangle((0,1829,1079,1919),fill=(0,255,0))
    d.text((100,500),'SYNTHETIC FIXTURE ONLY',fill=(255,255,255)); im.save(p/f'raw-{i}.png')
    entries.append({'image':f'raw-{i}.png','caption':'SYNTHETIC TEST ONLY','output':f'out-{i}.png'})
(p/'captions.json').write_text(json.dumps(entries),encoding='utf-8')
`);
    const originals = await Promise.all(Array.from({ length: 4 }, (_, i) => fs.readFile(path.join(root, `raw-${i}.png`)).then(sha256)));
    await fs.writeFile(path.join(root, 'fixture-license.txt'), 'SYNTHETIC TEST ONLY. This text is not a font distribution licence.');
    const result = await composeCapturedSet(root, { captions: { fontApproved: true, font: path.resolve(args['--font']), fontLicense: 'fixture-license.txt', size: '1080x1920', bandHeight: 240 } }, root, python);
    assert.equal(result.status, 'validated'); assert.equal(result.files.length, 4);
    for (const file of result.files) { assert.ok(file.bytes <= 3000000); assert.equal(sha256(await fs.readFile(path.join(root, 'store-assets', file.filename))), file.sha256); }
    await run(`from PIL import Image
from pathlib import Path
import sys
p=Path(sys.argv[1])/'store-assets'
for i in range(4):
    im=Image.open(p/f'out-{i}.png'); assert im.size==(1080,1920)
    # Full source is contained: original top/bottom HUD markers survive below caption band.
    assert im.getpixel((540,250))==(255,0,0)
    assert im.getpixel((540,1910))==(0,255,0)
`);
    for (let i = 0; i < 4; i++) assert.equal(sha256(await fs.readFile(path.join(root, `raw-${i}.png`))), originals[i]);
    console.log(JSON.stringify({ fixture: true, releaseReady: false, checks: ['four validated final screenshots', 'raw images unchanged', 'top and bottom HUD preserved', 'all hashes match', '1080x1920 and <=3MB'], status: 'passed' }));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}
