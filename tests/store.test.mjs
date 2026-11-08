/**
 * Tests for the local-first store: saved facilities, report lifecycle,
 * the offline queue and the export/reset contract.
 *
 * A minimal in-memory `localStorage` stands in for the browser so the module
 * can be exercised in Node exactly as the app uses it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #map = new Map();
  get length() {
    return this.#map.size;
  }
  key(index) {
    return [...this.#map.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(key, value) {
    this.#map.set(String(key), String(value));
  }
  removeItem(key) {
    this.#map.delete(key);
  }
  clear() {
    this.#map.clear();
  }
}

class FailingStorage extends MemoryStorage {
  setItem() {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    throw error;
  }
}

const KEY = 'ssddh.v1';

/** Fresh module instance per test so module-level state cannot leak. */
async function freshStore(storage = new MemoryStorage()) {
  globalThis.localStorage = storage;
  const module = await import(`../web/assets/js/store.js?t=${Math.random()}`);
  module.store.init();
  return { store: module.store, photos: module.photos, storage };
}

test('store: boots with a sane default state', async () => {
  const { store } = await freshStore();
  const state = store.getState();
  assert.equal(state.version, 1);
  assert.equal(state.lang, 'en');
  assert.deepEqual(state.savedIds, []);
  assert.deepEqual(state.reports, []);
  assert.deepEqual(state.chat, []);
  assert.equal(state.draft, null);
  assert.equal(store.isPersistent(), true);
});

test('store: state survives a reload', async () => {
  const storage = new MemoryStorage();
  const first = await freshStore(storage);
  first.store.setLang('ar');
  first.store.setTheme('dark');
  first.store.toggleSaved('juba-central-phcc');

  const second = await freshStore(storage);
  const state = second.store.getState();
  assert.equal(state.lang, 'ar');
  assert.equal(state.theme, 'dark');
  assert.deepEqual(state.savedIds, ['juba-central-phcc']);
});

test('store: corrupt storage degrades instead of crashing', async () => {
  const storage = new MemoryStorage();
  storage.setItem(KEY, '{not json');
  const { store } = await freshStore(storage);
  assert.deepEqual(store.getState().savedIds, []);
  assert.equal(store.isPersistent(), false, 'a corrupt blob marks the store as memory-only');
});

test('store: saving a facility toggles and is idempotent', async () => {
  const { store } = await freshStore();
  assert.equal(store.toggleSaved('juba-central-phcc'), true);
  assert.equal(store.toggleSaved('juba-central-phcc'), false);
  assert.equal(store.toggleSaved('munuki-maternal-clinic'), true);
  assert.deepEqual(store.getState().savedIds, ['munuki-maternal-clinic']);
});

test('store: subscribers are notified and can unsubscribe', async () => {
  const { store } = await freshStore();
  const seen = [];
  const unsubscribe = store.subscribe((state, reason) => seen.push(reason));
  store.setLang('ar');
  store.setTheme('light');
  unsubscribe();
  store.setLang('en');
  assert.deepEqual(seen, ['lang', 'theme']);
});

test('store: a failing localStorage is detected, not thrown', async () => {
  const { store } = await freshStore(new FailingStorage());
  store.setLang('ar');
  assert.equal(store.getState().lang, 'ar', 'the in-memory value still updates');
  assert.equal(store.isPersistent(), false);
});

test('store: drafts save, restore and clear', async () => {
  const { store } = await freshStore();
  store.saveDraft({ category: 'water', description: 'Broken pump in Gudele', consent: false });
  assert.equal(store.getState().draft.category, 'water');
  store.clearDraft();
  assert.equal(store.getState().draft, null);
});

test('store: reports enter the queue and advance through the lifecycle', async () => {
  const { store } = await freshStore();
  const report = {
    code: 'SSD-ABC123',
    category: 'water',
    description: 'Broken hand pump',
    createdAt: '2026-11-08T08:00:00.000Z',
    status: 'queued',
    idempotencyKey: 'rep-test-1',
  };
  store.addReport(report);
  assert.equal(store.getState().reports.length, 1);
  assert.equal(store.queue().length, 1);

  store.advanceReport('SSD-ABC123', 'received');
  assert.equal(store.getReport('SSD-ABC123').status, 'received');
  assert.equal(store.queue().length, 0, 'a received report leaves the queue');

  store.advanceReport('SSD-ABC123', 'in_review');
  store.advanceReport('SSD-ABC123', 'resolved');
  const resolved = store.getReport('SSD-ABC123');
  assert.equal(resolved.status, 'resolved');
  assert.deepEqual(
    resolved.history.map((entry) => entry.status),
    ['queued', 'received', 'in_review', 'resolved'],
    'every transition is recorded in order',
  );
  assert.equal(store.getReport('SSD-ABC123').history.at(-1).status, 'resolved');
});

test('store: lifecycle transitions are monotonic', async () => {
  const { store } = await freshStore();
  store.addReport({ code: 'SSD-AAA111', status: 'queued', idempotencyKey: 'k1', createdAt: '2026-11-08' });
  store.advanceReport('SSD-AAA111', 'resolved');
  store.advanceReport('SSD-AAA111', 'queued');
  assert.equal(store.getReport('SSD-AAA111').status, 'resolved', 'a report cannot move backwards');
});

test('store: adding the same report twice does not duplicate it', async () => {
  const { store } = await freshStore();
  const report = { code: 'SSD-DUP001', status: 'queued', idempotencyKey: 'rep-once', createdAt: '2026-11-08' };
  store.addReport(report);
  store.addReport(report);
  assert.equal(store.getState().reports.length, 1, 'idempotency key prevents double submission');
});

test('store: reports can be deleted', async () => {
  const { store } = await freshStore();
  store.addReport({ code: 'SSD-DEL001', status: 'queued', idempotencyKey: 'k', createdAt: '2026-11-08' });
  store.deleteReport('SSD-DEL001');
  assert.equal(store.getState().reports.length, 0);
  assert.equal(store.getReport('SSD-DEL001'), null);
});

test('store: the chat log is capped and can be cleared', async () => {
  const { store } = await freshStore();
  for (let index = 0; index < 120; index += 1) {
    store.addMessage({ role: index % 2 ? 'user' : 'bot', text: `message ${index}` });
  }
  assert.ok(store.getState().chat.length <= 100, 'history stays bounded');
  assert.equal(store.getState().chat.at(-1).text, 'message 119');
  store.clearChat();
  assert.deepEqual(store.getState().chat, []);
});

test('store: export contains the payload and a photo notice', async () => {
  const { store } = await freshStore();
  store.setLang('ar');
  store.toggleSaved('juba-central-phcc');
  store.addReport({ code: 'SSD-EXP001', status: 'queued', idempotencyKey: 'k', createdAt: '2026-11-08' });
  const payload = store.exportPayload({ version: '0.3.0' });
  assert.equal(payload.version, '0.3.0');
  assert.equal(payload.settings.lang, 'ar');
  assert.deepEqual(payload.savedServices, ['juba-central-phcc']);
  assert.equal(payload.reports.length, 1);
  assert.match(payload.notice, /photo/i, 'the export explains that photos are excluded');
  assert.match(payload.notice, /synthetic/i, 'the export restates that data is demo-only');
  assert.ok(payload.exportedAt, 'the export is timestamped');
});

test('store: resetAll clears everything including the queue', async () => {
  const { store, storage } = await freshStore();
  store.setLang('ar');
  store.toggleSaved('juba-central-phcc');
  store.addReport({ code: 'SSD-RES001', status: 'queued', idempotencyKey: 'k', createdAt: '2026-11-08' });
  store.saveDraft({ category: 'health' });
  store.addMessage({ role: 'user', text: 'hello' });
  store.resetAll();

  const state = store.getState();
  assert.deepEqual(state.savedIds, []);
  assert.deepEqual(state.reports, []);
  assert.deepEqual(state.chat, []);
  assert.equal(state.draft, null);
  assert.equal(state.lang, 'en', 'reset returns to the default language');
  assert.equal(storage.getItem(KEY) === null || JSON.parse(storage.getItem(KEY)).savedIds.length === 0, true);
});

test('store: approximateSize reports a plausible byte count', async () => {
  const { store } = await freshStore();
  const empty = store.approximateSize();
  store.toggleSaved('juba-central-phcc');
  const filled = store.approximateSize();
  assert.ok(empty > 0);
  assert.ok(filled >= empty, 'adding data grows the stored payload');
  assert.ok(filled < 200_000, 'the default payload stays small enough for localStorage');
});

test('store: photos are a no-op when IndexedDB is unavailable', async () => {
  const { photos } = await freshStore();
  // Node has no IndexedDB; every method must resolve instead of throwing.
  assert.equal(await photos.get('photo-001'), null);
  assert.equal(await photos.count(), 0);
  await photos.put('photo-001', 'data:image/jpeg;base64,AAA');
  await photos.remove('photo-001');
  await photos.clear();
});
