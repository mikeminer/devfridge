const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { publishedProjects, loadPublishedProjects } = require('../lib/hackathon-feed.cjs');
const registry = require('../data/projects.json');
const sample = registry.projects[0];

test('feed excludes unapproved, unpublished and withdrawn games, including featured games', () => {
  for (const [approved, published] of [[false, false], [false, true], [true, false]]) {
    assert.deepEqual(publishedProjects({ schemaVersion: 1, projects: [{ ...sample, approved, published }] }).projects, []);
  }
  assert.deepEqual(publishedProjects({ schemaVersion: 1, projects: [sample] }).projects, [sample]);
  assert.deepEqual(publishedProjects({ schemaVersion: 1, projects: [] }).projects, []);
});

test('invalid registry, flags, duplicates and unsafe URLs fail closed', () => {
  for (const value of [null, {}, { schemaVersion: 2, projects: [] }, { schemaVersion: 1, projects: [], extra: true }]) {
    assert.throws(() => publishedProjects(value));
  }
  for (const change of [{ approved: 'true' }, { published: 1 }, { approved: undefined }, { playUrl: 'javascript:alert(1)' }, { surprise: true }]) {
    assert.throws(() => publishedProjects({ schemaVersion: 1, projects: [{ ...sample, ...change }] }));
  }
  assert.throws(() => publishedProjects({ schemaVersion: 1, projects: [sample, sample] }), /duplicate/);
  assert.throws(() => publishedProjects({ schemaVersion: 1, projects: [sample, { ...sample, slug: 'another-game' }] }), /duplicate/);
});

test('release snapshots do not change when a submitted proposal is updated', () => {
  const proposal = { ...sample, name: 'Unreviewed new release', commit: 'f'.repeat(40) };
  const feed = loadPublishedProjects(path.join(__dirname, '../data/projects.json'));
  assert.notEqual(feed.projects[0].name, proposal.name);
  assert.notEqual(feed.projects[0].commit, proposal.commit);
  assert.deepEqual(feed, publishedProjects(registry));
});
