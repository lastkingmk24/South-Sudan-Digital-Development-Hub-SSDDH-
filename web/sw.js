/* SSDDH service worker — cache-first app shell, network-first navigation.
 * All paths are relative so the app works from a project subpath
 * (e.g. https://<user>.github.io/<repo>/) without configuration.
 */

const VERSION = 'v0.3.0';
const SHELL_CACHE = `ssddh-shell-${VERSION}`;
const RUNTIME_CACHE = `ssddh-runtime-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/app.js',
  './assets/js/content.js',
  './assets/js/i18n.js',
  './assets/js/icons.js',
  './assets/js/rag.js',
  './assets/js/store.js',
  './assets/js/util.js',
  './assets/img/logo.svg',
  './assets/img/favicon.svg',
  './assets/img/favicon-32.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Precache the shell; tolerate individual misses so one bad file
      // cannot block the whole install.
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('ssddh-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('ssddh-')).map((key) => caches.delete(key)));
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so updates land quickly, fall back to the
  // cached shell (including for the GitHub Pages 404 page / unknown routes).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone()).catch(() => undefined);
          return response;
        } catch {
          const cached = (await caches.match(request)) || (await caches.match('./index.html'));
          return (
            cached ||
            new Response('<h1>Offline</h1><p>Open SSDDH once while online to cache the app.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            })
          );
        }
      })()
    );
    return;
  }

  // Static assets: cache first, then network (and remember it).
  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: false });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === 'basic') {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      } catch {
        if (request.destination === 'image') {
          return caches.match('./assets/img/logo.svg').then((r) => r || Response.error());
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
