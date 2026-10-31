from __future__ import annotations
import io
import os
import textwrap
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from app.verdict.engine import Verdict

VERDICT_COLORS = {
    Verdict.CONFIRMED: {"bg": "#DCFCE7", "fg": "#15803D", "label": "CONFIRMED · पुष्ट", "symbol": "✓"},
    Verdict.OUTDATED: {"bg": "#FEF3C7", "fg": "#B45309", "label": "OUTDATED · पुराना", "symbol": "↺"},
    Verdict.ALTERED: {"bg": "#FFEDD5", "fg": "#C2410C", "label": "ALTERED · बदला हुआ", "symbol": "≠"},
    Verdict.UNVERIFIABLE: {"bg": "#F1F5F9", "fg": "#475569", "label": "UNVERIFIABLE · अपुष्ट", "symbol": "?"},
    Verdict.FORGED: {"bg": "#FEE2E2", "fg": "#B91C1C", "label": "FORGED · नकली / जाली", "symbol": "⚠"},
}


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    hex_str = hex_str.lstrip("#")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


def get_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Load high-quality Indian script font or Windows system font with fallback."""
    candidate_paths = [
        "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/NirmalaB.ttc" if bold else "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/segoeui.ttf" if not bold else "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arial.ttf" if not bold else "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf"
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_verified_card(
    public_id: str,
    verdict: Verdict,
    claim_summary: str,
    official_summary: str,
    citation: str,
    warnings: list[str] | None = None,
    size: str = "square"  # "square" (1080x1080) or "og" (1200x630)
) -> bytes:
    """
    Renders high-resolution verified share card PNG with typography and anti-fraud markings.
    """
    width, height = (1080, 1080) if size == "square" else (1200, 630)
    img = Image.new("RGB", (width, height), color=hex_to_rgb("#0F172A"))
    draw = ImageDraw.Draw(img)

    v_meta = VERDICT_COLORS.get(verdict, VERDICT_COLORS[Verdict.UNVERIFIABLE])
    brand_navy = hex_to_rgb("#1E293B")
    ink_color = hex_to_rgb("#0F172A")
    ink_subtle = hex_to_rgb("#475569")
    card_border = hex_to_rgb("#CBD5E1")

    # Outer canvas background
    draw.rectangle([0, 0, width, height], fill=hex_to_rgb("#F1F5F9"))

    margin = 36
    # Inner main card
    draw.rounded_rectangle(
        [margin, margin, width - margin, height - margin],
        radius=28,
        fill=hex_to_rgb("#FFFFFF"),
        outline=card_border,
        width=3
    )

    # Tricolor stripe at very top of inner card
    stripe_h = 8
    draw.rectangle([margin, margin, width - margin, margin + stripe_h], fill=hex_to_rgb("#FF9933"))
    draw.rectangle([margin, margin + stripe_h, width - margin, margin + stripe_h * 2], fill=hex_to_rgb("#FFFFFF"))
    draw.rectangle([margin, margin + stripe_h * 2, width - margin, margin + stripe_h * 3], fill=hex_to_rgb("#138808"))

    # Top institutional header bar
    header_top = margin + (stripe_h * 3)
    header_height = 84
    draw.rectangle(
        [margin, header_top, width - margin, header_top + header_height],
        fill=brand_navy
    )

    font_header = get_font(28, bold=True)
    font_sub = get_font(18, bold=False)
    draw.text(
        (margin + 36, header_top + 16),
        "SARKARI SACH · सरकारी सच",
        fill=hex_to_rgb("#FFFFFF"),
        font=font_header
    )
    draw.text(
        (margin + 36, header_top + 48),
        "Official Government Fact Verification & Provenance System",
        fill=hex_to_rgb("#94A3B8"),
        font=font_sub
    )

    # Big Verdict Badge
    badge_top = header_top + header_height + 28
    badge_height = 110
    badge_bg = hex_to_rgb(v_meta["bg"])
    badge_fg = hex_to_rgb(v_meta["fg"])

    draw.rounded_rectangle(
        [margin + 36, badge_top, width - margin - 36, badge_top + badge_height],
        radius=20,
        fill=badge_bg,
        outline=badge_fg,
        width=3
    )

    font_badge = get_font(38, bold=True)
    badge_label = f"[{v_meta['symbol']}]  VERDICT: {v_meta['label']}"
    draw.text((margin + 60, badge_top + 34), badge_label, fill=badge_fg, font=font_badge)

    # Content boxes
    content_y = badge_top + badge_height + 30
    font_section_title = get_font(20, bold=True)
    font_body = get_font(22, bold=False)

    # Box 1: Claim in circulation
    draw.text((margin + 44, content_y), "दावा (Claim in circulation):", fill=hex_to_rgb("#B91C1C"), font=font_section_title)
    content_y += 30

    claim_box_h = 130
    draw.rounded_rectangle(
        [margin + 36, content_y, width - margin - 36, content_y + claim_box_h],
        radius=16,
        fill=hex_to_rgb("#FEF2F2"),
        outline=hex_to_rgb("#FECACA"),
        width=2
    )
    claim_wrapped = textwrap.fill(f'"{claim_summary}"', width=68)
    draw.text((margin + 56, content_y + 20), claim_wrapped, fill=ink_color, font=font_body)
    content_y += claim_box_h + 24

    # Box 2: Official government truth
    draw.text((margin + 44, content_y), "सरकारी तथ्य (Official Primary Truth):", fill=hex_to_rgb("#15803D"), font=font_section_title)
    content_y += 30

    off_box_h = 140
    draw.rounded_rectangle(
        [margin + 36, content_y, width - margin - 36, content_y + off_box_h],
        radius=16,
        fill=hex_to_rgb("#F0FDF4"),
        outline=hex_to_rgb("#BBF7D0"),
        width=2
    )
    off_wrapped = textwrap.fill(f'"{official_summary}"', width=68)
    draw.text((margin + 56, content_y + 20), off_wrapped, fill=ink_color, font=font_body)
    content_y += off_box_h + 24

    # Box 3: Citation & Provenance
    draw.text((margin + 44, content_y), "आधिकारिक प्रमाण पत्र (Citation & Verified Gazette / Portal):", fill=brand_navy, font=font_section_title)
    content_y += 30

    cite_box_h = 95
    draw.rounded_rectangle(
        [margin + 36, content_y, width - margin - 36, content_y + cite_box_h],
        radius=16,
        fill=hex_to_rgb("#F8FAFC"),
        outline=card_border,
        width=2
    )
    cite_wrapped = textwrap.fill(f"• {citation}", width=72)
    draw.text((margin + 56, content_y + 20), cite_wrapped, fill=ink_subtle, font=font_body)
    content_y += cite_box_h + 20

    # Warning if present
    if warnings and len(warnings) > 0:
        font_warn = get_font(18, bold=True)
        w_text = f"⚠ सतर्कता: {warnings[0][:120]}"
        draw.text((margin + 44, content_y), w_text, fill=hex_to_rgb("#DC2626"), font=font_warn)

    # Footer
    footer_top = height - margin - 100
    draw.line([(margin + 36, footer_top), (width - margin - 36, footer_top)], fill=card_border, width=2)

    font_footer = get_font(18, bold=False)
    today_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    draw.text((margin + 44, footer_top + 16), f"जाँच समय: {today_str}  •  सार्वजनिक ऑडिट ट्रेल: sach.app/c/{public_id}", fill=ink_subtle, font=font_footer)
    draw.text((margin + 44, footer_top + 46), "Rule Zero: Zero hallucinated citations. Verified strictly against primary government records.", fill=hex_to_rgb("#64748B"), font=font_footer)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
