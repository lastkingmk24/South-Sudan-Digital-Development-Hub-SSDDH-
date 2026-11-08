# Report build

This folder generates `docs/SSDDH-Project-Report.pdf`, the full project
document: what is built, how it works, and its licence.

## Build

ReportLab is not a project dependency — the web app itself needs nothing.
The report is built in a throwaway virtual environment:

```bash
python3 -m venv /tmp/reportenv
/tmp/reportenv/bin/pip install reportlab arabic-reshaper python-bidi pymupdf

cd /path/to/repo
/tmp/reportenv/bin/python -m docs.report.build_pdf
```

The build prints the file size, the page count, and the resolved table of
contents with real page numbers. It fails loudly if a section does not
produce a TOC entry.

## Layout

| File | Purpose |
| --- | --- |
| `base.py` | Palette, A4 geometry, font registration, paragraph styles, shared flowables (`Callout`, `StatRow`, `Pipeline`, `Lifecycle`, `Rule`), page furniture. |
| `content.py` | All sixteen sections of prose. Each `sec_*()` returns a list of flowables. |
| `data.py` | Every number and quotation used in the document, with the command that produced it noted in the header. |
| `build_pdf.py` | Two-pass build, custom `DocTemplate`, contents page. |
| `fonts/` | Nine TTFs (Inter, Source Serif 4, Noto Naskh Arabic), all SIL OFL. |
| `assets/` | Cover logo if rasterised; otherwise the cover mark is drawn as vector. |

## Two-pass build

The contents page needs real page numbers, so the document is built twice.
Pass one reserves a contents page of the same height and records where each
section landed. Pass two writes the real numbers in.

## Arabic

ReportLab has no bidi engine and does no shaping. Two rules, both in
`content.py`:

* **Table cells** — pass the string through `ar()` and use the `td_r` style.
* **Inline in a sentence** — wrap with `ARW()`.

Never place Arabic next to Latin punctuation, arrows or dashes inside one
LTR sentence: bidi reorders the surrounding glyphs unpredictably. Keep
Arabic isolated in its own cell or run.

Also: the Naskh face has no subscript digits, so `k₁` renders blank. Write
`k1`.

## Font registration

`Body.bold` must map to a **Latin** face. Mapping it to Naskh makes every
`<b>` run in the document render blank, because ReportLab then tries to draw
Latin glyphs with Arabic metrics.

## Editing the text

Prose lives in `content.py`; figures live in `data.py`. If a number in the
report changes, change it in `data.py` and re-run the command named in that
file's header — do not retype a measurement from memory.
