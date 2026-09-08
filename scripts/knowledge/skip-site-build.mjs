// Vercel: exit 0 skips a build; exit 1 continues. Only knowledge-only commits skip.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export function shouldSkip(repo) {
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const paths = git('diff', '--name-only', '-z', 'HEAD^', 'HEAD').split('\0').filter(Boolean);
    if (!paths.length) return false;
    return paths.every(path => {
      if (/^(knowledge\/|scripts\/knowledge\/|synapse\/)/.test(path) || ['README.md', '.github/workflows/knowledge.yml', '.github/workflows/synapse.yml'].includes(path)) return true;
      if (!['vercel.json', 'app/vercel.json', 'scan/vercel.json', 'team/vercel.json'].includes(path)) return false;
      // Permit the one-time installation of this guard, never other configuration edits.
      const current = JSON.parse(git('show', `HEAD:${path}`));
      let previous;
      try { previous = JSON.parse(git('show', `HEAD^:${path}`)); }
      catch { previous = {}; }
      if (path === 'vercel.json' && current.services) {
        if (current.services.bot?.ignoreCommand !== 'node ../scripts/knowledge/skip-site-build.mjs') return false;
        delete current.services.bot.ignoreCommand;
        if (previous.services?.bot) delete previous.services.bot.ignoreCommand;
      } else if (current.ignoreCommand !== 'node ../scripts/knowledge/skip-site-build.mjs') return false;
      delete current.ignoreCommand;
      delete previous.ignoreCommand;
      return isDeepStrictEqual(previous, current);
    });
  } catch {
    // Missing git history or malformed config must never suppress a real deployment.
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const skip = shouldSkip(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
  console.log(skip ? 'Knowledge-only commit: skip website build.' : 'Build required or change scope could not be established.');
  process.exitCode = skip ? 0 : 1;
}
