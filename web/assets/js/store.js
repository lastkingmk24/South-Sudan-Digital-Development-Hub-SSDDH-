/**
 * Local-first state: settings, saved services, report drafts, the offline
 * upload queue and the assistant conversation.
 *
 * Everything lives on the device (localStorage for text, IndexedDB for photos).
 * No network calls are made anywhere in this module.
 */

const KEY = 'ssddh.v1';
const DB_NAME = 'ssddh-photos';
const DB_STORE = 'photos';

/** Report lifecycle, in order. Reports may not move backwards through it. */
export const REPORT_FLOW = ['queued', 'received', 'in_review', 'resolved'];

const MAX_CHAT_MESSAGES = 100;

const DEFAULT_STATE = {
  version: 1,
  lang: 'en',
  theme: 'system',
  savedIds: [],
  reports: [],
  draft: null,
  chat: [],
  lastSync: null,
};

let state = { ...DEFAULT_STATE };
let available = true;
const listeners = new Set();

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, version: 1 };
  } catch (error) {
    available = false;
    return { ...DEFAULT_STATE };
  }
}

function persist() {
  if (!available) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    available = false;
  }
}

function emit(reason) {
  for (const listener of listeners) {
    try {
      listener(state, reason);
    } catch (error) {
      console.error('[ssddh] store listener failed', error);
    }
  }
}

function commit(reason, mutate) {
  const next = clone(state);
  mutate(next);
  state = next;
  persist();
  emit(reason);
  return state;
}

/* ------------------------------- photos ---------------------------------- */

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

async function withStore(mode, fn) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, mode);
    const store = tx.objectStore(DB_STORE);
    let result = null;
    try {
      result = fn(store);
    } catch (error) {
      resolve(null);
      return;
    }
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : null);
    tx.onerror = () => resolve(null);
    tx.onabort = () => resolve(null);
  });
}

export const photos = {
  async put(id, dataUrl) {
    await withStore('readwrite', (store) => store.put({ id, dataUrl, addedAt: Date.now() }));
    return id;
  },
  async get(id) {
    const record = await withStore('readonly', (store) => store.get(id));
    return record ? record.dataUrl : null;
  },
  async remove(id) {
    await withStore('readwrite', (store) => store.delete(id));
  },
  async clear() {
    await withStore('readwrite', (store) => store.clear());
  },
  async count() {
    const keys = await withStore('readonly', (store) => store.getAllKeys());
    return Array.isArray(keys) ? keys.length : 0;
  },
};

/* -------------------------------- store --------------------------------- */

export const store = {
  init() {
    state = restore();
    return state;
  },

  getState() {
    return state;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  isPersistent() {
    return available;
  },

  setLang(lang) {
    commit('lang', (next) => {
      next.lang = lang;
    });
  },

  setTheme(theme) {
    commit('theme', (next) => {
      next.theme = theme;
    });
  },

  toggleSaved(id) {
    let saved = false;
    commit('saved', (next) => {
      const index = next.savedIds.indexOf(id);
      if (index === -1) {
        next.savedIds.push(id);
        saved = true;
      } else {
        next.savedIds.splice(index, 1);
      }
    });
    return saved;
  },

  isSaved(id) {
    return state.savedIds.includes(id);
  },

  /* ------------------------------ drafts -------------------------------- */

  saveDraft(draft) {
    commit('draft', (next) => {
      next.draft = draft;
    });
  },

  clearDraft() {
    commit('draft', (next) => {
      next.draft = null;
    });
  },

  /* ------------------------------ reports ------------------------------- */

  addReport(report) {
    let added = false;
    commit('reports', (next) => {
      // The idempotency key (and the tracking code) make submission safe to
      // retry: a queued report must never be duplicated.
      const duplicate = next.reports.some(
        (item) =>
          (report.idempotencyKey && item.idempotencyKey === report.idempotencyKey) ||
          (report.code && item.code === report.code),
      );
      if (duplicate) return;
      const now = new Date().toISOString();
      // Every report starts its history with the status it was created in, so
      // the timeline in the UI is complete even if a caller forgets it.
      const history = Array.isArray(report.history) && report.history.length
        ? report.history
        : [{ status: report.status || 'queued', at: report.createdAt || now }];
      next.reports.unshift({ ...report, history });
      added = true;
    });
    return added ? report : null;
  },

  updateReport(code, patch) {
    commit('reports', (next) => {
      const report = next.reports.find((item) => item.code === code);
      if (!report) return;
      Object.assign(report, patch);
      report.updatedAt = new Date().toISOString();
    });
  },

  advanceReport(code, status, note) {
    commit('reports', (next) => {
      const report = next.reports.find((item) => item.code === code);
      if (!report) return;
      if (report.status === status) return;
      // Terminal state: do not reopen a rejected or resolved report.
      if (report.status === 'rejected' || report.status === 'resolved') return;
      const from = REPORT_FLOW.indexOf(report.status);
      const to = REPORT_FLOW.indexOf(status);
      if (status !== 'rejected' && to !== -1 && from !== -1 && to < from) return;
      report.status = status;
      report.updatedAt = new Date().toISOString();
      report.history = report.history || [];
      report.history.push({ status, at: report.updatedAt, note: note || null });
    });
  },

  deleteReport(code) {
    commit('reports', (next) => {
      next.reports = next.reports.filter((item) => item.code !== code);
    });
  },

  getReport(code) {
    return state.reports.find((item) => item.code === code) || null;
  },

  queue() {
    return state.reports.filter((report) => report.status === 'queued');
  },

  /* -------------------------------- chat -------------------------------- */

  addMessage(message) {
    commit('chat', (next) => {
      next.chat.push(message);
      // Keep the tail of the conversation; the newest messages matter most.
      if (next.chat.length > MAX_CHAT_MESSAGES) next.chat = next.chat.slice(-MAX_CHAT_MESSAGES);
    });
    return message;
  },

  clearChat() {
    commit('chat', (next) => {
      next.chat = [];
    });
  },

  /* ------------------------------ housekeeping -------------------------- */

  markSynced() {
    commit('sync', (next) => {
      next.lastSync = new Date().toISOString();
    });
  },

  async resetAll() {
    state = { ...DEFAULT_STATE };
    persist();
    await photos.clear();
    emit('reset');
    return state;
  },

  exportPayload({ version }) {
    return {
      app: 'SSDDH',
      exportedAt: new Date().toISOString(),
      version,
      settings: { lang: state.lang, theme: state.theme },
      savedServices: state.savedIds,
      reports: state.reports,
      draft: state.draft,
      conversation: state.chat,
      notice:
        'Exported from the SSDDH demo build. All records are synthetic demo data. Photos are stored separately on the device and are not included.',
    };
  },

  approximateSize() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // Nothing written yet: measure the payload we would store.
        const preview = typeof TextEncoder === 'function' ? new TextEncoder().encode(JSON.stringify(state)).length : JSON.stringify(state).length;
        return preview;
      }
      return typeof TextEncoder === 'function' ? new TextEncoder().encode(raw).length : raw.length;
    } catch (error) {
      return 0;
    }
  },
};
