#!/usr/bin/env python3
"""Genera la versión PDF 16:9 del programa docente y sus materiales."""

from pathlib import Path
import html
import json
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Frame, Image, ListFlowable, ListItem, Paragraph, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "contenidos"
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "output" / "pdf" / "Programa-docente-Sebastian-Miras.pdf"
PAGE = (13.333 * inch, 7.5 * inch)
W, H = PAGE

PAPER = colors.HexColor("#eeece6")
INK = colors.HexColor("#282c29")
MUTED = colors.HexColor("#747970")
LINE = colors.HexColor("#c9ccc1")


def load_json(name):
    return json.loads((DATA / name).read_text())


PRESENTATION = load_json("presentacion.json")
BLOCKS = [load_json(name) for name in (
    "01-marco.json", "02-fundamentacion.json", "03-investigacion.json",
    "04-programa.json", "05-tema.json",
)]


def register_fonts():
    pdfmetrics.registerFont(TTFont("Newsreader", ASSETS / "fonts" / "newsreader-400.ttf"))
    pdfmetrics.registerFont(TTFont("Inter", ASSETS / "fonts" / "inter-400.ttf"))
    pdfmetrics.registerFont(TTFont("InterMedium", ASSETS / "fonts" / "inter-500.ttf"))


register_fonts()

BODY = ParagraphStyle("Body", fontName="Newsreader", fontSize=12.1, leading=16.2, textColor=INK, spaceAfter=9)
BODY_BOLD = ParagraphStyle("BodyBold", parent=BODY, fontName="InterMedium", fontSize=11.2, leading=15)
SMALL = ParagraphStyle("Small", fontName="Inter", fontSize=8.5, leading=11, textColor=MUTED)
CAPTION = ParagraphStyle("Caption", fontName="Newsreader", fontSize=11, leading=14, textColor=INK, alignment=TA_CENTER)
SOURCE = ParagraphStyle("Source", fontName="Inter", fontSize=7.5, leading=10, textColor=MUTED, alignment=TA_CENTER)


def inline_markup(text):
    text = html.escape(str(text))
    text = re.sub(r"\[([^\]]+)\]\(media:[^)]+\)", r"<u>\1</u>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


def markdown_story(text):
    story = []
    for block in re.split(r"\n\s*\n", text or ""):
        lines = block.splitlines()
        if not any(line.strip() for line in lines):
            continue
        if all(re.match(r"^\s*-\s+", line) for line in lines):
            items = [ListItem(Paragraph(inline_markup(re.sub(r"^\s*-\s+", "", line)), BODY), leftIndent=7) for line in lines]
            story.extend([ListFlowable(items, bulletType="bullet", leftIndent=18, bulletFontName="Inter", bulletFontSize=7, spaceAfter=8)])
        elif all(line.strip().startswith("|") for line in lines):
            rows = []
            for line in lines:
                if re.match(r"^\s*\|[\s:|-]+\|\s*$", line):
                    continue
                rows.append([Paragraph(inline_markup(cell.strip()), SMALL) for cell in line.strip().strip("|").split("|")])
            if rows:
                cols = max(len(row) for row in rows)
                table = Table(rows, colWidths=[590 / cols] * cols, repeatRows=1, hAlign="LEFT")
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e2d8")),
                    ("FONTNAME", (0, 0), (-1, 0), "InterMedium"),
                    ("GRID", (0, 0), (-1, -1), .35, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]))
                story.extend([table, Spacer(1, 8)])
        else:
            markup = "<br/>".join(inline_markup(line) for line in lines)
            style = BODY_BOLD if len(lines) == 1 and block.strip().startswith("**") and block.strip().endswith("**") else BODY
            story.append(Paragraph(markup, style))
    return story


def image_dimensions(path):
    reader = ImageReader(str(path))
    return reader.getSize()


def draw_contained(c, path, x, y, width, height, pad=0):
    if not path.exists():
        return
    iw, ih = image_dimensions(path)
    scale = min((width - 2 * pad) / iw, (height - 2 * pad) / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(str(path), x + (width - dw) / 2, y + (height - dh) / 2, dw, dh, mask="auto", preserveAspectRatio=True)


def draw_footer(c, left_text, page_number, qr=False):
    y = 29
    c.setStrokeColor(LINE)
    c.setLineWidth(.6)
    c.line(36, y + 18, W - 36, y + 18)
    c.setFillColor(MUTED)
    c.setFont("Inter", 6.4)
    c.drawString(36, y, left_text[:105].upper())
    logo = ASSETS / "branding" / "logo-ua-departamento-innovacion.png"
    draw_contained(c, logo, W / 2 - 70, 9, 140, 31)
    if qr:
        draw_contained(c, ASSETS / "miras-programa-ppl.png", W - 142, 7, 28, 28)
    c.drawRightString(W - 36, y, f"DIBUJOS: PEDRO COIRO  ·  {page_number:02d}")


def draw_cover(c, page_number):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    section = PRESENTATION["sections"][0]
    c.setFillColor(INK)
    c.setFont("Newsreader", 42)
    lines = section["title"].splitlines()
    c.drawString(45, H - 68, lines[0])
    c.setFillColor(colors.HexColor("#787d72"))
    c.drawString(45, H - 112, lines[1])
    c.setFillColor(MUTED)
    c.setFont("Inter", 10)
    c.drawString(47, H - 142, section["lead"])
    draw_contained(c, ROOT / section["image"], W - 300, H - 250, 225, 170)
    card_w, gap, y = 156, 16, 94
    x0 = (W - (5 * card_w + 4 * gap)) / 2
    for i, block in enumerate(BLOCKS):
        x = x0 + i * (card_w + gap)
        color = colors.HexColor(block["color"])
        c.setFillColor(color)
        c.roundRect(x, y, card_w, 155, 2, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Newsreader", 17)
        c.drawRightString(x + card_w - 12, y + 132, block["number"])
        title = Paragraph(html.escape(block["title"]), ParagraphStyle("CoverCard", fontName="Newsreader", fontSize=15, leading=16, textColor=colors.white))
        tw, th = title.wrap(card_w - 24, 95)
        title.drawOn(c, x + 12, y + 14 + max(0, 80 - th))
    draw_footer(c, "Universidad de Alicante, noviembre de 2026", page_number, qr=True)
    c.showPage()


def draw_right_art(c, block, section_index, accent):
    c.setFillColor(colors.Color(accent.red, accent.green, accent.blue, alpha=.08))
    c.setFont("Newsreader", 116)
    c.drawCentredString(808, 305, block["number"])
    illustrations = block.get("illustrations") or []
    if illustrations:
        item = illustrations[section_index % len(illustrations)]
        draw_contained(c, ROOT / item["image"], 705, 105, 205, 300)


def draw_section_header(c, block, section, section_index, continuation=False):
    accent = colors.HexColor(block["color"])
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("InterMedium", 7.2)
    c.drawString(44, H - 40, f"BLOQUE {block['number']}  /  APARTADO {section_index + 1:02d}")
    title_style = ParagraphStyle("SectionTitle", fontName="Newsreader", fontSize=25 if continuation else 32, leading=27 if continuation else 34, textColor=INK)
    title = Paragraph(html.escape(section["title"]), title_style)
    _, th = title.wrap(620, 100)
    title_y = H - 55 - th
    title.drawOn(c, 44, title_y)
    lead_style = ParagraphStyle("Lead", fontName="Newsreader", fontSize=13 if continuation else 17, leading=16 if continuation else 20, textColor=accent)
    lead = Paragraph(html.escape(section.get("lead", "")), lead_style)
    _, lh = lead.wrap(600, 60)
    lead_y = title_y - 12 - lh
    lead.drawOn(c, 54, lead_y)
    c.setStrokeColor(accent)
    c.setLineWidth(2)
    c.line(44, lead_y - 6, 44, lead_y + lh + 4)
    draw_right_art(c, block, section_index, accent)
    return lead_y - 18


def render_section(c, block, section, section_index, page_number):
    story = markdown_story(section.get("body", ""))
    continuation = False
    while story or not continuation:
        body_top = draw_section_header(c, block, section, section_index, continuation)
        frame = Frame(44, 63, 620, max(60, body_top - 68), leftPadding=0, rightPadding=8, topPadding=0, bottomPadding=0, showBoundary=0)
        frame.addFromList(story, c)
        suffix = " · CONTINUACIÓN" if continuation else ""
        draw_footer(c, f"{block['number']} · {block['title']} / {section['title']}{suffix}", page_number)
        c.showPage()
        page_number += 1
        if not story:
            break
        continuation = True
    return page_number


def media_image_path(media):
    value = media.get("image") or media.get("src")
    return ROOT / value if value else None


def draw_media_page(c, block, section, media, page_number, image=None, index=None, total=None):
    accent = colors.HexColor(block["color"])
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("InterMedium", 7.2)
    label = media.get("label", "MATERIAL COMPLEMENTARIO")
    if total:
        label += f"  ·  {index}/{total}"
    c.drawString(44, H - 39, label.upper())
    title = Paragraph(html.escape(media.get("title", section["title"])), ParagraphStyle("MediaTitle", fontName="Newsreader", fontSize=29, leading=31, textColor=INK))
    _, th = title.wrap(840, 80)
    title.drawOn(c, 44, H - 52 - th)
    c.setStrokeColor(accent)
    c.setLineWidth(2)
    c.line(44, H - 64 - th, W - 44, H - 64 - th)
    path = Path(image["src"]) if isinstance(image, dict) and "src" in image else image
    if path and not path.is_absolute():
        path = ROOT / path
    if path and path.exists():
        draw_contained(c, path, 55, 88, W - 110, H - 185, pad=8)
    elif media.get("type") == "table":
        columns = media.get("columns", [])
        rows = media.get("rows", [])
        data = [[Paragraph(inline_markup(x), SMALL) for x in columns]] + [[Paragraph(inline_markup(x), SMALL) for x in row] for row in rows]
        if data:
            table = Table(data, colWidths=[(W - 110) / len(data[0])] * len(data[0]), repeatRows=1)
            table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e2d8")), ("GRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 7)]))
            frame = Frame(55, 95, W - 110, H - 205, showBoundary=0)
            frame.addFromList([table], c)
    caption = media.get("caption", "")
    source = media.get("source", "")
    if caption:
        p = Paragraph(inline_markup(caption), CAPTION)
        _, ph = p.wrap(W - 150, 40)
        p.drawOn(c, 75, 67 - ph / 2)
    if source:
        p = Paragraph(inline_markup(source), SOURCE)
        _, ph = p.wrap(W - 160, 30)
        p.drawOn(c, 80, 49 - ph)
    draw_footer(c, f"{block['number']} · {section['title']} / {media.get('title', 'Material')}", page_number)
    c.showPage()
    return page_number + 1


def render_media(c, block, section, page_number):
    if section.get("image"):
        media = {"label": "FIGURA DEL APARTADO", "title": section["title"], "caption": section.get("caption", "")}
        page_number = draw_media_page(c, block, section, media, page_number, ROOT / section["image"])
    for media in section.get("media", []):
        if media.get("type") == "gallery":
            images = media.get("images", [])
            for index, image in enumerate(images, 1):
                page_number = draw_media_page(c, block, section, media, page_number, image, index, len(images))
        elif media.get("type") == "image":
            page_number = draw_media_page(c, block, section, media, page_number, media_image_path(media))
        elif media.get("type") == "table":
            page_number = draw_media_page(c, block, section, media, page_number)
    return page_number


def draw_qr_page(c, page_number):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("InterMedium", 7.5)
    c.drawString(44, H - 42, "PROGRAMA DOCENTE · ACCESO DIGITAL")
    c.setFillColor(INK)
    c.setFont("Newsreader", 34)
    c.drawString(44, H - 82, "Programa docente completo")
    draw_contained(c, ASSETS / "miras-programa-ppl.png", 60, 92, 330, 330, pad=10)
    c.setFillColor(INK)
    c.setFont("Newsreader", 19)
    c.drawString(455, 320, "Escanea el código para abrir el PDF")
    c.setFillColor(colors.HexColor("#737d64"))
    c.setFont("InterMedium", 14)
    c.drawString(455, 282, "https://bit.ly/miras-programa-ppl")
    c.setFillColor(MUTED)
    c.setFont("Inter", 10)
    text = Paragraph("Acceso digital al programa docente presentado para la plaza de Profesor/a Permanente Laboral DC05766.", ParagraphStyle("QrCopy", fontName="Inter", fontSize=10, leading=15, textColor=MUTED))
    text.wrapOn(c, 390, 100)
    text.drawOn(c, 455, 205)
    draw_footer(c, "Programa docente · acceso digital", page_number, qr=True)
    c.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=PAGE, pageCompression=1)
    c.setTitle("Programa docente · Sebastián Miras")
    c.setAuthor("Sebastián Miras Espantoso")
    c.setSubject("Programa docente para la plaza DC05766")
    page_number = 1
    draw_cover(c, page_number)
    page_number += 1
    for block in BLOCKS:
        for index, section in enumerate(block["sections"]):
            page_number = render_section(c, block, section, index, page_number)
            page_number = render_media(c, block, section, page_number)
    draw_qr_page(c, page_number)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
