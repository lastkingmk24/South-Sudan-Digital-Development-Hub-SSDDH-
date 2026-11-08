# Architecture

SSDDH is a static progressive web app. There is no server, no build step at runtime, no framework
and no third-party request. This document explains how the pieces fit together and why.

## Constraints that shaped the design

1. **GitHub Pages is the only host.** It serves static files from a project subpath
   (`/<user>/<repo>/`) with no server-side logic.
2. **The target users are offline-first.** Intermittent connectivity is the norm, so the app must
   open, search and accept a report with no network at all.
3. **The assistant must not hallucinate.** With no model server available, retrieval and generation
   both happen in the browser over a small, approved corpus — and the retrieval layer is allowed to
   say "I don't know".
4. **The repository must not claim what it does not have.** Every path in this repo runs.

## Layers

```
index.html
  └── assets/js/app.js          orchestration: router, views, events, dialogs
        ├── content.js          static demo data + approved documents
        ├── i18n.js             EN/AR dictionaries, t(), localisation helpers
        ├── rag.js              BM25 index, Arabic expansion, refusal gate
        ├── store.js            localStorage state + IndexedDB photos
        ├── util.js             escaping, dates, bytes, toasts, confirm dialog, image resize
        └── icons.js            inline SVG icon set
```

`content.js`, `i18n.js`, `rag.js` and `store.js` are DOM-free on purpose: they are unit-testable in
plain Node with zero setup, which is why the test suite can cover retrieval quality and persistence
without a browser.

## Rendering

There is no virtual DOM. Each route renders a template string into `#view`, and events are handled
**by delegation** on `document`:

```js
document.addEventListener('click', onGlobalClick);   // reads data-action
```

That means re-rendering is always safe — no listener needs re-binding after a view swap, and no
elements leak handlers. Views re-render wholesale on navigation; within a view, only the parts that
change (results list, chat log, queue) are repainted.

Escaping is centralised: every interpolated string goes through `escapeHtml()` from `util.js`. The
tests assert that `escapeHtml` neutralises `<`, `>`, `"`, `'` and `&`, including for `null`.

## State

Two durable stores, both on the device:

| Store | Contents | Why |
|---|---|---|
| `localStorage['ssddh.v1']` | `{version, lang, theme, savedIds, reports, draft, chat, lastSync}` | Small, synchronous, survives reloads |
| IndexedDB `ssddh-photos` / `photos` | `{id, dataUrl, addedAt}` | Photos are ~150 kB; too large for localStorage |

`store.js` exposes a small command API (`toggleSaved`, `addReport`, `advanceReport`, `addMessage`,
`exportPayload`, `resetAll`). Every mutation produces a new state object, persists it, and notifies
subscribers. If `localStorage` throws (private mode, quota, corrupt JSON) the store downgrades to
memory-only, sets `isPersistent()` to false, and the UI keeps working.

### Report lifecycle

```
queued → received → in_review → resolved
                            ↘ rejected
```

- `queued`: stored on the device, not yet uploaded.
- `received`: the simulated sync accepted it.
- `in_review`, `resolved`, `rejected`: staff actions in a real deployment.

`advanceReport` refuses to move a report backwards and refuses to reopen a terminal state. Every
transition appends to `history`, which is what the timeline in the report dialog renders.

`addReport` is idempotent by `idempotencyKey` **and** by tracking code. Submission can be retried
after a crash or a double tap without duplicating a report.

## Retrieval

`rag.js` builds a BM25 index (`k1 = 1.5`, `b = 0.75`) over every section of every approved document.

**Indexing.** Each passage is `${title} ${title} ${heading} ${heading} ${text}` — the title and
heading are repeated so a section *about* a topic outranks a section that merely mentions it.

**Query handling.**
- `normalize` lowercases, strips Arabic diacritics, folds alef/ya/ta-marbuta variants, and removes
  punctuation and zero-width characters.
- `tokenize` drops stop words in both languages and applies a light stemmer.
- `expandQuery` adds English equivalents for Arabic tokens, including tokens carrying Arabic
  prefixes (`و`, `ب`, `ل`, `ف`, `ك`, `ال`) — so `لتسجيل` resolves like `تسجيل` and `المستندات` like
  `مستندات`. This is what lets an Arabic question retrieve the English corpus.

**The refusal gate.** An answer is produced only when there is a strong passage *and* either term
coverage ≥ 0.45 or at least two matched query terms, *and* the top BM25 score clears 2.2. Otherwise
`answer()` returns `{refused: true}` and the UI renders an honest refusal. This is the single most
important behaviour in the app: the assistant is useful because it is bounded.

**Citations.** Every answer carries up to three citations, each with document title, issuing
authority, approval date, section heading and a snippet centred on the first query hit. The UI shows
all of it, and the tests verify that each citation resolves to a real section of a real document.

## Offline

`sw.js` has two strategies:

| Request | Strategy | Rationale |
|---|---|---|
| Navigations | Network first, fall back to cached shell | Users get the newest build when online and still open offline |
| Static assets | Cache first, then network (and remember) | Instant repeat loads; the shell is versioned |

Caches are namespaced by version (`ssddh-shell-v0.3.0`), and `activate` deletes every other
`ssddh-` cache. The precache list is asserted against the filesystem by both `scripts/build.mjs` and
`tests/shell.test.mjs`, so it cannot silently drift.

## Bilingual and RTL

- `i18n.js` holds two flat dictionaries of 223 keys. A test enforces key parity and matching
  `{placeholder}` sets across languages.
- `t(key, vars)` falls back to English, then to the key itself, so a missing string is visible rather
  than blank.
- Direction is applied to `<html dir>` at runtime. Layout uses logical properties
  (`inset-inline`, `margin-inline`, `border-inline-start`), so a direction switch mirrors the UI
  without a second stylesheet.

## Deployment

```
push to main
   → npm ci
   → npm run check          # assets exist, paths relative, manifest valid, CSS covers markup,
   → npm test               #   i18n parity; then 66 tests
   → npm run build          # copy web/ → _site/, write .nojekyll
   → upload-pages-artifact  # _site/
   → deploy-pages
```

`web/404.html` is an exact copy of `index.html`, so GitHub Pages serves the app for any unknown
path and the hash router takes over. `.nojekyll` stops Pages from running Jekyll over the output.

## Known limitations

- The demo sync is simulated on a timer-free code path; nothing leaves the device.
- Search is a substring match over a 20-record array; it does not scale to a real registry.
- Photos are stored as data URLs in IndexedDB and are intentionally excluded from JSON export.
- The Arabic translations are complete but not professionally reviewed.
- No analytics, no error reporting, no accounts. All three are deliberate for a demo, and all three
  are required for a real deployment (see `ROADMAP.md`).
