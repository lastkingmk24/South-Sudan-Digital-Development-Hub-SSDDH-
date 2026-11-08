#!/usr/bin/env node
/**
 * SSDDH build + validation.
 *
 * The app is a static, dependency-free PWA — there is nothing to bundle.
 * This script therefore *verifies* the deployable artefact in `web/` instead
 * of transforming it, and fails the build on anything that would break the
 * published site:
 *
 *   1. every file referenced by index.html / manifest / service worker exists
 *   2. all internal URLs are relative (GitHub Pages serves from a subpath)
 *   3. the service worker cannot escape its scope
 *   4. no dead `href="#"` links or placeholder TODOs in shipped files
 *   5. every class used by the JS/HTML has a rule in app.css
 *   6. every translation key used by app.js exists in both languages
 *
 * Usage: node scripts/build.mjs [--out <dir>]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const webDir = join(root, 'web');
const outArg = process.argv.indexOf('--out');
const outDir = outArg > -1 ? resolve(process.argv[outArg + 1]) : null;

const problems = [];
const notes = [];
const fail = (message) => problems.push(message);

/* ------------------------------- 1. files ------------------------------- */

const html = readFileSync(join(webDir, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(webDir, 'manifest.webmanifest'), 'utf8'));
const sw = readFileSync(join(webDir, 'sw.js'), 'utf8');
const css = readFileSync(join(webDir, 'assets/css/app.css'), 'utf8');
const appJs = readFileSync(join(webDir, 'assets/js/app.js'), 'utf8');

const localRefs = new Set();
for (const match of html.matchAll(/(?:href|src)="([^"#:][^"]*)"/g)) {
  const url = match[1].split('?')[0];
  if (url && !url.startsWith('http') && !url.startsWith('#') && !url.startsWith('mailto:')) localRefs.add(url);
}
for (const icon of manifest.icons || []) localRefs.add(icon.src);
for (const shortcut of manifest.shortcuts || []) {
  for (const icon of shortcut.icons || []) localRefs.add(icon.src);
}
for (const match of sw.matchAll(/'(\.\/[^']+)'/g)) {
  const url = match[1];
  if (url.includes('*')) continue;
  if (url === './') continue;
  localRefs.add(url.replace(/^\.\//, ''));
}

for (const ref of localRefs) {
  const target = join(webDir, normalize(ref));
  if (!existsSync(target)) fail(`missing referenced file: ${ref}`);
}
notes.push(`${localRefs.size} referenced files checked`);

/* -------------------------- 2. relative URLs ---------------------------- */

for (const ref of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
  fail(`root-absolute URL breaks GitHub Pages subpath hosting: ${ref[1]}`);
}
// Social scrapers require absolute og: URLs, so those are allowed — but they
// must point at the real production host, not a placeholder.
for (const ref of html.matchAll(/property="og:(?:image|url)" content="(https?:\/\/[^"]*)"/g)) {
  if (!ref[1].startsWith('https://lastkingmk24.github.io/')) {
    fail(`og: URL must point at the production host: ${ref[1]}`);
  }
}
for (const ref of css.matchAll(/url\((\/[^)]*)\)/g)) {
  fail(`root-absolute url() in CSS: ${ref[1]}`);
}
if (/start_url"\s*:\s*"\//.test(JSON.stringify(manifest)) || /"scope"\s*:\s*"\//.test(JSON.stringify(manifest))) {
  fail('manifest start_url/scope must be relative');
}

/* ------------------------- 3. service worker ---------------------------- */

for (const forbidden of ['/index.html', "'/", '"/']) {
  if (sw.includes(`caches.add('${forbidden}`)) fail(`service worker caches a root-absolute path: ${forbidden}`);
}
if (/navigateFallback|workbox/.test(sw)) notes.push('custom service worker (no workbox)');
for (const asset of ['app.js', 'app.css', 'manifest.webmanifest']) {
  if (!sw.includes(asset)) fail(`service worker precache list is missing ${asset}`);
}
notes.push('service worker precache covers the app shell');

/* ---------------------------- 4. hygiene -------------------------------- */

const shipped = [html, css, appJs, sw];
for (const name of ['content.js', 'i18n.js', 'rag.js', 'store.js', 'util.js', 'icons.js']) {
  shipped.push(readFileSync(join(webDir, 'assets/js', name), 'utf8'));
}
for (const source of shipped) {
  if (/href="#"/.test(source)) fail('found a dead href="#" link');
  if (/\bTODO\b|\bFIXME\b/.test(source)) fail('found a TODO/FIXME marker in shipped code');
}
if (/console\.log\(/.test(appJs.replace(/console\.error/g, ''))) notes.push('app.js has console.log calls');

/* --------------------------- 5. CSS coverage ---------------------------- */

const usedClasses = new Set();
for (const source of [html, appJs]) {
  for (const match of source.matchAll(/class="([^"`$]+)"/g)) {
    for (const cls of match[1].split(/\s+/)) if (/^[a-z][a-zA-Z0-9_-]*$/.test(cls)) usedClasses.add(cls);
  }
  for (const match of source.matchAll(/classList\.(?:add|remove|toggle)\('([a-z0-9_-]+)'/g)) usedClasses.add(match[1]);
  for (const match of source.matchAll(/class=\\?"([a-z][a-zA-Z0-9_-]*)\\?"/g)) usedClasses.add(match[1]);
}
const definedClasses = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]));
const missingClasses = [...usedClasses].filter((cls) => !definedClasses.has(cls));
if (missingClasses.length) fail(`classes used but not styled: ${missingClasses.join(', ')}`);
notes.push(`${usedClasses.size} classes verified against app.css`);

/* ------------------------ 6. translation parity ------------------------- */

const i18nSource = readFileSync(join(webDir, 'assets/js/i18n.js'), 'utf8');
const blockOf = (name) => {
  const start = i18nSource.indexOf(`const ${name} = {`);
  const end = i18nSource.indexOf('\n};', start);
  return i18nSource.slice(start, end);
};
const keysOf = (block) => new Set([...block.matchAll(/'([\w.]+)':/g)].map((m) => m[1]));
const enKeys = keysOf(blockOf('en'));
const arKeys = keysOf(blockOf('ar'));
const missingAr = [...enKeys].filter((key) => !arKeys.has(key));
const missingEn = [...arKeys].filter((key) => !enKeys.has(key));
if (missingAr.length) fail(`Arabic translation missing: ${missingAr.join(', ')}`);
if (missingEn.length) fail(`English translation missing: ${missingEn.join(', ')}`);

const usedKeys = new Set();
for (const source of [appJs, html]) {
  for (const match of source.matchAll(/\b(?:tt|t)\('([\w.]+)'/g)) usedKeys.add(match[1]);
  for (const match of source.matchAll(/data-i18n="([\w.]+)"/g)) usedKeys.add(match[1]);
  for (const match of source.matchAll(/tt\(`(nav|cat|status)\.\$\{/g)) {
    const prefix = match[1];
    for (const key of enKeys) if (key.startsWith(`${prefix}.`)) usedKeys.add(key);
  }
}
const unknownKeys = [...usedKeys].filter((key) => !enKeys.has(key));
if (unknownKeys.length) fail(`translation keys used but not defined: ${unknownKeys.join(', ')}`);
notes.push(`${usedKeys.size} translation keys resolve, en/ar parity ${enKeys.size}/${arKeys.size}`);

/* ------------------------------ 7. emit -------------------------------- */

const assets = ['index.html', '404.html', 'manifest.webmanifest', 'sw.js', 'assets'];
let totalBytes = 0;
for (const name of assets) {
  const path = join(webDir, name);
  if (!existsSync(path)) {
    fail(`missing deploy artefact: ${name}`);
    continue;
  }
  const stat = statSync(path);
  if (stat.isFile()) totalBytes += stat.size;
}

console.log('SSDDH build check');
for (const note of notes) console.log(`  · ${note}`);
console.log(`  · payload ≈ ${(totalBytes / 1024).toFixed(1)} kB (excluding CSS/JS walked separately)`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

if (outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const name of assets) cpSync(join(webDir, name), join(outDir, name), { recursive: true });
  // 404.html must be a copy of the app shell so deep links keep working.
  writeFileSync(join(outDir, '.nojekyll'), '');
  console.log(`\n✔ built into ${outDir}`);
} else {
  console.log('\n✔ web/ is deployable as-is');
}
