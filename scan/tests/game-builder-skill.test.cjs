const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'skills/devfridge-game-builder');
const output = path.join(root, 'scan/public/world/skill/downloads');
const python = process.env.SKILL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const expectedRelease = { version: '1.7.4', reviewedAt: '2026-10-24', bytes: 311976, sha256: 'e73d6a85051c2edd1f9524655bfe8e41cce243a17c4dc2f110657f84ab14bf9b' };

function walkFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink(), 'A distributable cannot contain symlinks');
    const relative = prefix + entry.name;
    return entry.isDirectory() ? walkFiles(path.join(directory, entry.name), relative + '/') : [relative];
  }).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);
}

// Independently decode each known-size ZIP entry with Node rather than trusting
// the packager that wrote it. This format has no descriptors or ZIP64 members.
function zipMembers(zip) {
  const result = new Map();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(zip.readUInt16LE(offset + 6) & 8, 0, 'Unexpected ZIP data descriptor');
    assert.equal(zip.readUInt16LE(offset + 8), 8, 'Expected deflate compression');
    const compressedSize = zip.readUInt32LE(offset + 18);
    const uncompressedSize = zip.readUInt32LE(offset + 22);
    const nameSize = zip.readUInt16LE(offset + 26);
    const extraSize = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 30, offset + 30 + nameSize).toString('utf8');
    const start = offset + 30 + nameSize + extraSize;
    const data = zlib.inflateRawSync(zip.subarray(start, start + compressedSize));
    assert.equal(data.length, uncompressedSize, name);
    assert.ok(!result.has(name), 'Duplicate ZIP member');
    result.set(name, data);
    offset = start + compressedSize;
  }
  assert.equal(zip.readUInt32LE(offset), 0x02014b50, 'Expected ZIP central directory');
  return result;
}

test('published skill contains exactly the reviewed sources, standalone files and archive members', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
  for (const [key, value] of Object.entries(expectedRelease)) assert.equal(manifest[key], value, key);
  assert.equal(manifest.files.length, 95);
  const zip = fs.readFileSync(path.join(output, `${manifest.name}.zip`));
  assert.equal(zip.length, manifest.bytes);
  assert.equal(crypto.createHash('sha256').update(zip).digest('hex'), manifest.sha256);
  assert.deepEqual(fs.readFileSync(path.join(output, `${manifest.name}.skill`)), zip);
  const names = manifest.files.map(file => file.path);
  assert.deepEqual(walkFiles(source), names, 'No omitted source files, vendor licences or unexpected caches');
  assert.deepEqual(walkFiles(path.join(output, manifest.name)), names, 'No stale standalone files');
  const members = zipMembers(zip);
  assert.deepEqual([...members.keys()], names.map(name => `${manifest.name}/${name}`));
  for (const file of manifest.files) {
    const original = fs.readFileSync(path.join(source, file.path));
    const published = fs.readFileSync(path.join(output, manifest.name, file.path));
    assert.ok(!original.includes(Buffer.from('\r\n')), 'Source must preserve reviewed LF bytes: ' + file.path);
    assert.deepEqual(published, original, file.path);
    assert.deepEqual(members.get(`${manifest.name}/${file.path}`), original, file.path);
    assert.equal(crypto.createHash('sha256').update(published).digest('hex'), file.sha256, file.path);
  }
  const skill = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8');
  assert.ok(skill.includes('  version: "1.7.4"\n'));
  assert.ok(skill.includes('  sources-reviewed: "2026-10-24"\n'));
});

test('packager reproduces the reviewed ZIP under either creator platform and rejects stale files/caches', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-packaging-'));
  try {
    const destination = path.join(temp, 'downloads');
    const packager = path.join(root, 'scripts/package-game-skill.py');
    const env = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
    const run = (sourceDir, dest) => spawnSync(python, [packager, '--source', sourceDir, '--dest', dest], { encoding: 'utf8', env });
    let result = run(source, destination);
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    for (const name of ['manifest.json', 'devfridge-game-builder.zip', 'devfridge-game-builder.skill']) {
      assert.deepEqual(fs.readFileSync(path.join(destination, name)), fs.readFileSync(path.join(output, name)), name);
    }
    // Override ZipInfo's host default to Unix. The packager must still force
    // create_system=0, reproducing the approved Windows-built artifact exactly.
    const unixDefault = [
      'import importlib.util,sys,zipfile',
      'spec=importlib.util.spec_from_file_location("packager",sys.argv[1])',
      'module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)',
      'OriginalZipInfo=zipfile.ZipInfo',
      'class UnixZipInfo(OriginalZipInfo):',
      ' def __init__(self,*args,**kwargs):',
      '  super().__init__(*args,**kwargs);self.create_system=3',
      'module.zipfile.ZipInfo=UnixZipInfo',
      'module.build(sys.argv[2],sys.argv[3])',
    ].join('\n');
    const unixDestination = path.join(temp, 'unix-default');
    result = spawnSync(python, ['-c', unixDefault, packager, source, unixDestination], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.deepEqual(fs.readFileSync(path.join(unixDestination, 'devfridge-game-builder.zip')), fs.readFileSync(path.join(output, 'devfridge-game-builder.zip')));
    fs.writeFileSync(path.join(destination, 'devfridge-game-builder/stale.md'), 'Unlisted standalone content');
    result = run(source, destination);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Stale standalone download/);
    const fixture = path.join(temp, 'fixture');
    fs.mkdirSync(fixture);
    fs.writeFileSync(path.join(fixture, 'SKILL.md'), '---\nname: devfridge-game-builder\nmetadata:\n  version: "1.7.4"\n  sources-reviewed: "2026-10-24"\n---\n');
    fs.mkdirSync(path.join(fixture, '__pycache__'));
    fs.writeFileSync(path.join(fixture, '__pycache__/module.pyc'), 'Not distributable');
    const rejectedDest = path.join(temp, 'rejected');
    result = run(fixture, rejectedDest);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bytecode caches/);
    assert.ok(!fs.existsSync(rejectedDest), 'Invalid source must not produce downloads');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('pure skill helpers run in standard Node CI without media dependencies', async () => {
  // Launcher media/device tests remain a separate release check with Pillow.
  for (const name of ['timelock-gate', 'season-pass', 'quality-governor', 'check-player-copy']) {
    await import(`../../skills/devfridge-game-builder/assets/${name}.test.mjs`);
  }
});
