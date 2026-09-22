const path = require('node:path');
const { loadProjects } = require('../scan/lib/hackathon-projects.cjs');
const directory = process.argv[2] || path.join(__dirname, '../scan/data/hackathon-projects');
const projects = loadProjects(directory);
console.log(`Validated ${projects.length} community project(s). Fridge Run is the built-in example.`);
