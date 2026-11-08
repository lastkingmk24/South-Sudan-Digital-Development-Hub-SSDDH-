"""Design system for the SSDDH project report.

Palette and geometry are lifted from ``web/assets/css/app.css`` so the
document and the product it describes look like the same thing.
"""

import os

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
ASSET_DIR = os.path.join(HERE, "assets")

# --- palette -------------------------------------------------------------
GREEN = colors.HexColor("#137a50")
GREEN_DARK = colors.HexColor("#0a4a30")
GREEN_DEEP = colors.HexColor("#06301f")
GOLD = colors.HexColor("#f6c445")
INK = colors.HexColor("#111c18")
INK_SOFT = colors.HexColor("#3a4a43")
MUTED = colors.HexColor("#6b7d74")
RULE = colors.HexColor("#d3ddd7")
WASH = colors.HexColor("#f2f7f4")
WASH_GOLD = colors.HexColor("#fdf6e3")
WHITE = colors.white

# --- geometry ------------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN_L = 22 * mm
MARGIN_R = 20 * mm
MARGIN_T = 20 * mm
MARGIN_B = 18 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

_FACES = {
    "Body": ("Inter-Regular.ttf", "Inter-Bold.ttf"),
    "BodyMedium": ("Inter-Medium.ttf", "Inter-Bold.ttf"),
    "Display": ("SourceSerif-Regular.ttf", "SourceSerif-SemiBold.ttf"),
    "Arabic": ("Naskh-Regular.ttf", "Naskh-Bold.ttf"),
}

_registered = False


def register_fonts():
    """Register the four families exactly once.

    ``Body`` must map ``bold`` to a *Latin* face. Mapping it to the Arabic
    face makes every ``<b>`` run in the document render blank, because
    ReportLab then tries to draw Latin glyphs with Naskh metrics.
    """
    global _registered
    if _registered:
        return
    for name, (regular, bold) in _FACES.items():
        pdfmetrics.registerFont(TTFont(name, os.path.join(FONT_DIR, regular)))
        pdfmetrics.registerFont(TTFont(name + "-Bold", os.path.join(FONT_DIR, bold)))
        registerFontFamily(
            name, normal=name, bold=name + "-Bold", italic=name, boldItalic=name + "-Bold"
        )
    pdfmetrics.registerFont(
        TTFont("Body-Italic", os.path.join(FONT_DIR, "SourceSerif-Italic.ttf"))
    )
    registerFontFamily(
        "Body",
        normal="Body",
        bold="Body-Bold",
        italic="Body-Italic",
        boldItalic="Body-Bold",
    )
    _registered = True


def ar(text):
    """Shape and re-order Arabic so ReportLab can draw it left-to-right."""
    if not text:
        return ""
    return get_display(arabic_reshaper.reshape(text))


# --- paragraph styles ----------------------------------------------------
def styles():
    register_fonts()
    ss = getSampleStyleSheet()
    keep = dict(keepWithNext=1)

    s = {}
    s["body"] = ParagraphStyle(
        "body",
        parent=ss["BodyText"],
        fontName="Body",
        fontSize=9.2,
        leading=14.6,
        textColor=INK_SOFT,
        spaceBefore=0,
        spaceAfter=6.2,
        alignment=TA_LEFT,
        allowWidows=0,
        allowOrphans=0,
    )
    s["lede"] = ParagraphStyle(
        "lede",
        parent=s["body"],
        fontName="Display",
        fontSize=13.4,
        leading=19.5,
        textColor=INK,
        spaceAfter=9,
    )
    s["lede_small"] = ParagraphStyle(
        "lede_small",
        parent=s["body"],
        fontName="Display",
        fontSize=11.2,
        leading=16.4,
        textColor=INK_SOFT,
        spaceAfter=4,
    )
    s["h2"] = ParagraphStyle(
        "h2",
        parent=s["body"],
        fontName="Display",
        fontSize=15.2,
        leading=19,
        textColor=GREEN_DEEP,
        spaceBefore=11,
        spaceAfter=4,
        **keep,
    )
    s["h3"] = ParagraphStyle(
        "h3",
        parent=s["body"],
        fontName="Body-Bold",
        fontSize=10.1,
        leading=14,
        textColor=INK,
        spaceBefore=8,
        spaceAfter=2.6,
        **keep,
    )
    s["kicker"] = ParagraphStyle(
        "kicker",
        parent=s["body"],
        fontName="Body-Bold",
        fontSize=7.2,
        leading=9,
        textColor=GREEN,
        spaceBefore=0,
        spaceAfter=2.2,
        **keep,
    )
    s["title"] = ParagraphStyle(
        "title",
        parent=s["body"],
        fontName="Display",
        fontSize=23,
        leading=26,
        textColor=GREEN_DEEP,
        spaceBefore=0,
        spaceAfter=3,
        **keep,
    )
    s["caption"] = ParagraphStyle(
        "caption",
        parent=s["body"],
        fontName="Body",
        fontSize=7.8,
        leading=11,
        textColor=MUTED,
        spaceBefore=3,
        spaceAfter=9,
    )
    # Same face, smaller: for verbatim licence text and long quotations.
    s["fine"] = ParagraphStyle(
        "fine",
        parent=s["body"],
        fontSize=7.5,
        leading=11.2,
        spaceAfter=4,
    )
    s["th"] = ParagraphStyle(
        "th",
        parent=s["body"],
        fontName="Body-Bold",
        fontSize=7.6,
        leading=10,
        textColor=WHITE,
        spaceAfter=0,
    )
    s["td"] = ParagraphStyle(
        "td",
        parent=s["body"],
        fontName="Body",
        fontSize=7.9,
        leading=11.2,
        textColor=INK_SOFT,
        spaceAfter=0,
    )
    s["td_b"] = ParagraphStyle("td_b", parent=s["td"], fontName="Body-Bold", textColor=INK)
    s["td_r"] = ParagraphStyle("td_r", parent=s["td"], fontName="Arabic", fontSize=9.4, alignment=TA_RIGHT)
    s["td_m"] = ParagraphStyle("td_m", parent=s["td"], fontName="Body", textColor=MUTED)
    s["code"] = ParagraphStyle(
        "code",
        parent=s["body"],
        fontName="Body",
        fontSize=7.9,
        leading=12,
        textColor=GREEN_DEEP,
        backColor=WASH,
        borderPadding=(5, 6, 5, 6),
        spaceBefore=3,
        spaceAfter=8,
    )
    s["callout"] = ParagraphStyle(
        "callout",
        parent=s["body"],
        fontSize=8.7,
        leading=13.4,
        spaceAfter=0,
    )
    s["tile_n"] = ParagraphStyle(
        "tile_n",
        parent=s["body"],
        fontName="Display",
        fontSize=20,
        leading=22,
        textColor=GREEN_DEEP,
        spaceAfter=0,
    )
    s["tile_l"] = ParagraphStyle(
        "tile_l",
        parent=s["body"],
        fontName="Body",
        fontSize=6.8,
        leading=9,
        textColor=MUTED,
        spaceAfter=0,
    )
    return s


# --- helpers -------------------------------------------------------------
def P(text, style="body"):
    return Paragraph(text, styles()[style])


def bullets(items, style="body", indent=11, gap=2.6):
    out = []
    st = styles()[style]
    for item in items:
        out.append(
            Paragraph(
                f'<bullet>&bull;</bullet>&nbsp;{item}',
                ParagraphStyle(
                    "bl",
                    parent=st,
                    leftIndent=indent,
                    bulletIndent=0,
                    spaceAfter=gap,
                    bulletFontName="Body",
                    bulletFontSize=7,
                    bulletColor=GREEN,
                ),
            )
        )
    return out


def numbered(items, style="body", indent=13, gap=2.6):
    out = []
    st = styles()[style]
    for i, item in enumerate(items, 1):
        out.append(
            Paragraph(
                f'<bullet>{i}.</bullet>&nbsp;{item}',
                ParagraphStyle(
                    "nm",
                    parent=st,
                    leftIndent=indent,
                    bulletIndent=0,
                    spaceAfter=gap,
                    bulletFontName="Body-Bold",
                    bulletFontSize=7.4,
                    bulletColor=GREEN,
                ),
            )
        )
    return out


class Rule(Flowable):
    """A horizontal rule with real, respected surrounding space."""

    def __init__(self, width, colour, thickness, space_before, space_after):
        Flowable.__init__(self)
        self.width = width
        self.colour = colour
        self.thickness = thickness
        self.before = space_before
        self.after = space_after

    def wrap(self, avail_w, avail_h):
        self.width = min(self.width, avail_w)
        return self.width, self.before + self.thickness + self.after

    def draw(self):
        c = self.canv
        c.setStrokeColor(self.colour)
        c.setLineWidth(self.thickness)
        c.line(0, self.after, self.width, self.after)


def rule(width=None, color=RULE, thickness=0.6, space_before=2, space_after=6):
    return Rule(width or CONTENT_W, color, thickness, space_before, space_after)


def table(rows, widths, header=True, caption=None, align=None, zebra=True, size=None):
    """Standard data table. ``rows`` are already-Paragraph cells."""
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5.5),
        ("TOPPADDING", (0, 0), (-1, -1), 4.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
            ("TOPPADDING", (0, 0), (-1, 0), 5.4),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 5.4),
        ]
    if zebra:
        start = 2 if header else 1
        for i in range(start, len(rows), 2):
            cmds.append(("BACKGROUND", (0, i), (-1, i), WASH))
    if align:
        for col, a in align.items():
            cmds.append((a, (col, 0 if not header else 1), (col, -1)))
    t.setStyle(TableStyle(cmds))
    if not caption:
        return [t]

    # Keep the caption attached to the table it describes. ReportLab will still
    # break a table that genuinely cannot fit on one page, but the caption
    # travels with it rather than being stranded at a page foot describing a
    # table that has moved on.
    return [KeepTogether([t, P(caption, "caption")])]


class CellTight:
    """Wrapper that trims a Paragraph's own padding inside callout tables."""

    pass


class Callout(Flowable):
    """A left-ruled tinted box. Draws its own rule, so no table nesting."""

    def __init__(self, paragraphs, width=CONTENT_W, fill=WASH, bar=GREEN, pad=9):
        Flowable.__init__(self)
        self.paragraphs = paragraphs if isinstance(paragraphs, list) else [paragraphs]
        self.width = width
        self.fill = fill
        self.bar = bar
        self.pad = pad

    @staticmethod
    def _gap(p):
        st = getattr(p, "style", None)
        return (getattr(st, "spaceAfter", 0) or 0) if st else 0

    def wrap(self, avail_w, avail_h):
        self.width = min(self.width, avail_w)
        inner = self.width - self.pad * 2 - 2.5
        self.h = self.pad * 2
        for p in self.paragraphs:
            w, h = p.wrap(inner, avail_h)
            p._w = inner
            self.h += h + self._gap(p)
        self.h -= self._gap(self.paragraphs[-1])
        return self.width, self.h

    def draw(self):
        c = self.canv
        c.setFillColor(self.fill)
        c.rect(0, 0, self.width, self.h, stroke=0, fill=1)
        c.setFillColor(self.bar)
        c.rect(0, 0, 2.5, self.h, stroke=0, fill=1)
        y = self.h - self.pad
        for p in self.paragraphs:
            w, h = p.wrap(self.width - self.pad * 2 - 2.5, self.h)
            y -= h
            p.drawOn(c, self.pad + 2.5, y)
            y -= self._gap(p)


class StatRow(Flowable):
    """A row of big-number tiles."""

    def __init__(self, items, width=CONTENT_W, height=16 * mm, gap=3 * mm):
        Flowable.__init__(self)
        self.items = items  # [(number, label), ...]
        self.width = width
        self.height = height
        self.gap = gap

    def wrap(self, avail_w, avail_h):
        self.width = min(self.width, avail_w)
        return self.width, self.height + 2 * mm

    def draw(self):
        c = self.canv
        n = len(self.items)
        cw = (self.width - self.gap * (n - 1)) / n
        s = styles()
        for i, (num, label) in enumerate(self.items):
            x = i * (cw + self.gap)
            c.setFillColor(WASH)
            c.rect(x, 0, cw, self.height, stroke=0, fill=1)
            c.setFillColor(GOLD)
            c.rect(x, 0, cw, 1.8, stroke=0, fill=1)
            pad = 6.0
            inner = cw - pad * 2
            pn = Paragraph(num, s["tile_n"])
            pl = Paragraph(label, s["tile_l"])
            pn.wrap(inner, self.height)
            pl.wrap(inner, self.height)
            # Anchor from the top so a label that wraps grows *downwards* and
            # can never push the number out of the tile.
            num_y = self.height - pad - pn.height
            pn.drawOn(c, x + pad, num_y)
            pl.drawOn(c, x + pad, num_y - 1.5 - pl.height)


class Pipeline(Flowable):
    """Stage chevrons for a linear request path (Figure 2)."""

    def __init__(self, stages, width=CONTENT_W, height=14 * mm):
        Flowable.__init__(self)
        self.stages = stages  # [(title, detail), ...]
        self.width = width
        self.height = height

    def wrap(self, avail_w, avail_h):
        self.width = min(self.width, avail_w)
        return self.width, self.height + 3 * mm

    def draw(self):
        c = self.canv
        n = len(self.stages)
        gap = 7.0
        cw = (self.width - gap * (n - 1)) / n
        s = styles()
        for i, (title, detail) in enumerate(self.stages):
            x = i * (cw + gap)
            shade = GREEN_DEEP if i % 2 == 0 else GREEN_DARK
            c.setFillColor(shade)
            c.roundRect(x, 6, cw, self.height - 2, 3, stroke=0, fill=1)
            pt = Paragraph(title, ParagraphStyle("pt", parent=s["td_b"], textColor=WHITE, fontSize=7.5))
            pd = Paragraph(detail, ParagraphStyle("pd", parent=s["td"], textColor=colors.HexColor("#cfe3d9"), fontSize=6.3, leading=8))
            pad = 5.0
            pt.wrap(cw - pad * 2, self.height)
            pd.wrap(cw - pad * 2, self.height)
            # Anchor the title to the top of the chevron and hang the detail
            # directly beneath it, so a two-line detail grows downward inside
            # the box instead of dropping through the bottom edge.
            top = self.height + 6 - 2 - pad          # box top, minus padding
            pt.drawOn(c, x + pad, top - pt.height)
            pd.drawOn(c, x + pad, top - pt.height - 2 - pd.height)
            if i < n - 1:
                c.setFillColor(GOLD)
                cx = x + cw + gap / 2
                cy = 6 + (self.height - 2) / 2
                c.circle(cx, cy, 1.7, stroke=0, fill=1)


class Lifecycle(Flowable):
    """Numbered milestone strip (Figure 1)."""

    def __init__(self, steps, width=CONTENT_W, height=21 * mm):
        Flowable.__init__(self)
        self.steps = steps  # [(label, caption), ...]
        self.width = width
        self.height = height

    def wrap(self, avail_w, avail_h):
        self.width = min(self.width, avail_w)
        return self.width, self.height + 4 * mm

    def draw(self):
        c = self.canv
        n = len(self.steps)
        seg = self.width / n
        y = self.height - 8
        c.setStrokeColor(RULE)
        c.setLineWidth(1)
        c.line(seg / 2, y, self.width - seg / 2, y)
        s = styles()
        for i, (label, caption) in enumerate(self.steps):
            cx = seg / 2 + i * seg
            c.setFillColor(GREEN)
            c.circle(cx, y, 6.2, stroke=0, fill=1)
            c.setFillColor(WHITE)
            c.setFont("Body-Bold", 7)
            c.drawCentredString(cx, y - 2.4, str(i + 1))
            pl = Paragraph(label, ParagraphStyle("ll", parent=s["td_b"], fontSize=7.3, alignment=TA_CENTER))
            pc = Paragraph(caption, ParagraphStyle("lc", parent=s["td_m"], fontSize=6.2, leading=8, alignment=TA_CENTER))
            pl.wrap(seg - 6, 24)
            pc.wrap(seg - 6, 24)
            pl.drawOn(c, cx - (seg - 6) / 2, y - 11 - pl.height)
            pc.drawOn(c, cx - (seg - 6) / 2, y - 12 - pl.height - pc.height)


def logo_mark(size=17 * mm):
    """Vector reproduction of web/assets/img/logo.svg for the cover."""
    from reportlab.graphics.shapes import Drawing, Polygon, Rect, Circle, Line
    from reportlab.graphics import renderPDF

    d = Drawing(size, size)
    k = size / 512.0
    d.add(Rect(0, 0, size, size, rx=112 * k, ry=112 * k, fillColor=GREEN, strokeColor=None))
    # corner nodes
    for cx, cy in ((147, 147), (365, 147), (147, 365), (365, 365)):
        d.add(Line(256 * k, 256 * k, cx * k, cy * k, strokeColor=colors.HexColor("#4f8a72"), strokeWidth=5 * k))
        d.add(Circle(cx * k, cy * k, 15 * k, fillColor=WHITE, strokeColor=None))
    star = [
        (256, 160), (278.9, 224.4), (347.3, 226.3), (293.1, 268.1),
        (312.4, 333.7), (256, 295), (199.6, 333.7), (218.9, 268.1),
        (164.7, 226.3), (233.1, 224.4),
    ]
    flat = []
    for x, y in star:
        flat.extend([x * k, y * k])
    d.add(
        Polygon(
            flat,
            fillColor=GOLD,
            strokeColor=GREEN_DARK,
            strokeWidth=6 * k,
           strokeLineJoin=1,
        )
    )
    return d


# --- page furniture ------------------------------------------------------
def cover_page(c, doc):
    """Full-bleed dark cover."""
    c.saveState()
    c.setFillColor(GREEN_DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # soft vertical band
    c.setFillColor(GREEN_DARK)
    c.rect(0, PAGE_H * 0.52, PAGE_W, PAGE_H * 0.48, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.rect(0, PAGE_H * 0.515, PAGE_W, 1.6, stroke=0, fill=1)
    c.restoreState()


def last_page(c, doc):
    """Body furniture plus the colophon, for the final page only."""
    body_page(c, doc)
    c.saveState()
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    c.line(MARGIN_L, MARGIN_B - 10.5 * mm, PAGE_W - MARGIN_R, MARGIN_B - 10.5 * mm)
    c.setFont("Body", 7.0)
    c.setFillColor(MUTED)
    c.drawString(
        MARGIN_L,
        MARGIN_B - 14.2 * mm,
        "South Sudan Digital Development Hub \u00b7 Version 0.3.0 \u00b7 Prepared 8 November 2026 \u00b7 MIT License",
    )
    c.restoreState()


def body_page(c, doc):
    """Running header and footer for every content page."""
    c.saveState()
    n = doc.page
    c.setFont("Body", 6.9)
    c.setFillColor(MUTED)
    c.drawString(MARGIN_L, PAGE_H - 12.5 * mm, "SOUTH SUDAN DIGITAL DEVELOPMENT HUB")
    c.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 12.5 * mm, "PROJECT REPORT  ·  2026")
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    c.line(MARGIN_L, PAGE_H - 14.6 * mm, PAGE_W - MARGIN_R, PAGE_H - 14.6 * mm)

    c.line(MARGIN_L, MARGIN_B - 3.5 * mm, PAGE_W - MARGIN_R, MARGIN_B - 3.5 * mm)
    c.setFont("Body", 6.9)
    c.drawString(MARGIN_L, MARGIN_B - 7.5 * mm, "Version 0.3.0  ·  MIT licensed  ·  demonstration data")
    c.setFont("Body-Bold", 8.4)
    c.setFillColor(GREEN_DEEP)
    c.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 7.6 * mm, str(n))
    c.restoreState()
