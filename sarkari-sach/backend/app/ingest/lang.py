from __future__ import annotations
import re


def detect_language(text: str) -> str:
    """
    Lightweight, fast language detector for Indian contexts.
    Checks Devanagari Unicode range, Tamil, etc., or defaults to English/Hindi.
    """
    if not text:
        return "hi"

    # Count Devanagari characters: U+0900 to U+097F
    devanagari_count = len(re.findall(r'[\u0900-\u097F]', text))
    # Tamil Unicode range: U+0B80 to U+0BFF
    tamil_count = len(re.findall(r'[\u0B80-\u0BFF]', text))
    # Bengali Unicode range: U+0980 to U+09FF
    bengali_count = len(re.findall(r'[\u0980-\u09FF]', text))

    total_len = max(len(text), 1)

    if devanagari_count > 3 or (devanagari_count / total_len > 0.05):
        return "hi"
    if tamil_count > 3 or (tamil_count / total_len > 0.05):
        return "ta"
    if bengali_count > 3 or (bengali_count / total_len > 0.05):
        return "bn"

    # Check common Hindi transliteration words (Hinglish)
    hinglish_words = ["yojana", "kisan", "sarkari", "suchna", "labh", "paise", "khate", "rupaye", "aavedan"]
    text_low = text.lower()
    if any(hw in text_low for hw in hinglish_words):
        return "hi"

    return "en"

