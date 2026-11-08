# South Sudan Digital Development Hub (SSDDH)

**Founder: Mabruk Kei Ring**

An offline-first citizen services app for South Sudan: a directory of verified public facilities, a
community issue-reporting queue, and an information assistant that answers **only** from approved
documents and shows its citations.

**Live app → https://lastkingmk24.github.io/South-Sudan-Digital-Development-Hub-SSDDH-/**

> **Demo data is synthetic.** Every facility, alert and document in this build is a fictional
> placeholder written for this repository. Nothing here represents a real facility, phone number,
> government partner or official approval — the app repeats this in its footer, settings screen and
> assistant. Real records must be entered and verified by authorised staff (see
> [`docs/ROADMAP.md`](docs/ROADMAP.md)).

---

## What this repository actually contains

The project was originally described as a full platform (FastAPI + PostGIS backend, Next.js admin
dashboard, Flutter app). Those components were never committed, and the previous GitHub Pages
workflow published the empty repository root, so the site served nothing.

This repository now ships **one thing that works end to end**: a static, dependency-free progressive
web app in [`web/`](web) that runs entirely in the browser and deploys to GitHub Pages.

| Path | What it is |
|---|---|
| `web/` | The complete app: HTML, CSS, ES modules, icons, manifest, service worker. No build step, no CDN, no network calls. |
| `scripts/build.mjs` | Validates the shell (paths, manifest, precache list, CSS coverage, i18n parity) and assembles `_site/`. |
| `scripts/serve.mjs` | Zero-dependency static server for local development. |
| `tests/` | Node test-runner suites: data/i18n/retrieval, local store, deployable shell, and DOM-level UI tests. |
| `.github/workflows/static.yml` | Build → verify → test → deploy `_site/` to Pages. |
| `docs/ROADMAP.md` | What is intentionally not built yet, and what a real deployment needs. |

## The app

| Screen | What it does |
|---|---|
| **Home** | Bilingual hero with search, per-issue quick actions, current alerts, live counts and an explicit demo-data notice. |
| **Services** | 20 demo facilities across six categories and ten states. Text search, category filters, state filter, sort by recency/name, saved-only toggle, and detail dialogs with call, map and "report about this facility" actions. |
| **Saved** | The same directory restricted to facilities you saved; saved choices survive reloads and offline periods. |
| **Report** | Category, optional facility, free-text description (20–1000 chars), consent checkbox, optional photo resized on-device to 1024 px/≈150 KB, optional approximate location. Reports get a tracking code (`SSD-XXXXXX`) and an idempotency key. |
| **Assistant** | BM25 retrieval over 10 approved documents. Answers quote the best-matching sections and always list citations (document, issuing authority, approval date, section heading). Below a confidence threshold it refuses instead of guessing. |
| **Settings** | Language, theme, storage usage, JSON export, and delete-everything. |

**Offline first.** Everything is stored on the device: `localStorage` for saved items, drafts,
reports and the conversation; IndexedDB for photos. A service worker precaches the whole shell, so
the app opens and works without a connection. Reports created offline sit in an upload queue and are
marked received when the connection returns.

**Bilingual.** Full English and Arabic dictionaries (223 keys, enforced at parity by a test), an
Arabic→English query expander so Arabic questions retrieve the English corpus, and RTL layout that
survives switching direction at runtime.

**Accessible.** Semantic landmarks, a skip link, visible `:focus-visible` rings, `aria-live` regions
for the toast host and chat log, `aria-pressed` on toggles, and `prefers-reduced-motion` support.

## Run it locally

Requirements: Node.js 20 or newer. The app itself needs nothing but a static file server.

```bash
npm install          # dev dependency: jsdom, only for the UI tests
npm start            # http://localhost:8080 — serves web/ with SPA fallback
npm test             # all suites (66 tests)
npm run build        # validate + assemble _site/
```

Open `web/index.html` through a server rather than `file://` — ES modules and the service worker
require an HTTP origin.

### Verifying the build

`npm run check` fails the build on the things that silently break a Pages deployment:

- a referenced asset that does not exist
- a root-absolute URL (the site is served from `/<repo>/`, so every path must be relative)
- a manifest missing its 192/512/maskable icons
- a service-worker precache list that has drifted from the files on disk
- a class used by the JS but never styled
- a translation key used by the app but missing from English or Arabic

## Testing

```
node --test tests/                    # everything
node --test tests/content.test.mjs    # data, i18n parity, BM25 retrieval and refusals
node --test tests/store.test.mjs      # persistence, report lifecycle, idempotency, export
node --test tests/shell.test.mjs      # index.html, manifest, service worker, CSS, helpers
node --test tests/app.test.mjs        # UI flows in jsdom (skipped if jsdom is absent)
```

The UI suite boots the real `web/index.html` and `web/assets/js/app.js` in jsdom and exercises the
actual flows: search and filters, saving, the report form and validation, tracking a report's
timeline, assistant answers and refusals, language switching, the theme toggle, offline submission
and queue draining, and unknown-route fallback.

## Deploy

Pushing to `main` runs `.github/workflows/static.yml`: it installs dependencies, validates the
shell, runs the full test suite, assembles `_site/`, and publishes it with GitHub Pages. Nothing is
built into the repository root, and `_site/` is git-ignored.

To deploy from a fork, enable **Settings → Pages → Build and deployment → GitHub Actions** once;
the workflow needs `pages: write` and `id-token: write`, which it requests itself.

## Architecture

```
web/
├── index.html              # single page, all views render into #view
├── 404.html                # byte-identical copy so deep links survive on Pages
├── manifest.webmanifest    # installable PWA metadata, relative start_url/scope
├── sw.js                   # cache-first shell, network-first navigations, versioned caches
└── assets/
    ├── css/app.css         # design tokens, light/dark, RTL, all components
    ├── img/                # hand-built SVG logo, PNG icons, social card
    └── js/
        ├── app.js          # router, six views, dialogs, delegated events
        ├── content.js      # demo data + approved knowledge base
        ├── i18n.js         # EN/AR dictionaries and helpers
        ├── rag.js          # BM25 index, Arabic expansion, refusal gate
        ├── store.js        # localStorage state, IndexedDB photos
        ├── util.js         # escaping, formatting, toasts, dialogs, image resize
        └── icons.js        # inline SVG icon set
```

No framework, no bundler, no runtime dependency, no analytics, no third-party requests. The whole
deployable artefact is under 600 kB, most of it PNG icons.

### Design decisions worth knowing

- **Static over server.** GitHub Pages serves files only, so the app is serverless by design. The
  assistant is a real retrieval engine running in the browser, not a mock.
- **Refusal is a feature.** `rag.js` returns `refused: true` when coverage or score is too low. The
  UI renders that as an honest "I could not find this in the approved documents" rather than a
  plausible-sounding guess.
- **Relative everything.** Project sites live under `/<repo>/`; absolute paths work locally and fail
  in production. Both the build script and the tests fail on absolute paths.
- **Demo data is labelled at the source.** Records carry `source: 'demo'`, the UI shows a "Demo data"
  chip, and the footer says it is not an official government service.

## What is *not* in this repository

**These components never existed here.** The first commit contained six files — a README, a licence,
a `.gitignore`, a `.env.example`, a `docker-compose.yml` and a Pages workflow. There was no
application code. The FastAPI backend, Next.js admin dashboard, Flutter client, PostGIS database and
Ollama integration described in earlier drafts of this README were never committed, so nothing was
deleted when they were dropped from the docs.

What *was* removed was scaffolding that could only fail:

- **`docker-compose.yml`** declared `build: ./backend` and `context: ./admin-dashboard`. Neither
  directory existed, so `docker compose up` could not build.
- **`.env.example`** configured database credentials and a bootstrap admin for a backend that was
  not there.

Keeping them would have meant continuing to advertise services the repository cannot start. The
[ROADMAP](docs/ROADMAP.md) records the design, the deletion and the order real work would follow.

### No accounts, no login — deliberately

There is no authentication in this build, and there cannot be: GitHub Pages serves static files, so
there is no server to verify a password, hold a session, or keep a signing key. A login screen built
purely in the browser would check credentials against a file every visitor can read — it would look
like security while providing none.

The app uses **device-local identity** instead. Nothing about a user leaves the device, reports are
submitted anonymously with a tracking code the citizen keeps, and the only trust relationship is an
explicit consent checkbox, a JSON export and a one-tap erase. Reports are idempotent, so retries
never duplicate them.

Real accounts are blocked on decisions that are not a developer's to make — identity provider, which
identifier is actually usable in South Sudan, how a password is recovered without email or SMS, and
whether reports need an identity at all (they probably do not; staff moderation does). Those are set
out in [ROADMAP → Accounts and authentication](docs/ROADMAP.md#accounts-and-authentication-absent-by-design-not-by-accident).

## Licence

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Mabruk Kei Ring.
