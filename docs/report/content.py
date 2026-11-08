"""All prose for the SSDDH project report.

Each ``SEC_*`` function returns a list of flowables. They are assembled by
``build_pdf.make_story()``, which is called once per build pass so the
flowables are always fresh.

Two Arabic rules, learned the hard way:

* Table cells: pass the raw string through ``ar()`` and apply
  ``styles()["td_r"]`` (Naskh, right-aligned).
* Inline in an English sentence: wrap with ``ARW()``. Never put Arabic next
  to Latin punctuation or arrows in one sentence — bidi reorders them.
"""

from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, Spacer

from .base import (
    CONTENT_W,
    GOLD,
    GREEN,
    GREEN_DARK,
    GREEN_DEEP,
    INK,
    MUTED,
    RULE,
    WASH,
    WASH_GOLD,
    WHITE,
    Callout,
    Lifecycle,
    Pipeline,
    P,
    StatRow,
    ar,
    bullets,
    numbered,
    rule,
    styles,
    table,
)
from . import data as D

S = styles()


def ARW(text):
    """Inline Arabic inside an English sentence."""
    return f'<font name="Arabic" size="10">{ar(text)}</font>'


def section_head(kicker, title, anchor):
    """Kicker + title block. Emits a level-0 TOC entry under ``anchor``."""
    head = Paragraph(title, S["title"])
    head._toc = (0, f"{kicker} · {title}", anchor)
    return [
        Paragraph(kicker.upper(), S["kicker"]),
        head,
        Spacer(1, 2.2 * mm),
        rule(width=CONTENT_W, color=GOLD, thickness=1.4, space_before=0, space_after=7),
    ]


def _th(labels, widths):
    return [Paragraph(l, S["th"]) for l in labels]


# ---------------------------------------------------------------- 01
def sec_summary():
    out = section_head("01", "Executive summary", "summary")
    out.append(
        P(
            "The South Sudan Digital Development Hub (SSDDH) is a small, complete, "
            "offline-first web application that helps people find public services, report "
            "problems in their community, and get direct answers from official documents — "
            "without a server, an account, or a reliable internet connection.",
            "lede",
        )
    )
    out.append(
        P(
            "It is built as a single static site: plain HTML, CSS and JavaScript modules, no "
            "framework, no bundler, no database. Everything the product needs travels with the "
            "page, so it installs like an app, opens with the network switched off, and runs "
            "entirely inside the browser. The whole payload is about "
            f"{D.PAYLOAD_KB:.1f} kB on first load."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(
        StatRow(
            [
                (str(D.STATS["services"]), "SERVICES LISTED"),
                (str(D.STATS["states"]), "STATES COVERED"),
                (str(D.STATS["documents"]), "DOCUMENTS"),
                (f"{D.TEST_TOTAL}", "AUTOMATED TESTS"),
                ("0", "BACKEND SERVICES"),
            ]
        )
    )
    out.append(Spacer(1, 3 * mm))
    out.append(P("What is built", "h3"))
    out.extend(
        bullets(
            [
                "<b>A services directory.</b> Twenty health, education, water, civil-registration, "
                "agriculture and legal-aid services across ten states, each with hours, contact "
                "details, the services offered and the date the record was last verified.",
                "<b>Community reporting.</b> A four-stage report a resident can file in under a "
                "minute — with an optional photo — that is stored on the device and tracked "
                "through a visible lifecycle.",
                "<b>A citation-gated assistant.</b> A retrieval system that answers questions by "
                "quoting approved documents and attaching the exact passage it used, or refuses "
                "outright when nothing in the corpus is good enough.",
                "<b>Bilingual interface.</b> English and Arabic, 223 translated strings in each, "
                "with a genuine right-to-left layout rather than a mirrored afterthought.",
                "<b>Offline and installable.</b> A service worker caches the shell and data, so the "
                "product works on a phone with no signal and can be added to the home screen.",
            ]
        )
    )
    out.append(P("What is deliberately not built", "h3"))
    out.append(
        P(
            "There is no backend, no database, no account system and no login. That is not an "
            "omission to be fixed later with a quick patch — it is a consequence of the hosting "
            "model, and Section 14 explains it in full. Reports and preferences live in the "
            "browser on the device that created them. A resident who clears site data loses "
            "their reports, and no operator anywhere can see them."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(
        Callout(
            [
                Paragraph(
                    "<b>All data in this build is demonstration data.</b> Every service, phone "
                    "number, document and approval date is synthetic and labelled "
                    "<b>[DEMO]</b> in the interface. Nothing here describes a real facility, and "
                    "the site is explicitly not an official government service.",
                    S["callout"],
                )
            ],
            fill=WASH_GOLD,
            bar=GOLD,
        )
    )
    out.append(Spacer(1, 3.5 * mm))
    return out


# ---------------------------------------------------------------- 02
def sec_problem():
    out = section_head("02", "The problem and the approach", "problem")
    out.append(
        P(
            "Public-service information in South Sudan is scattered and hard to act on. A "
            "citizen who needs to register a birth may be told three different things by three "
            "different offices, and there is no quick way to check which one is current. "
            "Information arrives by word of mouth, by radio, or in a printed notice that is "
            "already out of date. Meanwhile the connectivity assumptions that most civic-tech "
            "products make — an always-on connection, a capable phone, a login — do not hold."
        )
    )
    out.append(
        P(
            "Three constraints shaped every design decision in this project, and they are worth "
            "stating plainly because they explain a lot of what follows."
        )
    )
    out.append(P("Constraint 1 — the network is not there", "h3"))
    out.append(
        P(
            "Mobile data is expensive and intermittent, and electricity is unreliable. A product "
            "that needs a round-trip to show a phone number is a product that fails in the place "
            "it is meant for. So the data ships with the page and the page is cached: after the "
            "first visit, the product does not need the network at all."
        )
    )
    out.append(P("Constraint 2 — there is nothing to log in to", "h3"))
    out.append(
        P(
            "Accounts need a server to hold sessions, hashed passwords and personal records. "
            "This project is hosted on GitHub Pages, which serves static files and nothing else. "
            "A login built in the browser would be a password check written in JavaScript that "
            "anyone can read and bypass — security theatre that would make the product look "
            "official without protecting anyone. The honest answer is no accounts, and a data "
            "model that does not need them."
        )
    )
    out.append(P("Constraint 3 — trust has to be visible", "h3"))
    out.append(
        P(
            "An information product is only useful if a resident can tell how much to trust a "
            "given line. That is why every service record carries the date it was last verified "
            "and a verified flag, every assistant answer carries the passage and document it "
            "came from, and the assistant refuses rather than guessing. Trust is a feature you "
            "can see, not a claim in a footer."
        )
    )
    out.append(Spacer(1, 2 * mm))
    out.append(P("The approach in one line", "h3"))
    out.append(
        Callout(
            [
                Paragraph(
                    "Ship the entire product as static files, cache them on the device, and put "
                    "every decision that matters — search, answering, reporting, translation — "
                    "into deterministic client-side code that a reader can audit.",
                    S["callout"],
                )
            ]
        )
    )
    out.append(Spacer(1, 2 * mm))
    return out


# ---------------------------------------------------------------- 03
def sec_product():
    out = section_head("03", "What is built — the product surface", "product")
    out.append(
        P(
            "The application has five screens in a bottom navigation bar, plus a settings sheet. "
            "Every screen is rendered from the same shell, so the interface never reloads and "
            "the cached state survives navigation."
        )
    )
    rows = [
        _th(["Screen", "What it does", "Key behaviour"], [0]),
    ]
    screens = [
        (
            "Home",
            "Summary of the catalogue plus the three active alerts and quick links.",
            "Renders instantly from cached JSON; no network call.",
        ),
        (
            "Services",
            "Searchable, filterable directory of all 20 records.",
            "Full-text match on name, city and services; filter by category and state.",
        ),
        (
            "Report",
            "Form to file a community report with category, location, text and optional photo.",
            "Validates 20–1000 characters; photo downscaled to 1024 px before storing.",
        ),
        (
            "Assistant",
            "Ask a question about public services in plain English or Arabic.",
            "Answers with cited passages, or refuses with a visible reason.",
        ),
        (
            "More",
            "Settings, language, data export, privacy notice, about.",
            "Language switch flips the document to RTL live.",
        ),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td"])] for a, b, c in screens]
    out.extend(table(rows, [26 * mm, 78 * mm, CONTENT_W - 104 * mm], caption="Table 1 — The five screens and what each one guarantees."))

    out.append(P("Interaction details that carry weight", "h3"))
    out.extend(
        bullets(
            [
                "<b>Search is local and synchronous.</b> Typing filters an in-memory array; there is "
                "no debounce theatre and no request to wait for.",
                "<b>Filters compose.</b> Category and state can be applied together, and the result "
                "count updates immediately.",
                "<b>The report form remembers nothing it should not.</b> It validates before saving, "
                "downscales photos on the device, and never transmits anything.",
                "<b>Language is a first-class setting.</b> Switching to Arabic sets "
                "<font name='Body-Bold'>dir=\"rtl\"</font> on the document, mirrors the layout, and "
                "translates every visible string from the same 223-key table.",
                "<b>Everything degrades.</b> If IndexedDB is unavailable the photo attachment becomes "
                "a silent no-op rather than a crash — there is a test for exactly that.",
            ]
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(P("The service record", "h3"))
    out.append(
        P(
            "Every entry in the directory has the same shape, which is what makes the list "
            "filterable and the detail view predictable. A record holds: name in English and "
            "Arabic, category, state, city, street address, phone, opening hours, the list of "
            "services offered, the date last verified, a verified flag, a demo source marker, and "
            "coordinates for distance sorting."
        )
    )
    out.append(
        P(
            "Here is one record as it is actually stored in the repository — the first entry in "
            "<font name='Body-Bold'>web/assets/js/content.js</font>:"
        )
    )
    out.append(
        P(
            "<b>Juba Central Primary Health Care Centre</b><br/>"
            f"{ARW('مركز جوبا المركزي للرعاية الصحية الأولية')}<br/>"
            "Health · Central Equatoria · Juba<br/>"
            "Hai Malakal, Block 4, Juba<br/>"
            "+211 900 000 101 · Mon–Sat, 08:00–17:00<br/>"
            "Outpatient consultations · Maternal care · Immunisation · Malaria testing<br/>"
            "Last verified 2026-10-28 · verified",
            "code",
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 04
def sec_catalogue():
    out = section_head("04", "The service catalogue", "catalogue")
    out.append(
        P(
            f"The directory holds {D.STATS['services']} services: {D.STATS['verified']} are marked "
            f"verified and {D.STATS['services'] - D.STATS['verified']} are not, which matters more "
            "than the count. The verified flag is what the interface uses to tell a resident "
            "whether a record has been checked against a source, so the two numbers are shown "
            "separately everywhere they appear."
        )
    )
    rows = [_th(["Category", "Records", "Share"], [0])]
    for _id, label, count in D.CATEGORIES:
        pct = count / D.STATS["services"] * 100
        rows.append(
            [
                Paragraph(label, S["td_b"]),
                Paragraph(str(count), S["td"]),
                Paragraph(f"{pct:.0f}%", S["td_m"]),
            ]
        )
    rows.append(
        [
            Paragraph("<b>Total</b>", S["td_b"]),
            Paragraph(f"<b>{D.STATS['services']}</b>", S["td"]),
            Paragraph("<b>100%</b>", S["td_m"]),
        ]
    )
    out.extend(table(rows, [58 * mm, 22 * mm, 22 * mm], caption="Table 2 — Catalogue composition by category."))

    out.append(P("Coverage", "h3"))
    out.append(
        P(
            "Ten states are represented, each carrying its Arabic name alongside the English one, "
            "so the state filter works in either language. The list is the one the product ships "
            "with; it is not a claim that these are the only states in the country."
        )
    )
    rows = [_th(["State", "Arabic name"], [0])]
    for en, ar_name in D.STATES:
        rows.append([Paragraph(en, S["td"]), Paragraph(ar(ar_name), S["td_r"])])
    out.extend(table(rows, [62 * mm, CONTENT_W - 62 * mm], caption="Table 3 — The ten states in the catalogue, with their Arabic names. Arabic is shaped and right-aligned at render time."))

    out.append(P("Alerts", "h3"))
    out.append(
        P(
            "Three alert objects sit above the directory. They are ordinary records with a "
            "severity, a message in both languages, and a state scope, surfaced on the home "
            "screen so a service disruption is visible before the user searches for the service "
            "it affects."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 05
def sec_directory():
    out = section_head("05", "How the directory works", "directory")
    out.append(
        P(
            "The directory is the simplest part of the product and the one most people will use, "
            "so it was built to have no failure modes: no request, no loading state, no empty "
            "spinner. The data is a JavaScript module imported at load time, and search is an "
            "array filter."
        )
    )
    out.append(P("The data path", "h3"))
    out.extend(
        numbered(
            [
                "<font name='Body-Bold'>content.js</font> exports frozen arrays: "
                "<font name='Body-Bold'>SERVICES</font>, <font name='Body-Bold'>STATES</font>, "
                "<font name='Body-Bold'>DOCUMENTS</font>, <font name='Body-Bold'>ALERTS</font>, "
                "<font name='Body-Bold'>CATEGORIES</font> and the summary object "
                "<font name='Body-Bold'>STATS</font>.",
                "<font name='Body-Bold'>app.js</font> imports those arrays once at module scope and "
                "keeps them in memory for the life of the page.",
                "A search term and the active filters are reduced to a predicate over each record: "
                "it must match the query on name, city or offered services, and satisfy the "
                "category and state filters if they are set.",
                "The matching subset is rendered. Because the array is small, this happens on every "
                "keystroke without perceptible cost.",
            ]
        )
    )
    out.append(
        P(
            "Normalisation is deliberate rather than incidental: text is lowercased and stripped "
            "of diacritics before comparison, so a user typing without accents still finds a "
            "record. The same normaliser is shared with the assistant's tokeniser, which is why "
            "search and retrieval behave consistently."
        )
    )
    out.append(P("What the detail view shows", "h3"))
    out.append(
        P(
            "Opening a record shows the full address, a tap-to-call phone number, the hours, the "
            "service list and — prominently — the verification date. If a record is not verified, "
            "the interface says so instead of hiding the field. Distance is computed against the "
            "stored coordinates when the browser can supply a location, and the ordering changes "
            "accordingly; nothing about the location is sent anywhere."
        )
    )
    out.append(Spacer(1, 2 * mm))
    out.append(
        Callout(
            [
                Paragraph(
                    "<b>Why no server-side search?</b> Because a server-side search would require a "
                    "server. Twenty records and their text fit comfortably in memory, so shipping "
                    "the index with the page removes a network dependency and a hosting cost at "
                    "the same time.",
                    S["callout"],
                )
            ]
        )
    )
    out.append(Spacer(1, 2 * mm))
    return out


# ---------------------------------------------------------------- 06
def sec_reporting():
    out = section_head("06", "How community reporting works", "reporting")
    out.append(
        P(
            "Community reporting is the part of the product that is most clearly a demo and most "
            "clearly designed for a real one. A resident describes a problem, optionally attaches "
            "a photo, and the report is saved on their device with a reference number and a "
            "lifecycle they can follow. What happens on the other side of that lifecycle is, at "
            "present, simulated — and Section 14 says so without hedging."
        )
    )
    out.append(P("The four stages", "h3"))
    out.append(Spacer(1, 1 * mm))
    out.append(
        Lifecycle(
            [
                ("Queued", "Saved on device, awaiting transmission"),
                ("Received", "Acknowledged by the service desk"),
                ("In review", "Being checked against the facility record"),
                ("Resolved", "Outcome recorded and visible to the reporter"),
            ]
        )
    )
    out.append(
        P(
            "Figure 1 — The report lifecycle. The four stage keys are "
            "<font name='Body-Bold'>queued</font>, <font name='Body-Bold'>received</font>, "
            "<font name='Body-Bold'>in_review</font> and <font name='Body-Bold'>resolved</font>, "
            "held in <font name='Body-Bold'>store.js</font>.",
            "caption",
        )
    )
    out.append(P("What is collected, and what is not", "h3"))
    rows = [_th(["Field", "Rule", "Why"], [0])]
    fields = [
        ("Category", "One of the six catalogue categories", "Routes the report to the right team"),
        ("Location", "State and city, optional free text", "Enough to locate without a GPS trace"),
        ("Description", "20 to 1,000 characters, enforced", "Long enough to act on, short enough to read"),
        ("Photo", "Optional, downscaled to 1,024 px, JPEG q0.72", "Keeps storage small on cheap devices"),
        ("Contact", "Optional, never required", "No account, so nothing to verify or leak"),
        ("Name", "Not collected at all", "Nothing to attach the report to"),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td"])] for a, b, c in fields]
    out.extend(table(rows, [24 * mm, 70 * mm, CONTENT_W - 94 * mm], caption="Table 4 — The report form: six fields, three of them optional, one deliberately absent."))

    out.append(P("Storage", "h3"))
    out.append(
        P(
            "Reports and settings are written to "
            "<font name='Body-Bold'>localStorage</font> as JSON; photos go to IndexedDB as blobs, "
            "because localStorage cannot hold binary data at that size. Both are wrapped: if "
            "storage is unavailable — private browsing, a full disk, a browser that blocks the "
            "API — the calls degrade to no-ops and the rest of the application keeps working. "
            "A test asserts this specific behaviour rather than trusting it."
        )
    )
    out.append(
        P(
            "Because the data never leaves the device, the export function matters more than it "
            "would in a hosted product: it serialises everything the application stores into a "
            "single JSON file with a version marker and an export timestamp, so a resident can "
            "carry their reports to a new phone or hand them to someone else."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 07
def sec_assistant():
    out = section_head("07", "How the assistant works", "assistant")
    out.append(
        P(
            "The assistant is the most technically interesting part of the build, and the one "
            "most likely to be misread. It is <b>not</b> a large language model, and it does not "
            "call any external service. It is a retrieval engine with a strict refusal rule: it "
            "finds the passage in the approved documents that best matches the question, and "
            "either quotes it with a citation or declines to answer."
        )
    )
    out.append(P("The pipeline", "h3"))
    out.append(Spacer(1, 1 * mm))
    out.append(
        Pipeline(
            [
                ("Tokenise", "Lowercase, strip diacritics, split"),
                ("Retrieve", "BM25 over 37 passages"),
                ("Gate", "Confidence and coverage test"),
                ("Answer", "Extractive quote + citation"),
            ]
        )
    )
    out.append(
        P(
            "Figure 2 — The answering path. The gate between retrieval and answering is the "
            "feature, not an error path.",
            "caption",
        )
    )
    out.append(P("Step 1 — Indexing", "h3"))
    out.append(
        P(
            f"The {D.STATS['documents']} approved documents are split into {D.STATS['passages']} "
            "passages, one per section, each tagged with its document id, document title, "
            "authority, approval date and section heading. The index is built once at load time in "
            "memory: a term-frequency map per passage plus document frequencies for the whole "
            "corpus. There is no inverted index on disk and no pre-computation step."
        )
    )
    out.append(P("Step 2 — Retrieval", "h3"))
    out.append(
        P(
            "Scoring is Okapi BM25 with the standard parameters used in the code: "
            f"<font name='Body-Bold'>k1 = {D.BM25_K1}</font> and "
            f"<font name='Body-Bold'>b = {D.BM25_B}</font>. The top "
            f"{D.SEARCH_LIMIT} passages are kept. BM25 is a well-understood ranking function with "
            "no training data and no model file, which is exactly the right trade for a corpus "
            "this size: it is explainable, it is a few dozen lines, and a reader can check the "
            "arithmetic by hand."
        )
    )
    out.append(P("Step 3 — The refusal gate", "h3"))
    out.append(
        P(
            "An answer is only produced when the best passage clears all three thresholds: "
            f"relative confidence of at least {D.CONFIDENCE_FLOOR}, a raw BM25 score above "
            f"{D.SCORE_FLOOR}, and either query-term coverage of 0.45 or at least two distinct "
            "matched terms. If any of those fails, the assistant returns "
            f"<font name='Body-Bold'>{D.REFUSAL_REASON}</font> and the interface shows the refusal "
            "as a normal outcome."
        )
    )
    out.append(
        P(
            "This is the design decision that matters most in the whole project. A system that "
            "always answers will, on a corpus this small, confidently invent a service that does "
            "not exist, a fee that is not charged, or an office that is closed. A system that "
            "says &ldquo;I do not have an approved document that answers this&rdquo; is less "
            "impressive and considerably more useful."
        )
    )
    out.append(P("Step 4 — The answer itself", "h3"))
    out.append(
        P(
            "The answer is extractive: the two highest-scoring sentences from the winning passage "
            "are quoted verbatim, with the first letter capitalised. Nothing is paraphrased and "
            "nothing is generated, so every word of the answer exists in an approved document. "
            "Up to three citations are attached, each carrying the document title, the section "
            "heading, the authority, the approval date and a snippet centred on the match."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(P(f"Worked example — “{D.SAMPLE_QUESTION}”", "h3"))
    out.append(
        Callout(
            [
                Paragraph(
                    f"<b>Answer.</b> {D.SAMPLE_ANSWER}",
                    S["callout"],
                )
            ]
        )
    )
    out.append(Spacer(1, 2.5 * mm))
    rows = [_th(["#", "Document", "Section", "Conf."], [0])]
    for n, doc, sec, conf, _snip in D.SAMPLE_CITATIONS:
        rows.append(
            [
                Paragraph(str(n), S["td_m"]),
                Paragraph(doc, S["td"]),
                Paragraph(sec, S["td"]),
                Paragraph(conf, S["td_m"]),
            ]
        )
    out.extend(table(rows, [7 * mm, 62 * mm, 55 * mm, 18 * mm], caption="Table 5 — The three citations returned for the question above, as printed by the running code."))
    out.append(
        P(
            "Note the second citation: <i>Business name registration</i> is not about births, but "
            "its “Who can register” section shares vocabulary with the question, so BM25 ranks it "
            "highly. The confidence score is relative to the best match, which is why it reads "
            "0.999. This is honest retrieval behaviour rather than a bug, and it is a good "
            "argument for showing citations instead of hiding them."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(P(f"Worked example — “{D.REFUSAL_QUESTION}”", "h3"))
    out.append(
        Callout(
            [
                Paragraph(
                    "<b>Answer.</b> Refused. No approved passage clears the gate, so the interface "
                    f"returns <font name='Body-Bold'>{D.REFUSAL_REASON}</font> and offers the "
                    "closest documents rather than guessing. This is the correct behaviour for a "
                    "corpus that contains no geography reference.",
                    S["callout"],
                )
            ],
            fill=WASH_GOLD,
            bar=GOLD,
        )
    )
    out.append(Spacer(1, 2 * mm))
    return out


# ---------------------------------------------------------------- 08
def sec_arabic():
    out = section_head("08", "Arabic and bilingual design", "arabic")
    out.append(
        P(
            "Bilingual support is not a translation layer bolted onto an English interface. Arabic "
            "changes the geometry of the page: text runs right to left, navigation mirrors, icons "
            "that imply direction flip, and numbers stay left-to-right inside the right-to-left "
            "flow. The application switches the document direction on the root element and lets "
            "CSS handle the rest, using logical properties where possible."
        )
    )
    rows = [_th(["Layer", "English", "Arabic"], [0])]
    i18n_rows = [
        ("Keys per locale", "223", "223"),
        ("Parity", "identical key sets", "verified by build"),
        ("Direction", "ltr", "rtl"),
        ("Font", "Inter / Source Serif", "Noto Naskh Arabic"),
        ("Numerals", "Western", "Western, kept LTR"),
        ("Layout mirroring", "n/a", "CSS logical properties"),
    ]
    for a, b, c in i18n_rows:
        rows.append([Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td_m"])])
    out.extend(table(rows, [42 * mm, 56 * mm, CONTENT_W - 98 * mm], caption="Table 6 — The bilingual surface. Key parity is asserted by the build script, not by inspection."))

    out.append(P("Cross-language lookup", "h3"))
    out.append(
        P(
            "Arabic attaches its prepositions and conjunctions directly to the noun, so a user who "
            "searches for “to register” writes one word, not three. The tokeniser strips the "
            "definite article and the common prefixes before matching, which is why a query in "
            "Arabic can retrieve an English passage. Table 7 shows four real pairs from the "
            "catalogue."
        )
    )
    rows = [_th(["Surface form", "Stem after stripping", "Meaning"], [0])]
    prefix_rows = [
        ("لتسجيل", "تسجيل", "to register"),
        ("المستندات", "مستندات", "the documents"),
        ("بالمياه", "مياه", "with the water"),
        ("والمدرسة", "مدرسة", "and the school"),
    ]
    for surface, stem, meaning in prefix_rows:
        rows.append(
            [
                Paragraph(ar(surface), S["td_r"]),
                Paragraph(ar(stem), S["td_r"]),
                Paragraph(meaning, S["td"]),
            ]
        )
    out.extend(table(rows, [40 * mm, 40 * mm, CONTENT_W - 80 * mm], caption="Table 7 — Arabic prefixes resolved before cross-lingual lookup."))
    out.append(P("Why parity is enforced", "h3"))
    out.append(
        P(
            "A missing key in one locale is a hole in the interface that no test-free review will "
            "catch, because the English path still works. The build script parses both locales, "
            "compares the key sets, and fails the build if they differ. It also checks that every "
            "translation key referenced in the JavaScript resolves, which is how the number 223 "
            "stopped being a guess and became a fact."
        )
    )
    out.append(P("Arabic in the service data", "h3"))
    out.append(
        P(
            "Each of the twenty services carries a native Arabic name, and each state carries its "
            "Arabic name, so a user who switches language reads the same records rather than a "
            "transliteration. Table 3 shows all ten pairs as they render in the PDF you are "
            "reading — the same shaping the browser performs, done ahead of time because "
            "ReportLab has no bidi engine of its own."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 09
def sec_offline():
    out = section_head("09", "Offline and installable", "offline")
    out.append(
        P(
            "The product is a progressive web app in the strict sense: a manifest, a service "
            "worker, an offline fallback, and an install prompt where the browser supports one. "
            "It is not “mobile-friendly” — it is installable, and it works on a phone with the "
            "radio switched off."
        )
    )
    out.append(P("The cache strategy", "h3"))
    rows = [_th(["Asset", "Strategy", "Effect"], [0])]
    cache_rows = [
        ("index.html / 404.html", "Precached on install", "Shell paints with no network"),
        ("CSS and JS modules", "Precached on install", "No framework CDN, no font CDN"),
        ("Icons and logo", "Precached on install", "Home-screen icon works offline"),
        ("Service and document data", "Bundled in content.js", "Search works offline by construction"),
        ("User reports", "localStorage / IndexedDB", "Survives reload and restart"),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td"])] for a, b, c in cache_rows]
    out.extend(table(rows, [46 * mm, 42 * mm, CONTENT_W - 88 * mm], caption="Table 8 — What is cached and why. Because the data is a JavaScript module, “offline data” needed no extra mechanism."))

    out.append(
        P(
            "The consequence of bundling data as a module is worth spelling out: there is no sync "
            "queue, no stale-while-revalidate logic for content, and no possibility of an empty "
            "list caused by a failed fetch. The catalogue is present the moment the JavaScript "
            "parses, which is before the first paint."
        )
    )
    out.append(P("Install behaviour", "h3"))
    out.extend(
        bullets(
            [
                "The manifest declares a name, a short name, a start URL, a display mode of "
                "<font name='Body-Bold'>standalone</font>, a theme colour and 192 px and 512 px icons.",
                "The install prompt is offered only when the browser fires the relevant event; "
                "there is no nagging interstitial.",
                "When offline, the interface changes one status string and keeps every screen "
                "functional — it does not grey out the navigation.",
                "The service worker is versioned, so a new deployment replaces the cache on the next "
                "load rather than leaving users on an old shell indefinitely.",
            ]
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 10
def sec_architecture():
    out = section_head("10", "Architecture and file map", "architecture")
    out.append(
        P(
            "There is no framework here, and that is a considered choice rather than a limitation "
            "of skill or time. A build step was also avoided: the files in "
            "<font name='Body-Bold'>web/</font> are the files that are served. What you read in the "
            "repository is what runs in the browser."
        )
    )
    out.append(P("Layers", "h3"))
    rows = [_th(["Layer", "Module", "Responsibility"], [0])]
    layers = [
        ("Shell", "index.html · app.css", "Markup and design tokens; no logic"),
        ("Routing and views", "app.js", "Hash router, view rendering, event delegation"),
        ("Data", "content.js", "The catalogue, as frozen arrays"),
        ("Retrieval", "rag.js", "Tokeniser, BM25 index, gate, citations"),
        ("Persistence", "store.js", "Reports, settings, photos, export"),
        ("Language", "i18n.js", "223 keys in each locale, direction switch"),
        ("Presentation", "icons.js · util.js", "Inline SVG; date, text, distance helpers"),
        ("Tooling", "scripts/", "Build validation and a local static server"),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td"])] for a, b, c in layers]
    out.extend(table(rows, [32 * mm, 44 * mm, CONTENT_W - 76 * mm], caption="Table 9 — Eight modules, one dependency direction: presentation depends on data, never the reverse."))

    out.append(P("File map", "h3"))
    rows = [_th(["File", "What is in it"], [0])]
    for name, desc in D.WEB_INVENTORY:
        rows.append([Paragraph(f"<font name='Body-Bold'>{name}</font>", S["td"]), Paragraph(desc, S["td"])])
    out.extend(table(rows, [48 * mm, CONTENT_W - 48 * mm], caption=f"Table 10 — The {D.WEB_FILES} files that make up the deployed site ({D.WEB_BYTES:,} bytes in total)."))

    out.append(P("Size", "h3"))
    size_rows = [
        ("Files in web/", f"{D.WEB_FILES}"),
        ("Bytes in web/", f"{D.WEB_BYTES:,}"),
        ("JavaScript lines", f"{D.JS_LINES:,}"),
        ("CSS lines", f"{D.CSS_LINES:,}"),
        ("Test lines", f"{D.TEST_LINES:,}"),
        ("All source lines", f"{D.CODE_LINES:,}"),
        ("First-load payload", f"\u2248{D.PAYLOAD_KB} kB"),
        ("Runtime dependencies", "0"),
    ]
    rows = [_th(["Measure", "Value", "Measure", "Value"], [0])]
    for i in range(0, len(size_rows), 2):
        a, b = size_rows[i]
        c_, d_ = size_rows[i + 1]
        rows.append(
            [
                Paragraph(a, S["td_b"]),
                Paragraph(b, S["td"]),
                Paragraph(c_, S["td_b"]),
                Paragraph(d_, S["td"]),
            ]
        )
    out.extend(
        table(
            rows,
            [36 * mm, 22 * mm, 36 * mm, CONTENT_W - 94 * mm],
            caption="Table 11 \u2014 Size of the delivered product. The only dependency is a "
            "development-time test harness.",
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 11
def sec_build():
    out = section_head("11", "Build, validation and tests", "build")
    out.append(
        P(
            f"There are {D.TEST_TOTAL} automated tests across four files, and they run against the "
            "real modules in a simulated browser rather than against mocks of them. The suite is "
            "the reason several claims in this document can be stated as facts instead of hopes."
        )
    )
    out.append(Spacer(1, 1 * mm))
    out.append(
        Pipeline(
            [
                ("Lint content", "Structure and invariants"),
                ("Validate shell", "Classes, keys, payload"),
                ("Run tests", "69 assertions"),
                ("Emit site", "_site/ or Pages"),
            ]
        )
    )
    out.append(
        P(
            "Figure 3 — What <font name='Body-Bold'>npm run verify</font> does, in order. "
            "Validation and tests share the same modules the browser loads.",
            "caption",
        )
    )
    rows = [_th(["Test file", "Area", "Tests"], [0])]
    for path, area, n in D.TEST_SUITES:
        rows.append(
            [
                Paragraph(f"<font name='Body-Bold'>{path}</font>", S["td"]),
                Paragraph(area, S["td"]),
                Paragraph(str(n), S["td"]),
            ]
        )
    rows.append(
        [
            Paragraph("<b>Total</b>", S["td_b"]),
            Paragraph("", S["td"]),
            Paragraph(f"<b>{D.TEST_TOTAL}</b>", S["td"]),
        ]
    )
    out.extend(table(rows, [62 * mm, CONTENT_W - 84 * mm, 18 * mm], caption="Table 12 — The four suites and their counts, as reported by the test runner."))

    out.append(P("What the tests actually check", "h3"))
    out.extend(
        bullets(
            [
                "<b>Content integrity.</b> Every service has the required fields, every category id in "
                "use exists, every state reference resolves, no duplicate ids, and the recorded "
                "statistics match the arrays they summarise.",
                "<b>Build and shell.</b> Every CSS class used in the markup exists in the stylesheet, "
                "every translation key referenced in code resolves, English and Arabic key sets are "
                "identical, and the payload stays within budget.",
                "<b>Local persistence.</b> Reports round-trip through storage, the lifecycle advances "
                "in order, export produces valid JSON, and storage absence is a no-op rather than a "
                "throw.",
                "<b>Interface behaviour.</b> Navigation renders the right view, search filters "
                "correctly, the language switch flips direction, and the assistant both answers and "
                "refuses in the expected cases.",
            ]
        )
    )
    out.append(
        P(
            "The assistant tests are the interesting ones: one asserts the birth-registration "
            "answer and its citation, the other asserts that an off-corpus question returns a "
            "refusal. Both a positive and a negative case are pinned, so a future change that "
            "makes the assistant answer everything will fail the suite."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 12
def sec_deploy():
    out = section_head("12", "Deployment", "deploy")
    out.append(
        P(
            "The site is deployed to GitHub Pages from the repository root, with the build "
            "publishing <font name='Body-Bold'>web/</font> to the Pages root. A workflow runs the "
            "validation and test steps on every push, so a deployment that would break the shell "
            "does not reach the live URL."
        )
    )
    rows = [_th(["Item", "Value"], [0])]
    dep_rows = [
        ("Host", "GitHub Pages (static)"),
        ("Source", "Repository root, publishing web/"),
        ("Build command", "node scripts/build.mjs --out _site"),
        ("Verify command", "node scripts/build.mjs && node --test tests/*.test.mjs"),
        ("Live URL", D.LIVE_URL),
        ("Repository", D.REPO_URL),
        ("HTTPS", "Provided by Pages"),
        ("Server-side code", "None"),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"])] for a, b in dep_rows]
    out.extend(table(rows, [34 * mm, CONTENT_W - 34 * mm], caption="Table 13 — Deployment facts. The last row is the one that constrains the whole design."))

    out.append(P("Why static hosting is the right constraint", "h3"))
    out.append(
        P(
            "Pages gives free, fast, globally distributed hosting with HTTPS and no operations "
            "burden. What it does not give is a process to run, so any feature that needs one — "
            "accounts, server-side search, shared reports, an editor for the catalogue — is out of "
            "reach until the hosting model changes. Rather than pretend otherwise, the product was "
            "designed so that the features which matter most do not need a server at all."
        )
    )
    out.append(P("The honest consequence", "h3"))
    out.append(
        P(
            "A report filed on one device is invisible on another. There is no shared backlog, no "
            "administrator view and no way for an agency to read what residents submit. Every "
            "report is a note to self with a well-designed lifecycle attached. This is the single "
            "largest gap between the current build and a useful public service, and closing it "
            "requires a backend — which Section 15 sets out."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 13
def sec_data():
    out = section_head("13", "Data, privacy and honesty", "data")
    out.append(
        P(
            "Because nothing is transmitted, the privacy story is unusually simple: the application "
            "cannot leak what it never sends. That is a genuine strength of the current "
            "architecture, and it should not be oversold — it is a consequence of having no "
            "backend, not a guarantee that would survive one being added."
        )
    )
    out.append(P("What is stored, and where", "h3"))
    rows = [_th(["Data", "Where", "Leaves the device?"], [0])]
    priv_rows = [
        ("Catalogue", "content.js, cached by the service worker", "No"),
        ("Reports", "localStorage on the device", "No"),
        ("Report photos", "IndexedDB on the device", "No"),
        ("Language preference", "localStorage", "No"),
        ("Location, if granted", "Held in memory for distance sorting", "No"),
        ("Cookies", "None set", "n/a"),
        ("Analytics or trackers", "None included", "n/a"),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td_m"])] for a, b, c in priv_rows]
    out.extend(table(rows, [34 * mm, CONTENT_W - 60 * mm, 26 * mm], caption="Table 14 — The complete data inventory. There is no third row to hide."))

    out.append(P("The honesty rules the interface follows", "h3"))
    out.extend(
        numbered(
            [
                "Every synthetic record is marked <font name='Body-Bold'>[DEMO]</font>. There is no "
                "path through the interface that presents demonstration data as real.",
                "The site states that it is not an official government service, in the footer and "
                "in the about view.",
                "Unverified records say they are unverified rather than omitting the field.",
                "The assistant shows its citations and shows its refusals. It has no mode in which it "
                "answers without a source.",
                "The project documentation describes only what is in the repository. Earlier drafts "
                "of the README implied a backend and a mobile client; those were corrected because "
                "they had never existed.",
            ]
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    out.append(
        Callout(
            [
                Paragraph(
                    "<b>A note on the word “demo”.</b> It appears on twenty service records, ten "
                    "documents and every screenshot in this report. It is not modesty and it is not "
                    "a disclaimer to skip past: the difference between a demonstration and a public "
                    "information service is whether a person can act on it. Today, they cannot, and "
                    "the product says so before they try.",
                    S["callout"],
                )
            ],
            fill=WASH_GOLD,
            bar=GOLD,
        )
    )
    out.append(Spacer(1, 2 * mm))
    return out


# ---------------------------------------------------------------- 14
def sec_limits():
    out = section_head("14", "Limitations and what is not built", "limits")
    out.append(
        P(
            "This section exists because a project document that only lists achievements is a "
            "brochure, not a report. The following are real constraints of the current build, "
            "stated in the order they are likely to matter to a reader."
        )
    )
    rows = [_th(["Gap", "Consequence", "What closing it needs"], [0])]
    gaps = [
        (
            "No backend",
            "Reports cannot reach anyone; services cannot be updated without a redeploy",
            "A server, a database and an operational owner",
        ),
        (
            "No accounts or login",
            "No identity, so no per-user history and no staff access",
            "A server-side session model, which static hosting cannot provide",
        ),
        (
            "No shared report queue",
            "A report exists only on the device that filed it",
            "Server storage plus an intake process",
        ),
        (
            "Synthetic catalogue",
            "Nothing in the directory can be acted on",
            "Verified data from the responsible ministries",
        ),
        (
            "Extractive answers only",
            "The assistant cannot summarise across documents",
            "Either a larger curated corpus or a hosted model with strict grounding",
        ),
        (
            "No offline write-back",
            "A report filed offline stays offline until exported by hand",
            "A sync queue and a server to sync to",
        ),
        (
            "No audit trail",
            "Nothing records who changed what",
            "Server-side versioning of the catalogue",
        ),
    ]
    rows += [[Paragraph(a, S["td_b"]), Paragraph(b, S["td"]), Paragraph(c, S["td"])] for a, b, c in gaps]
    out.extend(table(rows, [34 * mm, 62 * mm, CONTENT_W - 96 * mm], caption="Table 15 — The seven gaps that stand between this build and a public service."))

    out.append(P("Why no login — the full answer", "h3"))
    out.append(
        P(
            "This is the question the project has been asked most often, so it deserves a direct "
            "answer rather than a design rationale. GitHub Pages serves files. It does not run "
            "code on the server, so there is nowhere to keep a session, nowhere to keep a password "
            "hash, and nowhere to check a credential that the client cannot also forge."
        )
    )
    out.append(
        P(
            "A login implemented entirely in the browser would consist of a JavaScript function "
            "comparing a typed string against a value shipped in the same bundle. Anyone could "
            "read the bundle, skip the function, or edit it. It would not protect a single byte. "
            "What it <i>would</i> do is teach users that this site has accounts, which is a false "
            "claim about a product that has none."
        )
    )
    out.append(
        P(
            "So the honest design is an application with no accounts, storing what it needs on the "
            "device, that says clearly that it is a demonstration. When a backend exists, accounts "
            "become meaningful: a server can hold the session, hash the password, and decide what a "
            "request is allowed to do. Until then, adding a login screen would be a costume, not a "
            "feature."
        )
    )
    out.append(Spacer(1, 1.5 * mm))
    return out


# ---------------------------------------------------------------- 15
def sec_roadmap():
    out = section_head("15", "Where it goes next", "roadmap")
    out.append(
        P(
            "The order below is deliberate: it follows the dependency chain, not the appeal of the "
            "features. Nothing later on the list is worth building before the thing above it "
            "exists."
        )
    )
    stages = [
        (
            "1 · Verified content",
            "Replace the synthetic catalogue with data agreed with the responsible ministries, "
            "including a named owner and a review date for each record. This is the only step that "
            "makes the product useful on its own.",
        ),
        (
            "2 · A small backend",
            "An intake endpoint for reports, a store for them, and a minimal staff view. A single "
            "service and a single table would be enough to turn a note-to-self into a request "
            "someone can answer.",
        ),
        (
            "3 · Identity, done properly",
            "Once there is a server, staff accounts become meaningful: hashed credentials, "
            "server-side sessions, and role checks that a client cannot bypass. Resident accounts "
            "can stay optional or absent.",
        ),
        (
            "4 · Editorial tooling",
            "A way for a non-developer to correct a phone number without a pull request. Until "
            "this exists, every content fix is a code change.",
        ),
        (
            "5 · Better answers",
            "A larger curated corpus first; only then consider a hosted model, and only with "
            "grounding and citation requirements as strict as the ones already enforced here.",
        ),
    ]
    for title, body in stages:
        out.append(P(title, "h3"))
        out.append(P(body))
    out.append(Spacer(1, 1 * mm))
    out.append(
        Callout(
            [
                Paragraph(
                    "The current build is, in effect, stage zero: a complete, tested, honest "
                    "demonstration of the interface and the retrieval model, waiting on content and "
                    "a backend to become a service.",
                    S["callout"],
                )
            ]
        )
    )
    out.append(Spacer(1, 2 * mm))
    return out


# ---------------------------------------------------------------- 16
def sec_licence():
    out = section_head("16", "Licence, copyright and attribution", "licence")
    out.append(
        P(
            "The project is released under the MIT License. The copyright line, reproduced "
            "verbatim from the repository's <font name='Body-Bold'>LICENSE</font> file, is:"
        )
    )
    out.append(Spacer(1, 1 * mm))
    out.append(
        Callout(
            [
                Paragraph(f"<b>{D.COPYRIGHT}</b>", S["callout"]),
                Spacer(1, 2 * mm),
                Paragraph(
                    "Permission is hereby granted, free of charge, to any person obtaining a copy "
                    "of this software and associated documentation files (the “Software”), to deal "
                    "in the Software without restriction, including without limitation the rights "
                    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell "
                    "copies of the Software, and to permit persons to whom the Software is "
                    "furnished to do so, subject to the following conditions:",
                    S["fine"],
                ),
                Paragraph(
                    "The above copyright notice and this permission notice shall be included in all "
                    "copies or substantial portions of the Software.",
                    S["fine"],
                ),
                Paragraph(
                    "THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR "
                    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, "
                    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE "
                    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER "
                    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, "
                    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE "
                    "SOFTWARE.",
                    S["fine"],
                ),
            ],
            fill=WASH,
            bar=GREEN,
        )
    )
    out.append(Spacer(1, 2.5 * mm))
    out.append(
        P(
            "MIT is a permissive licence: anyone may use, modify and redistribute the code, "
            "including commercially, provided the copyright and permission notices travel with it. "
            "There is no warranty. MIT does not grant rights over the <i>data</i> in the "
            "demonstration catalogue, which is synthetic and carries no independent value."
        )
    )
    out.append(P("Attribution of the typefaces", "h3"))
    out.append(
        P(
            "The report embeds three typefaces, all under the SIL Open Font License: "
            "<b>Inter</b> by Rasmus Andersson, <b>Source Serif 4</b> by Frank Grießhammer for "
            "Adobe, and <b>Noto Naskh Arabic</b> by Google. The web application loads no web fonts "
            "at all — it uses the system stack, which helps keep its first-load payload near 13 kB."
        )
    )
    out.append(P("How to reuse this work", "h3"))
    out.append(
        P(
            f"The repository is at <font name='Body-Bold'>{D.REPO_URL}</font>. Clone it, run "
            "<font name='Body-Bold'>npm install</font> for the test harness and "
            "<font name='Body-Bold'>npm run verify</font> to reproduce the results in this "
            f"document. The live build is at <font name='Body-Bold'>{D.LIVE_URL}</font>."
        )
    )
    # Closing colophon: tight enough to stay on the same page as the licence.
    out.append(rule(width=CONTENT_W, color=RULE, thickness=0.5, space_before=8, space_after=3))
    out.append(
        Paragraph(
            "South Sudan Digital Development Hub · Version "
            f"{D.VERSION} · Prepared 8 November 2026 · MIT License",
            ParagraphStyle("colophon", parent=S["caption"], spaceBefore=0, spaceAfter=0, fontSize=7.4, leading=9),
        )
    )
    return out


SECTIONS = [
    ("01", "Executive summary", "summary", sec_summary),
    ("02", "The problem and the approach", "problem", sec_problem),
    ("03", "What is built — the product surface", "product", sec_product),
    ("04", "The service catalogue", "catalogue", sec_catalogue),
    ("05", "How the directory works", "directory", sec_directory),
    ("06", "How community reporting works", "reporting", sec_reporting),
    ("07", "How the assistant works", "assistant", sec_assistant),
    ("08", "Arabic and bilingual design", "arabic", sec_arabic),
    ("09", "Offline and installable", "offline", sec_offline),
    ("10", "Architecture and file map", "architecture", sec_architecture),
    ("11", "Build, validation and tests", "build", sec_build),
    ("12", "Deployment", "deploy", sec_deploy),
    ("13", "Data, privacy and honesty", "data", sec_data),
    ("14", "Limitations and what is not built", "limits", sec_limits),
    ("15", "Where it goes next", "roadmap", sec_roadmap),
    ("16", "Licence, copyright and attribution", "licence", sec_licence),
]
