/**
 * Tests for the deployable shell: the HTML entry point, the manifest, the
 * service worker, the stylesheet and the pure helpers in util.js.
 *
 * These guard the things that silently break a GitHub Pages deployment:
 * root-absolute paths, a manifest that cannot be installed, and a service
 * worker whose precache list drifts away from the files on disk.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { debounce, dataUrlSize, escapeHtml, formatBytes, formatDate, trackingCode, uid } from '../web/assets/js/util.js';
import { icon, categoryIcon } from '../web/assets/js/icons.js';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../web');
const read = (path) => readFileSync(join(web, path), 'utf8');

const indexHtml = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const serviceWorker = read('sw.js');
const css = read('assets/css/app.css');

test('shell: index.html declares everything an app needs', () => {
  assert.match(indexHtml, /^<!doctype html>/i);
  assert.match(indexHtml, /<meta charset="utf-8"/i);
  assert.match(indexHtml, /name="viewport"[^>]*width=device-width/i);
  assert.match(indexHtml, /name="theme-color"/i);
  assert.match(indexHtml, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(indexHtml, /<script type="module" src="assets\/js\/app\.js"><\/script>/);
  assert.match(indexHtml, /<link rel="stylesheet" href="assets\/css\/app\.css"/);
  assert.match(indexHtml, /<html lang="en" dir="ltr">/, 'documents must declare a language and direction');
});

test('shell: the router mounts into the hosts app.js expects', () => {
  for (const id of ['view', 'tabbar', 'topnav', 'net-pill', 'lang-toggle', 'theme-toggle', 'app-footer', 'toasts']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  for (const dialog of ['detail-dialog', 'app-dialog']) {
    assert.match(indexHtml, new RegExp(`<dialog[^>]*id="${dialog}"`), `missing <dialog id="${dialog}">`);
  }
});

test('shell: no root-absolute URLs anywhere (GitHub Pages subpath)', () => {
  for (const match of indexHtml.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    assert.fail(`root-absolute URL in index.html: ${match[1]}`);
  }
  for (const match of css.matchAll(/url\((\/[^)]*)\)/g)) {
    assert.fail(`root-absolute url() in app.css: ${match[1]}`);
  }
  assert.doesNotMatch(serviceWorker, /caches\.add\('\/|cache\.put\('\/|'\/index\.html'/);
  assert.ok(!String(manifest.start_url).startsWith('/'), 'manifest start_url must be relative');
  assert.ok(!String(manifest.scope).startsWith('/'), 'manifest scope must be relative');
});

test('shell: every referenced file exists', () => {
  const refs = new Set();
  for (const match of indexHtml.matchAll(/(?:href|src)="([^"#:][^"]*)"/g)) refs.add(match[1]);
  for (const iconEntry of manifest.icons) refs.add(iconEntry.src);
  for (const shortcut of manifest.shortcuts ?? []) {
    for (const iconEntry of shortcut.icons ?? []) refs.add(iconEntry.src);
  }
  for (const ref of refs) {
    if (/^https?:|^mailto:|^data:/.test(ref)) continue;
    assert.ok(existsSync(join(web, ref)), `referenced but missing: ${ref}`);
    assert.ok(statSync(join(web, ref)).size > 0, `referenced but empty: ${ref}`);
  }
});

test('shell: the manifest is installable', () => {
  assert.ok(manifest.name.length > 0);
  assert.ok(manifest.short_name.length <= 12, 'short_name must fit under an icon');
  assert.equal(manifest.start_url, './#/home');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(['ltr', 'rtl'].includes(manifest.dir));
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);

  const sizes = manifest.icons.map((entry) => entry.sizes);
  assert.ok(sizes.includes('192x192'), 'Chrome requires a 192px icon');
  assert.ok(sizes.includes('512x512'), 'Chrome requires a 512px icon');
  assert.ok(manifest.icons.some((entry) => entry.purpose?.includes('maskable')), 'needs a maskable icon');
  assert.ok(manifest.shortcuts.length >= 2, 'app shortcuts double as navigation');
});

test('shell: the service worker precaches the whole app shell', () => {
  const precacheBlock = serviceWorker.slice(
    serviceWorker.indexOf('SHELL_ASSETS'),
    serviceWorker.indexOf('];', serviceWorker.indexOf('SHELL_ASSETS')),
  );
  const precached = [...precacheBlock.matchAll(/'(\.\/[^']*)'/g)].map((match) => match[1]);
  assert.ok(precached.includes('./'), 'the root must be precached for offline navigation');
  assert.ok(precached.includes('./index.html'));
  for (const asset of ['app.js', 'content.js', 'i18n.js', 'icons.js', 'rag.js', 'store.js', 'util.js']) {
    assert.ok(precached.some((url) => url.endsWith(asset)), `precache list is missing ${asset}`);
  }
  assert.ok(precached.some((url) => url.endsWith('app.css')));
  assert.ok(precached.some((url) => url.endsWith('manifest.webmanifest')));

  for (const url of precached) {
    if (url === './') continue;
    assert.ok(existsSync(join(web, url.replace(/^\.\//, ''))), `precached file does not exist: ${url}`);
  }
});

test('shell: the service worker has a fetch handler, versioning and cleanup', () => {
  assert.match(serviceWorker, /addEventListener\('install'/);
  assert.match(serviceWorker, /addEventListener\('activate'/);
  assert.match(serviceWorker, /addEventListener\('fetch'/);
  assert.match(serviceWorker, /const VERSION = '/, 'caches must be versioned so updates can evict old shells');
  assert.match(serviceWorker, /caches\.delete/, 'old caches must be removed on activate');
  assert.match(serviceWorker, /skipWaiting|clients\.claim/);
  assert.doesNotMatch(serviceWorker, /importScripts/, 'the worker must stay dependency-free');
});

test('shell: 404.html mirrors the app so deep links survive', () => {
  assert.ok(existsSync(join(web, '404.html')), '404.html is required for GitHub Pages deep links');
  assert.equal(read('404.html'), indexHtml, '404.html must be an exact copy of the app shell');
});

test('shell: the stylesheet covers the whole UI and ships a theme', () => {
  assert.ok(css.length > 15_000, 'stylesheet looks truncated');
  assert.match(css, /:root\s*\{/, 'needs design tokens');
  assert.match(css, /prefers-color-scheme: dark/, 'respects the OS theme');
  assert.match(css, /\[data-theme="dark"\]/, 'supports an explicit theme');
  assert.match(css, /prefers-reduced-motion/, 'respects reduced motion');
  assert.match(css, /:focus-visible/, 'keyboard focus must be visible');
  assert.match(css, /\[dir="rtl"\]|\[lang="ar"\]/, 'needs RTL rules for Arabic');

  for (const component of ['service-card', 'quick-grid', 'stats__item', 'alert', 'chip', 'form', 'queue__item', 'msg', 'citation', 'timeline__step', 'segmented__btn', 'kv', 'dialog', 'toast']) {
    assert.match(css, new RegExp(`\\.${component}`), `no styles for .${component}`);
  }
});

test('shell: no obvious debugging leftovers in shipped code', () => {
  const sources = ['index.html', 'assets/css/app.css', 'sw.js', 'assets/js/app.js'].map(read);
  for (const source of sources) {
    assert.doesNotMatch(source, /\bdebugger\b/);
    assert.doesNotMatch(source, /\bTODO\b|\bFIXME\b/);
  }
  assert.doesNotMatch(read('assets/js/app.js'), /console\.log\(/, 'app.js must not log to the console in production');
});

test('util: escapeHtml neutralises every injection vector', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml('" onmouseover="alert(1)'), '&quot; onmouseover=&quot;alert(1)');
  assert.equal(escapeHtml("' OR 1=1 --"), '&#39; OR 1=1 --');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('util: tracking codes are unique and human-friendly', () => {
  const seen = new Set();
  for (let index = 0; index < 500; index += 1) {
    const code = trackingCode();
    assert.match(code, /^SSD-[A-Z2-9]{6}$/, `bad code: ${code}`);
    assert.doesNotMatch(code, /[01IO]/, 'ambiguous characters are excluded');
    seen.add(code);
  }
  assert.ok(seen.size > 480, 'codes should be effectively unique');
});

test('util: uid is unique and the requested length', () => {
  const values = new Set();
  for (let index = 0; index < 200; index += 1) values.add(uid(10));
  assert.equal(values.size, 200);
  assert.equal(uid(6).length <= 12, true);
});

test('util: dates and sizes format readably', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('not a date'), '—');
  assert.match(formatDate('2026-11-08'), /2026/);
  assert.match(formatDate('2026-11-08', 'ar'), /2026/, 'Arabic dates keep Latin digits');
  assert.equal(formatBytes(0), '0');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.00 MB');
});

test('util: photo payload sizes are estimated from base64', () => {
  assert.equal(dataUrlSize(''), 0);
  assert.equal(dataUrlSize('data:image/jpeg;base64,AAAA'), 3);
  const oneKb = 'A'.repeat(1368);
  assert.ok(Math.abs(dataUrlSize(`data:image/jpeg;base64,${oneKb}`) - 1026) <= 2);
});

test('util: debounce collapses bursts and forwards the last arguments', async () => {
  const calls = [];
  const fn = debounce((value) => calls.push(value), 20);
  fn('a');
  fn('b');
  fn('c');
  assert.deepEqual(calls, [], 'nothing fires synchronously');
  await new Promise((done) => setTimeout(done, 60));
  assert.deepEqual(calls, ['c'], 'only the final call in a burst runs');
});

test('icons: every icon renders valid, safe SVG', () => {
  for (const name of ['home', 'directory', 'megaphone', 'sparkles', 'more', 'health', 'education', 'water', 'civil', 'agriculture', 'justice']) {
    const markup = icon(name, { size: 20, className: 'probe' });
    assert.match(markup, /^<svg /, `${name} should render an svg`);
    assert.match(markup, /viewBox="0 0 24 24"/);
    assert.match(markup, /class="icon probe"/);
    assert.doesNotMatch(markup, /<script/i);
  }
  assert.match(categoryIcon('water', 18), /<svg/);
  const fallback = icon('does-not-exist');
  assert.match(fallback, /^<svg /, 'unknown icons fall back to a neutral glyph instead of crashing');
  assert.match(fallback, /<circle/, 'the fallback is a simple dot');
});
