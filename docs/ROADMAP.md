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

## Why the backend, dashboard and mobile client were removed

Earlier drafts of this repository described a FastAPI + PostGIS backend, a Next.js admin dashboard
and a Flutter app, and shipped a `docker-compose.yml` that referenced `backend/` and
`admin-dashboard/` build contexts. None of those directories were ever committed: `docker compose up`
could not build, Pages published an empty root, and the README described a platform that did not
exist.

Rather than keep unreachable scaffolding, the repository now contains only what runs. The compose
file and `.env.example` were removed with the services they configured. The intent is not to abandon
the platform design — it is to stop advertising it before it exists, and to have one honest, working
slice instead of three empty ones.

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
