from __future__ import annotations
import io
from datetime import datetime
from PIL import Image, ImageDraw
from app.verdict.engine import Verdict

VERDICT_COLORS = {
    Verdict.CONFIRMED: {"bg": "#E6F4EA", "fg": "#0B7A3E", "label": "CONFIRMED · पुष्ट", "symbol": "✓"},
    Verdict.OUTDATED: {"bg": "#FFF3D6", "fg": "#8A5A00", "label": "OUTDATED · पुराना", "symbol": "↺"},
    Verdict.ALTERED: {"bg": "#FFEBD5", "fg": "#B45309", "label": "ALTERED · बदला हुआ", "symbol": "≠"},
    Verdict.UNVERIFIABLE: {"bg": "#EEF2F6", "fg": "#475569", "label": "UNVERIFIABLE · अपुष्ट", "symbol": "?"},
    Verdict.FORGED: {"bg": "#FDE7E5", "fg": "#B3261E", "label": "FORGED · नकली", "symbol": "⚠"},
}


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    hex_str = hex_str.lstrip("#")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


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
    Renders high-resolution verified card PNG.
    """
    width, height = (1080, 1080) if size == "square" else (1200, 630)
    img = Image.new("RGB", (width, height), color=hex_to_rgb("#FAFAF7"))
    draw = ImageDraw.Draw(img)

    v_meta = VERDICT_COLORS.get(verdict, VERDICT_COLORS[Verdict.UNVERIFIABLE])
    brand_navy = hex_to_rgb("#1F3A5F")
    ink_color = hex_to_rgb("#14181F")
    ink_subtle = hex_to_rgb("#4A5565")
    card_border = hex_to_rgb("#E3E6EA")

    # Outer border / card box
    margin = 40
    draw.rounded_rectangle(
        [margin, margin, width - margin, height - margin],
        radius=24,
        fill=hex_to_rgb("#FFFFFF"),
        outline=card_border,
        width=3
    )

    # Top institutional header bar
    draw.rounded_rectangle(
        [margin, margin, width - margin, margin + 90],
        radius=24,
        fill=brand_navy
    )
    # Header text
    draw.text(
        (margin + 40, margin + 28),
        "सरकारी सच (Sarkari Sach)  |  Official Fact Verification",
        fill=hex_to_rgb("#FFFFFF")
    )

    # Big Verdict Badge
    badge_top = margin + 130
    badge_height = 140
    badge_bg = hex_to_rgb(v_meta["bg"])
    badge_fg = hex_to_rgb(v_meta["fg"])

    draw.rounded_rectangle(
        [margin + 40, badge_top, width - margin - 40, badge_top + badge_height],
        radius=18,
        fill=badge_bg,
        outline=badge_fg,
        width=4
    )

    badge_text = f"[{v_meta['symbol']}]  {v_meta['label']}"
    draw.text((margin + 70, badge_top + 45), badge_text, fill=badge_fg)

    # Content Box: Claim vs Official comparison
    content_top = badge_top + badge_height + 40

    # Claim section
    draw.text((margin + 50, content_top), "दावा (Claim in message):", fill=ink_subtle)
    draw.rounded_rectangle(
        [margin + 40, content_top + 30, width - margin - 40, content_top + 140],
        radius=14,
        fill=hex_to_rgb("#F7F8F9"),
        outline=card_border,
        width=2
    )
    draw.text((margin + 60, content_top + 50), f'"{claim_summary[:160]}"', fill=ink_color)

    # Official section
    off_top = content_top + 160
    draw.text((margin + 50, off_top), "सरकारी तथ्य (Official primary source):", fill=brand_navy)
    draw.rounded_rectangle(
        [margin + 40, off_top + 30, width - margin - 40, off_top + 140],
        radius=14,
        fill=hex_to_rgb("#EFF6FF"),
        outline=hex_to_rgb("#BFDBFE"),
        width=2
    )
    draw.text((margin + 60, off_top + 50), f'"{official_summary[:160]}"', fill=brand_navy)

    # Citation info
    cite_top = off_top + 160
    draw.text((margin + 50, cite_top), "आधिकारिक प्रमाण पत्र / Citation:", fill=ink_subtle)
    draw.text((margin + 50, cite_top + 35), f"• {citation[:200]}", fill=ink_color)

    if warnings:
        w_top = cite_top + 80
        draw.text((margin + 50, w_top), f" चेतावनी: {warnings[0][:150]}", fill=hex_to_rgb("#B3261E"))

    # Footer
    footer_top = height - margin - 120
    draw.line([(margin + 40, footer_top), (width - margin - 40, footer_top)], fill=card_border, width=2)

    today_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    footer_text = f"जाँच: {today_str}  •  सार्वजनिक ऑडिट: sach.app/c/{public_id}"
    draw.text((margin + 50, footer_top + 25), footer_text, fill=ink_subtle)
    draw.text((margin + 50, footer_top + 55), "नियम शून्य: बिना सरकारी उद्धरण कोई निर्णय नहीं। जब संदेह हो, पुष्टि अस्वीकार।", fill=ink_subtle)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

