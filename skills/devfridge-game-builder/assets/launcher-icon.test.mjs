/** Release template: ICON_RES_DIR, ICON_STORE_DIR and ANDROID_MANIFEST select real outputs.
 * Without those variables, build and verify a synthetic set in a temporary directory.
 * Set PYTHON to the Python executable with Pillow installed when needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('./make-adaptive-icons.py', import.meta.url));
function pngInfo(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(data.subarray(12, 16).toString(), 'IHDR');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25] };
}
function verify(res, store, manifest) {
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = fs.readFileSync(path.join(res, 'mipmap-anydpi-v26', name + '.xml'), 'utf8');
    for (const layer of ['background', 'foreground', 'monochrome']) {
      assert.match(xml, new RegExp(`<${layer}\\s+android:drawable="@mipmap/ic_launcher_${layer}"\\s*/>`));
    }
  }
  for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    for (const layer of ['background', 'foreground', 'monochrome']) {
      const info = pngInfo(path.join(res, 'mipmap-' + density, `ic_launcher_${layer}.png`));
      assert.equal(info.width, 108 * scale); assert.equal(info.height, 108 * scale);
      assert.equal(info.colorType, layer === 'background' ? 2 : 6);
    }
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      const info = pngInfo(path.join(res, 'mipmap-' + density, name + '.png'));
      assert.equal(info.width, 48 * scale); assert.equal(info.height, 48 * scale);
      assert.equal(info.colorType, 2);
    }
  }
  assert.deepEqual(pngInfo(path.join(store, 'icon-512.png')), { width: 512, height: 512, colorType: 2 });
  const xml = fs.readFileSync(manifest, 'utf8');
  assert.match(xml, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(xml, /android:roundIcon="@mipmap\/ic_launcher_round"/);
}

test('adaptive icons, every density, opaque store icon and manifest references', () => {
  const configured = [process.env.ICON_RES_DIR, process.env.ICON_STORE_DIR, process.env.ANDROID_MANIFEST];
  if (configured.some(Boolean)) {
    assert.ok(configured.every(Boolean), 'Set all three icon verification paths.');
    verify(...configured); return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-icon-'));
  try {
    const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    let result = spawnSync(python, ['-c', 'from PIL import Image; import sys; Image.new("RGBA", (512,512), (180,80,30,255)).save(sys.argv[1])', path.join(dir, 'art.png')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    result = spawnSync(python, [script, path.join(dir, 'art.png'), '--res-dir', path.join(dir, 'res'), '--store-dir', path.join(dir, 'store'), '--full-bleed'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    fs.writeFileSync(path.join(dir, 'AndroidManifest.xml'), '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" /></manifest>');
    verify(path.join(dir, 'res'), path.join(dir, 'store'), path.join(dir, 'AndroidManifest.xml'));
    fs.writeFileSync(path.join(dir, 'AndroidManifest.xml'), '<application android:icon="@mipmap/wrong"/>');
    assert.throws(() => verify(path.join(dir, 'res'), path.join(dir, 'store'), path.join(dir, 'AndroidManifest.xml')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
