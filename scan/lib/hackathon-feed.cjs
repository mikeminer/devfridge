// Owner-maintained release snapshots, separate from incoming submissions.
const fs = require('node:fs');
const path = require('node:path');
const { validateProject } = require('./hackathon-projects.cjs');

function publishedProjects(registry) {
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.projects) ||
      Object.keys(registry).some(key => !['schemaVersion', 'projects'].includes(key))) {
    throw new Error('projects.json: expected schemaVersion 1 and projects array');
  }
  const slugs = new Set();
  const urls = new Set();
  const projects = [];
  for (const entry of registry.projects) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('projects.json: invalid entry');
    const { approved, published, ...project } = entry;
    if (typeof approved !== 'boolean' || typeof published !== 'boolean') throw new Error('projects.json: approved and published must be booleans');
    validateProject(project, `${project.slug}.json`, { allowFeatured: true });
    if (slugs.has(project.slug) || urls.has(project.playUrl)) throw new Error('projects.json: duplicate slug or play URL');
    slugs.add(project.slug);
    urls.add(project.playUrl);
    if (approved === true && published === true) projects.push(entry);
  }
  return { schemaVersion: 1, projects };
}

function loadPublishedProjects(filename = path.join(process.cwd(), 'data/projects.json')) {
  return publishedProjects(JSON.parse(fs.readFileSync(filename, 'utf8')));
}

module.exports = { publishedProjects, loadPublishedProjects };
