from __future__ import annotations
import re
from app.verdict.engine import Signal
from app.forensics.link import analyze_link


def extract_qr_and_analyze(image_bytes: bytes | None, text_fallback: str = "") -> tuple[str | None, list[Signal]]:
    """Decodes QR or checks for embedded QR links in claim text."""
    signals: list[Signal] = []
    # If text mentions QR link or URL
    found_urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text_fallback)
    if found_urls:
        url = found_urls[0]
        link_signals = analyze_link(url)
        for s in link_signals:
            if s.group == "LINK":
                signals.append(s)
        return url, signals
    return None, signals

