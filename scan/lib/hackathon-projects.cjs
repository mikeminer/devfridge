// Shared by the static gallery and CI. Metadata only: never execute project code.
const fs = require('node:fs');
const path = require('node:path');

const TEXT = { name: 80, pitch: 240, community: 80, access: 1600, limitations: 1600 };
const URLS = ['playUrl', 'repositoryUrl', 'demoUrl', 'submissionUrl', 'buildLogUrl', 'verificationUrl'];
const FIELDS = ['schemaVersion', 'slug', ...Object.keys(TEXT), ...URLS, 'commit', 'practiceAvailable'];

function validateProject(project, filename, { allowFeatured = false } = {}) {
  const fail = message => { throw new Error(`${filename}: ${message}`); };
  if (!project || typeof project !== 'object' || Array.isArray(project)) fail('expected an object');
  if (Object.keys(project).some(key => !FIELDS.includes(key)) || FIELDS.some(key => !Object.hasOwn(project, key))) fail('unexpected or missing fields');
  if (project.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (typeof project.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || project.slug.length > 60 || (!allowFeatured && project.slug === 'fridge-run')) fail('invalid or reserved slug');
  if (filename !== `${project.slug}.json`) fail('filename must match slug');
  for (const [key, max] of Object.entries(TEXT)) {
    const value = project[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\x00-\x1f\x7f]/.test(value)) fail(`${key}: expected plain text, 1–${max} characters`);
  }
  for (const key of URLS) {
    const value = project[key];
    if (typeof value !== 'string' || value.length > 800 || /[\s<>\\]/.test(value) || /YOUR-ACCOUNT|YOUR-GAME|REPLACE-WITH|your-public-game/i.test(value)) fail(`${key}: replace placeholders with a real public URL`);
    let url;
    try { url = new URL(value); } catch { fail(`${key}: invalid URL`); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(?:[\d.]+|\[.*\])$/.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|example\.com|example\.org|example\.net)$/.test(url.hostname)) fail(`${key}: use a public HTTPS URL without credentials or a custom port`);
  }
  if (typeof project.commit !== 'string' || !/^[a-f0-9]{40}$/.test(project.commit) || /^0+$/.test(project.commit)) fail('commit: use the full lowercase 40-character source commit SHA');
  if (project.practiceAvailable !== true) fail('reviewers need a free practice mode');
  return project;
}

function loadProjects(directory) {
  const projects = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === '.gitkeep') continue;
    if (!entry.isFile() || !entry.name.endsWith('.json')) throw new Error(`${entry.name}: only regular JSON files are allowed`);
    const file = path.join(directory, entry.name);
    if (fs.statSync(file).size > 16384) throw new Error(`${entry.name}: maximum size is 16 KiB`);
    const project = validateProject(JSON.parse(fs.readFileSync(file, 'utf8')), entry.name);
    if (projects.some(existing => existing.slug === project.slug || existing.playUrl === project.playUrl)) throw new Error(`${entry.name}: duplicate project`);
    projects.push(project);
  }
  return projects;
}

module.exports = { validateProject, loadProjects };
