import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) throw new Error('invalid path');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'text/plain') + '; charset=utf-8' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4178, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4178'));
