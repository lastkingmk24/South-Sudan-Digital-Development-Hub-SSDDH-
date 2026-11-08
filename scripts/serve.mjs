#!/usr/bin/env node
/**
 * Zero-dependency static server for local development.
 *
 * Serves `web/` (not the repo root) with the same relative-path behaviour as
 * GitHub Pages project sites, plus a 404 → index.html fallback so deep links
 * like /services work. Optionally builds into `_site` first.
 *
 *   node scripts/serve.mjs [--port 8080] [--host 0.0.0.0] [--site]
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index > -1 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
};

const port = Number(flag('port', process.env.PORT || 8080));
const host = flag('host', process.env.HOST || '0.0.0.0');
const servedRoot = args.includes('--site') ? join(root, '_site') : join(root, 'web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(servedRoot)) {
  console.error(`Nothing to serve at ${servedRoot}. Run \`npm run build\` first.`);
  process.exit(1);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Contain every request inside the served root.
  const target = normalize(join(servedRoot, pathname));
  if (!target.startsWith(servedRoot)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) file = join(servedRoot, '404.html');
  if (!existsSync(file)) file = join(servedRoot, 'index.html');

  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const isShell = file.endsWith('index.html') || file.endsWith('404.html');
  response.writeHead(isShell ? 200 : 200, {
    'Content-Type': type,
    'Cache-Control': isShell ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`SSDDH serving ${servedRoot}`);
  console.log(`  → http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`);
});
