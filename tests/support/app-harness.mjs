/**
 * A tiny DOM harness for the app shell.
 *
 * The UI itself is framework-free and dependency-free, so the tests need a
 * DOM. Rather than pull a browser into CI, we build one with jsdom when it is
 * available and skip the UI suite otherwise. `npm install` (devDependency)
 * or `npm run test:ui` enables it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = resolve(here, '../../web');

let jsdomModule = null;
try {
  jsdomModule = await import('jsdom');
} catch {
  jsdomModule = null;
}

export const hasDom = jsdomModule !== null;

/**
 * Boots the real `web/index.html` + `web/assets/js/app.js` in a jsdom window.
 * @param {{hash?: string, online?: boolean, storage?: Storage}} [options]
 */
export async function bootApp(options = {}) {
  if (!hasDom) throw new Error('jsdom is not installed');
  const { JSDOM } = jsdomModule;
  const html = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
  const url = `https://example.github.io/ssddh/index.html${options.hash ?? ''}`;

  const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', (event) => errors.push(String(event.message)));
  window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));

  // jsdom gaps: <dialog>, matchMedia, scrolling, online status, service workers.
  window.HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.removeAttribute('open');
    this.dispatchEvent(new window.Event('close'));
  };
  window.matchMedia =
    window.matchMedia ??
    ((query) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }));
  window.scrollTo = () => {};
  window.confirm = () => true;
  Object.defineProperty(window.navigator, 'onLine', { value: options.online !== false, configurable: true });
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: { register: () => Promise.resolve(), addEventListener() {}, ready: Promise.resolve() },
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: () => Promise.resolve() },
    configurable: true,
  });

  if (options.storage) {
    for (const [key, value] of Object.entries(options.storage)) window.localStorage.setItem(key, value);
  }

  // The modules are browser modules; expose the window they expect.
  const globals = [
    'window',
    'document',
    'localStorage',
    'HTMLElement',
    'Element',
    'Node',
    'CustomEvent',
    'Event',
    'location',
    'history',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'structuredClone',
    'Blob',
    'FileReader',
    'URL',
    'MutationObserver',
    'DOMParser',
    'crypto',
    'HTMLDialogElement',
    'Image',
    'FormData',
    'Storage',
  ];
  const previous = new Map();
  const assign = (key, value) => {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    try {
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    } catch {
      /* non-configurable globals (e.g. navigator) are handled below */
    }
  };
  for (const key of globals) {
    if (key === 'window') continue;
    if (window[key] !== undefined) assign(key, window[key]);
  }
  assign('window', window);
  assign('navigator', window.navigator);
  assign('localStorage', window.localStorage);

  const module = await import(`${pathToFileURL(join(WEB_ROOT, 'assets/js/app.js')).href}?boot=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await settle(120);

  const $ = (selector) => window.document.querySelector(selector);
  const $$ = (selector) => [...window.document.querySelectorAll(selector)];

  const app = {
    window,
    document: window.document,
    module,
    errors,
    $,
    $$,
    text: (selector) => $(selector)?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    async go(hash) {
      window.location.hash = hash;
      window.dispatchEvent(new window.Event('hashchange'));
      await settle(140);
    },
    async click(selector) {
      const node = typeof selector === 'string' ? $(selector) : selector;
      if (!node) throw new Error(`nothing to click: ${selector}`);
      node.click();
      await settle(140);
    },
    async type(selector, value) {
      const node = typeof selector === 'string' ? $(selector) : selector;
      if (!node) throw new Error(`nothing to type into: ${selector}`);
      node.value = value;
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
      node.dispatchEvent(new window.Event('change', { bubbles: true }));
      await settle(320);
    },
    async submit(selector) {
      const node = typeof selector === 'string' ? $(selector) : selector;
      node.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await settle(200);
    },
    state() {
      return JSON.parse(window.localStorage.getItem('ssddh.v1') || '{}');
    },
    destroy() {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
      window.close();
    },
  };
  return app;
}

export const settle = (ms = 60) => new Promise((done) => setTimeout(done, ms));
