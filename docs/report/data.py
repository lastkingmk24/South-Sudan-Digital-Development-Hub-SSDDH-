"""Verified constants for the report.

Every number here was read out of the repository or produced by running the
project's own code. Sources are noted so a future editor can re-check them.
"""

# web/assets/js/content.js -> STATS, and counted directly
STATS = {
    "services": 20,
    "verified": 16,
    "states": 10,
    "documents": 10,
    "passages": 37,
    "alerts": 3,
    "translation_keys": 223,
    "categories": 6,
}

# Counted: web/assets/js/content.js SERVICES grouped by category
CATEGORIES = [
    ("health", "Health", 5),
    ("education", "Education", 5),
    ("water", "Water", 3),
    ("civil", "Civil registration", 3),
    ("agriculture", "Agriculture", 2),
    ("justice", "Justice and legal aid", 2),
]

# npm test, per file
TEST_SUITES = [
    ("tests/content.test.mjs", "Content integrity", 21),
    ("tests/shell.test.mjs", "Build and static-shell", 20),
    ("tests/store.test.mjs", "Local persistence", 16),
    ("tests/app.test.mjs", "Interface behaviour", 12),
]
TEST_TOTAL = sum(t[2] for t in TEST_SUITES)

# Measured: wc -lc over web/ scripts/ tests/ for *.js, *.mjs, *.css, *.html
CODE_LINES = 7940
CODE_BYTES = 267446
WEB_FILES = 20
WEB_BYTES = 500662
JS_LINES = 3817
CSS_LINES = 2324
TEST_LINES = 1241
PAYLOAD_KB = 13.0

# web/assets/js/rag.js defaults
BM25_K1 = 1.5
BM25_B = 0.75
SEARCH_LIMIT = 4
CONFIDENCE_FLOOR = 0.45
SCORE_FLOOR = 2.2

# web/assets/js/store.js
REPORT_FLOW = ["queued", "received", "in_review", "resolved"]

# web/assets/js/content.js -> STATES
STATES = [
    ("Central Equatoria", "الاستوائية الوسطى"),
    ("Western Equatoria", "الاستوائية الغربية"),
    ("Eastern Equatoria", "الاستوائية الشرقية"),
    ("Jonglei", "جونقلي"),
    ("Unity", "الوحدة"),
    ("Upper Nile", "أعالي النيل"),
    ("Lakes", "البحيرات"),
    ("Warrap", "واراب"),
    ("Northern Bahr el Ghazal", "شمال بحر الغزال"),
    ("Western Bahr el Ghazal", "غرب بحر الغزال"),
]

# web/assets/js/content.js -> DOCUMENTS
DOCUMENTS = [
    ("Business name registration", "Ministry of Trade and Industry", "2026-10-14", 5),
    ("National ID and birth registration", "Directorate of Civil Registry", "2026-09-30", 4),
    ("Primary health care services", "Ministry of Health", "2026-10-08", 4),
    ("School enrolment", "Ministry of General Education", "2026-09-12", 4),
    ("Community water points", "State Water Department", "2026-10-20", 3),
    ("How community reports are handled", "SSDDH service standards", "2026-10-26", 4),
    ("Land and property dispute support", "Legal Aid Office", "2026-08-18", 3),
    ("Agricultural extension support", "Ministry of Agriculture", "2026-09-05", 3),
    ("Data protection and privacy", "SSDDH privacy notice", "2026-10-30", 4),
    ("How facility records are verified", "SSDDH service standards", "2026-10-02", 3),
]

# Captured by running the assistant against web/assets/js/content.js in Node
SAMPLE_QUESTION = "What do I need to register a birth?"
SAMPLE_ANSWER = (
    "Birth registration is free when the birth is registered within twelve months. "
    "A parent or guardian should bring the child health card, the parents national ID "
    "copies, and a letter from the village or block leader confirming the birth."
)
SAMPLE_CITATIONS = [
    (
        1,
        "National ID and birth registration",
        "Registering a birth",
        "1.000",
        "Birth registration is free when the birth is registered within twelve months…",
    ),
    (
        2,
        "Business name registration",
        "Who can register",
        "0.999",
        "Any South Sudanese citizen aged 18 or older, or a registered cooperative, may apply…",
    ),
    (
        3,
        "National ID and birth registration",
        "Late registration",
        "0.895",
        "Births registered after twelve months require an additional witness statement and a "
        "small late registration fee…",
    ),
]
REFUSAL_QUESTION = "What is the capital of France?"
REFUSAL_REASON = "no_confident_passage"

# web/assets/js/i18n.js
I18N_EN = 223
I18N_AR = 223

# web/ file inventory
WEB_INVENTORY = [
    ("index.html", "Application shell; the single page the whole product runs in."),
    ("404.html", "Identical shell with a not-found message, for GitHub Pages deep links."),
    ("manifest.webmanifest", "Installable-app metadata: name, icons, theme colour, start URL."),
    ("sw.js", "Service worker; precaches the shell and serves it offline."),
    ("assets/css/app.css", "All styling — design tokens, layout, RTL rules, dark mode."),
    ("assets/js/app.js", "Bootstrap, router, view rendering, event wiring."),
    ("assets/js/content.js", "The catalogue: services, states, documents, alerts, statistics."),
    ("assets/js/rag.js", "Retrieval index, BM25 scoring, extractive answers, refusal gate."),
    ("assets/js/store.js", "localStorage and IndexedDB persistence for reports and photos."),
    ("assets/js/i18n.js", "English and Arabic strings plus the language switch."),
    ("assets/js/icons.js", "Inline SVG icon set, no network fetch."),
    ("assets/js/util.js", "Date, text, distance and formatting helpers."),
]

REPO_URL = "https://github.com/lastkingmk24/South-Sudan-Digital-Development-Hub-SSDDH-"
LIVE_URL = "https://lastkingmk24.github.io/South-Sudan-Digital-Development-Hub-SSDDH-/"
VERSION = "0.3.0"
COPYRIGHT = "Copyright (c) 2026 Mabruk Kei Ring (Founder, South Sudan Digital Development Hub)"
LICENCE = "MIT License"
