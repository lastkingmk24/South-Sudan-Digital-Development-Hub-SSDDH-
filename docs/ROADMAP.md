# SSDDH roadmap

This build is a **working, deployable prototype**, not a government service. It demonstrates the
whole citizen journey — find a facility, save it, report a problem, track the report, ask a
document-grounded question — with no server, no accounts and no real data.

This document records what is deliberately missing so nobody mistakes the demo for a launch, and the
order in which the missing pieces would need to arrive.

## Status

| Area | State today | Needed for real use |
|---|---|---|
| Facility directory | 20 synthetic `[DEMO]` records, bilingual names, verified/unverified, verification dates | Verified records entered by authorised staff, an editorial workflow, and an audit trail for every change |
| Search | Client-side text match, category/state filters, sort, saved-only | Server-side search that scales past a few thousand records; spell tolerance for transliterated names |
| Reporting | Local drafts, photo resize, approximate location, tracking code, offline queue, simulated sync | A real API with authentication, idempotent submission, server-side storage of photos, and a moderation console |
| Report status | Simulated transitions (`queued → received → in_review → resolved`) | Actual assignments, SLAs, notifications, and case notes written by staff |
| Assistant | In-browser BM25 over 10 approved documents, hard refusal gate, mandatory citations | Reviewed corpus, retrieval evaluation set, and a human escalation path when the answer is refused |
| Languages | English + Arabic UI, Arabic→English query expansion, RTL layout | Juba Arabic and additional South Sudanese languages; human review of all official translations |
| Accounts | None | Consent-based registration, roles (citizen/moderator/admin), MFA for staff |
| Backend | None | API service, PostgreSQL/PostGIS, object storage for photos, audit log, rate limiting |
| Mobile | Installable PWA | Native wrappers if push notifications or background sync are required |
| Accessibility | Keyboard, focus, live regions, reduced motion | Independent audit against WCAG 2.2 AA with assistive-technology users |

## What was deleted, and what never existed

Two different things get confused here, so stating both plainly:

**Nothing was deleted from a working platform.** The backend, admin dashboard and mobile client were
never in this repository. The first commit (`3ca5820`) contained six files:

```
.env.example  .github/workflows/static.yml  .gitignore  LICENSE  README.md  docker-compose.yml
```

There was no `backend/`, no `admin-dashboard/`, no `mobile/`, and no application code of any kind.
The README described those components in detail, but no line of them had been committed.

**What was actually removed** was the scaffolding that pointed at code which never existed:

| Removed | Why |
|---|---|
| `docker-compose.yml` | Declared `build: ./backend` and `context: ./admin-dashboard`. Neither directory existed, so `docker compose up` failed before starting anything. It also pulled PostGIS, MinIO and Ollama images for services with no code to run. |
| `.env.example` | Configured `DATABASE_URL`, `SECRET_KEY`, `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD` for a backend that was not present. A secret template for a non-existent service is a trap: it implies credentials that nothing consumes. |
| `.github/workflows/static.yml` (replaced) | Published `path: '.'` — the repository root, which held only Markdown. That is why the live site served nothing despite green runs. |

Everything else that was there is still there: `README.md` (rewritten to match reality), `LICENSE`,
`.gitignore`. Nothing the project could run was taken away, because nothing could run.

The platform design is not abandoned — it is documented above as the work still to do, and the
delivered front end is written against the contract that backend would have to satisfy. But an
honest repository containing one working slice is worth more than three empty directories that make
`docker compose up` fail.

## Accounts and authentication: absent by design, not by accident

There is no account, login, session, password reset or MFA anywhere in this app. That is a deliberate
consequence of the hosting constraint, not an oversight.

**A static site cannot hold authentication.** GitHub Pages serves files. There is no server to verify
a password, no secret store, no session, no rate limiter, no password reset channel, and no place to
keep a signing key. Anything resembling "login" built purely in the browser would be theatre: the
credential check would sit in a file every visitor can read. Shipping that would be worse than
shipping nothing, because it would look like security while providing none.

**So the app uses device-local identity instead.** There is no registration step, no password to
lose, and no personal identifier to leak:

- Nothing about a user leaves the device. Reports, drafts, saved facilities and the conversation live
  in `localStorage` and IndexedDB.
- A report is submitted without an identity at all. It is identified by a tracking code
  (`SSD-XXXXXX`) that the citizen keeps; the queue is idempotent, so retries never duplicate it.
- Nothing prevents someone from submitting a report — the barrier to civic participation is
  deliberately zero.
- The trust relationship is explicit: a consent checkbox before submission, a plain-language notice
  that data is stored on the device, one-tap JSON export, and one-tap erase (`resetAll()`).

**What real accounts would require**, and the decisions they force that should not be made by a
developer alone:

1. **Who is the identity provider?** A ministry, an NGO consortium, or the platform itself — each
   implies different liability and different data-protection obligations.
2. **What is the identifier?** A mobile number is the practical answer in South Sudan but requires an
   SMS gateway, costs money per verification, and fails for users sharing a handset. A national ID
   number requires an integration with the civil registry that may not exist. Email excludes most of
   the target population.
3. **What must be recoverable?** Losing a password must not mean losing a report about a broken water
   point. Recovery without email or SMS is the hard part.
4. **Offline sessions.** A citizen may be offline for days. Session tokens have to tolerate that
   without silently locking people out.
5. **Minimisation.** Reports about facilities rarely need an identity at all. A defensible design is
   anonymous reports with optional, verified accounts only for staff — the moderators who need them.

Until those are settled, adding a login screen would not move the project forward. The report
lifecycle, idempotency keys and consent flow already exist, so the contract a future API must honour
is written down in `store.js` and `docs/ARCHITECTURE.md`.

## Suggested order of work

1. **Content and governance first.** A verified dataset is the product; the app is the wrapper.
   Establish who can approve a facility record, how often it is re-verified, and how corrections
   are filed. Nothing else is worth building before this exists.
2. **Reporting backend.** Authenticated, idempotent report submission with server-side photo storage
   and a moderation queue. The client already models this: reports carry an `idempotencyKey` and a
   lifecycle, so the API contract can mirror `store.js`.
3. **Ingest the directory.** Move `content.js` records behind an API with the same fields, keeping
   the verification flags and dates the UI already displays.
4. **Assistant, for real.** Move retrieval server-side once the corpus grows past what a browser can
   hold. Keep the two properties that make this assistant trustworthy: it refuses below a
   confidence threshold, and every answer carries a citation to an approved document. Any change
   that relaxes either one needs an explicit product decision.
5. **Localisation review.** Commission translation review for Arabic, then add Juba Arabic. The
   dictionary is flat key/value on purpose: adding a language means adding one object of 223 keys,
   and a test enforces parity.
6. **Accessibility and field testing.** Test on low-end Android devices on intermittent 3G, which is
   the actual target environment. Measure time-to-first-useful-screen and offline reliability, not
   Lighthouse scores alone.

## Ground rules for whoever continues this

- **Never remove the demo labelling** while the data is synthetic. It appears in the footer, the
  settings screen, service cards and the assistant, and it is checked by tests.
- **Never let the assistant guess.** A refusal is a correct answer. If a question cannot be grounded
  in an approved document, the assistant says so.
- **Keep the app working from a subpath.** Every URL stays relative; `npm run check` fails the build
  otherwise.
- **Keep the build honest.** If a feature is not implemented, it is not in the README.
