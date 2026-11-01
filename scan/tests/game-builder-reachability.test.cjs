// Every part of the Game Builder skill must be reachable by an agent that starts at SKILL.md:
// no broken links, every reference and gamedev skill linked, the Three.js/3D path routed,
// and every vendored studio workflow/role resolvable from its index name.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../../skills/devfridge-game-builder');
const rel = file => path.relative(root, file).split(path.sep).join('/');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function linksIn(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  const out = [];
  for (const match of text.matchAll(LINK)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) continue;
    const clean = decodeURIComponent(target.split('#')[0]);
    if (clean) out.push(clean);
  }
  return out;
}

function crawl() {
  const seen = new Set(), dirs = new Set(), broken = [];
  const queue = [path.join(root, 'SKILL.md')];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!file.endsWith('.md')) continue;
    for (const target of linksIn(file)) {
      const abs = path.resolve(path.dirname(file), target);
      if (!abs.startsWith(root)) continue;
      if (!fs.existsSync(abs)) { broken.push(`${rel(file)} -> ${target}`); continue; }
      if (fs.statSync(abs).isDirectory()) { dirs.add(abs); continue; }
      queue.push(abs);
    }
  }
  return { seen, dirs, broken };
}

const { seen, dirs, broken } = crawl();
const reached = file => seen.has(path.join(root, file));
const listDir = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true });

test('no broken relative link anywhere reachable from SKILL.md', () => {
  assert.deepEqual(broken, []);
});

test('every reference page is reachable from SKILL.md', () => {
  const missing = listDir('references').filter(e => e.isFile() && e.name.endsWith('.md')).map(e => `references/${e.name}`).filter(f => !reached(f));
  assert.deepEqual(missing, []);
});

test('every vendored gamedev skill is reachable, and the routing table links each one', () => {
  const names = listDir('vendor/gamedev-skills').filter(e => e.isDirectory()).map(e => e.name);
  assert.equal(names.length, 18);
  const routing = linksIn(path.join(root, 'references/gamedev-skills.md'));
  for (const name of names) {
    assert.ok(reached(`vendor/gamedev-skills/${name}/SKILL.md`), `unreachable: ${name}`);
    assert.ok(routing.includes(`../vendor/gamedev-skills/${name}/SKILL.md`), `not in routing table: ${name}`);
  }
});

test('Three.js and 3D modelling path: SKILL.md -> routing -> Three.js skills and asset references', () => {
  const skill = linksIn(path.join(root, 'SKILL.md'));
  for (const ref of ['references/gamedev-skills.md', 'references/3d-assets-and-characters.md', 'references/visual-realism.md', 'references/game-delivery.md']) {
    assert.ok(skill.includes(ref), `SKILL.md does not link ${ref}`);
  }
  const routing = read('references/gamedev-skills.md');
  for (const [name, task] of [
    ['threejs-scene-setup', /Three\.js scene/], ['threejs-gltf-loading', /Character import, rig/],
    ['threejs-materials-lighting', /PBR, environment/], ['create-game-assets', /Style bible/],
    ['shader-programming', /shader budget/], ['procedural-gen', /generated levels/],
  ]) {
    const row = routing.split('\n').find(line => line.includes(`gamedev-skills/${name}/SKILL.md`));
    assert.ok(row, `${name} has no routing row`);
    assert.match(row, task, `${name} routed to the wrong task`);
  }
  for (const name of ['threejs-scene-setup', 'threejs-gltf-loading', 'threejs-materials-lighting']) {
    assert.match(read(`vendor/gamedev-skills/${name}/SKILL.md`), /^---\nname: /, `${name} lacks skill frontmatter`);
  }
  assert.ok(linksIn(path.join(root, 'references/3d-assets-and-characters.md')).some(link => link.includes('gamedev-skills') || link.includes('visual-realism')) || reached('references/3d-assets-and-characters.md'));
});

test('every vendored studio workflow and role resolves from its index name', () => {
  const studio = 'vendor/claude-code-game-studios';
  const workflows = listDir(`${studio}/skills`).filter(e => e.isDirectory()).map(e => e.name);
  const roles = listDir(`${studio}/agents`).filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name.slice(0, -3));
  assert.equal(workflows.length, 74);
  assert.equal(roles.length, 49);
  assert.ok(reached(`${studio}/docs/skills-reference.md`) && reached(`${studio}/docs/agent-roster.md`), 'studio indexes must be linked');
  const index = read(`${studio}/docs/skills-reference.md`), roster = read(`${studio}/docs/agent-roster.md`);
  for (const name of workflows) {
    assert.ok(index.includes('`/' + name + '`'), `workflow missing from index: ${name}`);
    assert.ok(fs.existsSync(path.join(root, studio, 'skills', name, 'SKILL.md')), `workflow without SKILL.md: ${name}`);
  }
  for (const name of roles) assert.ok(new RegExp('\\b' + name + '\\b').test(roster), `role missing from roster: ${name}`);
  const builtIns = new Set(['debug', 'review', 'security-review', 'simplify']);
  for (const [, name] of index.matchAll(/`\/([a-z0-9-]+)`/g)) {
    assert.ok(workflows.includes(name) || builtIns.has(name), `index names an absent workflow: ${name}`);
  }
  const adapter = read('references/game-studio.md');
  assert.match(adapter, /`vendor\/claude-code-game-studios\/skills\/<name>\/SKILL\.md`/);
  assert.match(adapter, /`vendor\/claude-code-game-studios\/agents\/<name>\.md`/);
  for (const name of builtIns) assert.ok(adapter.includes('`/' + name + '`'), `adapter does not explain built-in ${name}`);
});

test('every asset path the documentation mentions exists', () => {
  const missing = [];
  for (const file of seen) {
    // Only DevFridge's own pages: in vendored skills, `assets/...` means the game project's files.
    const own = file === path.join(root, 'SKILL.md') || file.startsWith(path.join(root, 'references') + path.sep);
    if (!own || !file.endsWith('.md')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [, p] of text.matchAll(/(?<![\w./-])(assets\/[A-Za-z0-9_./-]+\.(?:mjs|py|json|md|txt|cjs))/g)) {
      if (!fs.existsSync(path.join(root, p))) missing.push(`${rel(file)} -> ${p}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('landscape and architecture packs: every skill reachable and routed, WebGL rule and licences present', () => {
  const page = 'references/landscapes-and-architecture.md';
  assert.ok(linksIn(path.join(root, 'SKILL.md')).includes(page), 'SKILL.md does not link the landscapes page');
  assert.ok(linksIn(path.join(root, 'references/gamedev-skills.md')).includes('landscapes-and-architecture.md'), 'routing table does not link the landscapes page');
  const routed = linksIn(path.join(root, page));
  for (const pack of ['threejs-graphics-skills', 'mengto-threejs-skills']) {
    assert.ok(fs.existsSync(path.join(root, 'vendor', pack, 'LICENSE')), `${pack} has no LICENSE`);
    assert.match(read(`vendor/${pack}/README.md`), /Every copied file was checked against its upstream Git blob hash/);
    for (const entry of listDir(`vendor/${pack}`).filter(e => e.isDirectory())) {
      const skill = `vendor/${pack}/${entry.name}/SKILL.md`;
      assert.ok(reached(skill), `unreachable: ${skill}`);
      assert.ok(routed.includes(`../${skill}`), `not routed from ${page}: ${entry.name}`);
    }
  }
  assert.equal(listDir('vendor/threejs-graphics-skills').filter(e => e.isDirectory()).length, 11);
  assert.equal(listDir('vendor/mengto-threejs-skills').filter(e => e.isDirectory()).length, 5);
  const rules = read(page);
  assert.match(rules, /Use `WebGLRenderer`/);
  assert.match(rules, /Switch to WebGPU only when the owner explicitly asks/);
  assert.match(rules, /50 FPS release gate/);
  assert.match(rules, /lightmap-baker/);
  assert.match(rules, /InstancedMesh/);
});
