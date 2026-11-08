"""Build the SSDDH project report PDF.

Two passes. The first records where each section lands; the second writes the
contents page with those real page numbers.

Three ReportLab traps are fixed here and should not be reintroduced:

1. ``afterFlowable`` must be a method on the ``DocTemplate`` subclass, at class
   scope. Nested inside ``__init__`` it is never called.
2. Never assign ``doc.toc`` and then rebuild — the rebuild re-fires
   ``afterFlowable`` and overwrites the list mid-build. The collected entries
   are passed into ``front_matter()`` as plain data instead.
3. ``section_head`` emits TOC ``level`` 0. Filtering on 1 silently drops every
   row and leaves a zero-row table.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.doctemplate import PageTemplate as _PT

from reportlab.platypus import KeepTogether

from .base import (
    ASSET_DIR,
    CONTENT_W,
    GOLD,
    GREEN,
    GREEN_DARK,
    GREEN_DEEP,
    INK,
    INK_SOFT,
    MARGIN_B,
    MARGIN_L,
    MARGIN_R,
    MARGIN_T,
    MUTED,
    PAGE_H,
    PAGE_W,
    RULE,
    WASH,
    WHITE,
    Callout,
    P,
    StatRow,
    body_page,
    cover_page,
    last_page,
    logo_mark,
    register_fonts,
    rule,
    styles,
    table,
)
from . import content as C
from . import data as D

S = styles()


class Report(BaseDocTemplate):
    def __init__(self, filename, **kw):
        BaseDocTemplate.__init__(self, filename, **kw)
        self.toc = []
        self.subtitles = {}
        cover = PageTemplate(
            id="cover",
            frames=[Frame(MARGIN_L, 0, CONTENT_W, PAGE_H,
                           leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="cf")],
            onPage=cover_page,
        )
        body = PageTemplate(
            id="body",
            frames=[
                Frame(
                    MARGIN_L,
                    MARGIN_B,
                    CONTENT_W,
                    PAGE_H - MARGIN_T - MARGIN_B,
                    id="bf",
                    leftPadding=0,
                    rightPadding=0,
                    topPadding=0,
                    bottomPadding=0,
                )
            ],
            onPage=body_page,
        )
        last = PageTemplate(
            id="last",
            frames=[
                Frame(
                    MARGIN_L,
                    MARGIN_B,
                    CONTENT_W,
                    PAGE_H - MARGIN_T - MARGIN_B,
                    id="lf",
                    leftPadding=0,
                    rightPadding=0,
                    topPadding=0,
                    bottomPadding=0,
                )
            ],
            onPage=last_page,
        )
        self.addPageTemplates([cover, body, last])

    def afterFlowable(self, flowable):
        toc = getattr(flowable, "_toc", None)
        if toc is None:
            return
        level, text, key = toc
        self.toc.append((level, text, self.page, key))


SUBTITLES = {
    "summary": "Purpose, deliverables and an honest account of scope",
    "problem": "Three constraints that shaped every decision",
    "product": "The five screens and the record behind each one",
    "catalogue": "Composition, coverage and verification",
    "directory": "Search, filters and the detail view",
    "reporting": "Lifecycle, fields and on-device storage",
    "assistant": "BM25 retrieval, the refusal gate, worked examples",
    "arabic": "223 keys, RTL layout and cross-language lookup",
    "offline": "Service worker, cache strategy and installation",
    "architecture": "Eight modules, no framework, full file map",
    "build": "69 tests across four suites, and what they prove",
    "deploy": "GitHub Pages, and the constraints it imposes",
    "data": "What is stored, where it goes, and the honesty rules",
    "limits": "Seven gaps, and the full answer on why there is no login",
    "roadmap": "Five stages, in dependency order",
    "licence": "MIT, copyright, typefaces and reuse",
}


def cover() -> list:
    """The cover background is drawn by ``cover_page``; this is its text layer."""
    from reportlab.lib.styles import ParagraphStyle

    def txt(text, size, leading, font="Body", color=WHITE, space=0):
        return Paragraph(
            text,
            ParagraphStyle(
                "cv", parent=S["body"], fontName=font, fontSize=size,
                leading=leading, textColor=color, spaceAfter=space,
            ),
        )

    out = []
    out.append(Spacer(1, 38 * mm))
    out.append(logo_mark(19 * mm))
    out.append(Spacer(1, 12 * mm))
    out.append(txt("SOUTH SUDAN DIGITAL DEVELOPMENT HUB", 8.2, 10, "Body-Bold", GOLD, 5))
    out.append(txt("Project Report", 38, 42, "Display", WHITE, 3))
    out.append(txt("What is built, how it works, and its licence", 14.5, 20, "Display", WHITE, 0))
    out.append(Spacer(1, 6 * mm))
    out.append(
        Table(
            [[""]],
            colWidths=[36 * mm],
            rowHeights=[0.1],
            style=TableStyle([
                ("LINEABOVE", (0, 0), (-1, -1), 1.8, GOLD),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]),
            hAlign="LEFT",
        )
    )
    out.append(Spacer(1, 22 * mm))

    meta = [
        ("Document", "Full project report"),
        ("Version", f"{D.VERSION} \u00b7 demonstration build"),
        ("Prepared", "8 November 2026"),
        ("Author", "Mabruk Kei Ring"),
        ("Licence", "MIT License"),
        ("Live build", "lastkingmk24.github.io/South-Sudan-Digital-Development-Hub-SSDDH-"),
    ]
    rows = [
        [
            txt(k.upper(), 6.7, 9, "Body-Bold", GOLD),
            txt(v, 9.1, 13, "Body", WHITE),
        ]
        for k, v in meta
    ]
    out.append(
        Table(
            rows,
            colWidths=[27 * mm, CONTENT_W - 27 * mm],
            style=TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3.0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#1d6349")),
            ]),
            hAlign="LEFT",
        )
    )
    out.append(Spacer(1, 9 * mm))
    out.append(
        txt(
            "All services, documents and figures in this build are synthetic demonstration "
            "data. The site is not an official government service.",
            8.3, 12.5, "Body", colors.HexColor("#a8c6b8"),
        )
    )
    out.append(NextPageTemplate("body"))
    out.append(PageBreak())
    return out


def _th(labels):
    return [Paragraph(l, S["th"]) for l in labels]


def front_matter(expected, subtitles) -> list:
    out = []
    out.append(Paragraph("CONTENTS", S["kicker"]))
    out.append(Paragraph("Contents", S["title"]))
    out.append(Spacer(1, 2.2 * mm))
    out.append(rule(width=CONTENT_W, color=GOLD, thickness=1.4, space_before=0, space_after=7))
    out.append(
        P(
            "Sixteen sections. The first half describes the product a user meets; the second half "
            "describes how it is built, deployed and licensed.",
            "lede_small",
        )
    )
    out.append(Spacer(1, 3 * mm))

    rows = [_th(["", "Section", "Page"])]
    for level, text, page, key in expected:
        kicker, _, title = text.partition(" · ")
        cell = f"<font name='Body-Bold' size='9.4'>{title}</font>"
        sub = subtitles.get(key)
        if sub:
            cell += f"<br/><font name='Body' size='7.6' color='#6b7d74'>{sub}</font>"
        rows.append(
            [
                Paragraph(f"<font name='Body-Bold' color='#137a50'>{kicker}</font>", S["td_m"]),
                Paragraph(cell, S["td"]),
                Paragraph(f"<font name='Body-Bold'>{page}</font>", S["td_m"]),
            ]
        )
    t = Table(rows, colWidths=[10 * mm, CONTENT_W - 26 * mm, 16 * mm], hAlign="LEFT")
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
    ]
    t.setStyle(TableStyle(cmds))
    out.append(t)
    out.append(Spacer(1, 6 * mm))
    out.append(
        Callout(
            [
                Paragraph(
                    "<b>Reading note.</b> Numbers in this document were measured against the "
                    "repository at version "
                    f"{D.VERSION}, not estimated. Where a figure comes from running the code — the "
                    "test counts, the assistant's answers, the payload size — the method is named "
                    "in the text so it can be reproduced.",
                    S["callout"],
                )
            ]
        )
    )
    out.append(PageBreak())
    return out


def fuse_headings(story) -> list:
    """Bind a keep-with-next heading to the table block that follows it.

    ``keepWithNext`` on a Paragraph does not chain through a ``KeepTogether``,
    so a subheading can end up alone at the foot of a page with its table on
    the next one. Fusing them fixes that at the source, once, for every table.
    """
    out = []
    i = 0
    while i < len(story):
        item = story[i]
        nxt = story[i + 1] if i + 1 < len(story) else None
        style = getattr(item, "style", None)
        keeper = getattr(style, "keepWithNext", 0) if style is not None else 0
        if keeper and isinstance(nxt, KeepTogether):
            out.append(KeepTogether([item] + list(nxt._content)))
            i += 2
            continue
        out.append(item)
        i += 1
    return out


def make_story(with_cover=True, page_break_each=False) -> list:
    story = []
    if with_cover:
        story.extend(cover())
    for kicker, title, key, fn in C.SECTIONS:
        block = fn()
        # Bind the kicker + title + rule to the first paragraph of the section,
        # so a section never opens with its heading stranded at a page foot.
        story.append(KeepTogether(block[:5]))
        story.extend(block[5:])
        if page_break_each:
            story.append(PageBreak())
    return story


def build(out_path):
    register_fonts()
    doc = Report(
        out_path,
        pagesize=(PAGE_W, PAGE_H),
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="South Sudan Digital Development Hub — Project Report",
        author="Mabruk Kei Ring",
        subject="What is built, how it works, and its licence",
        creator="SSDDH report builder",
    )
    # Pass 1 must paginate *exactly* like pass 2, so it needs a contents page in
    # the same place. The page numbers there are placeholders; front_matter()
    # lays out identically regardless of what those numbers are.
    placeholder = [(0, f"{k} · {t}", 0, key) for k, t, key, _fn in C.SECTIONS]
    story1 = []
    story1.extend(cover())
    story1.extend(front_matter(placeholder, SUBTITLES))
    for kicker, title, key, fn in C.SECTIONS:
        block = fn()
        story1.append(KeepTogether(block[:4]))
        story1.extend(block[4:])
    doc.build(fuse_headings(story1))

    collected = [e for e in doc.toc if e[0] == 0]
    if len(collected) != len(C.SECTIONS):
        raise SystemExit(f"TOC collected {len(collected)} of {len(C.SECTIONS)} sections")
    # de-duplicate: keep the first occurrence of each anchor
    seen, expected = set(), []
    for level, text, page, key in collected:
        if key in seen:
            continue
        seen.add(key)
        expected.append((level, text, page, key))

    doc2 = Report(
        out_path,
        pagesize=(PAGE_W, PAGE_H),
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="South Sudan Digital Development Hub — Project Report",
        author="Mabruk Kei Ring",
        subject="What is built, how it works, and its licence",
        creator="SSDDH report builder",
    )
    story = []
    story.extend(cover())
    story.extend(front_matter(expected, SUBTITLES))
    for kicker, title, key, fn in C.SECTIONS:
        block = fn()
        # Bind the kicker + title + rule to the first paragraph of the section,
        # so a section never opens with its heading stranded at a page foot.
        story.append(KeepTogether(block[:5]))
        story.extend(block[5:])
    doc2.build(fuse_headings(story))
    return expected


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(os.path.dirname(here), "SSDDH-Project-Report.pdf")
    toc = build(out_path)
    size = os.path.getsize(out_path)
    import pymupdf

    n = pymupdf.open(out_path).page_count
    print(f"{size / 1024:.0f} kB · {n} pages")
    for level, text, page, key in toc:
        print(f"  {page:>3}  {text}")


if __name__ == "__main__":
    main()
