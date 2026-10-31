from __future__ import annotations
import re
import unicodedata
from datetime import date

DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

HINDI_MONTHS = {
    "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4,
    "मई": 5, "जून": 6, "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9,
    "अक्टूबर": 10, "अक्तूबर": 10, "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12
}

ENGLISH_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12
}


def devanagari_to_ascii_digits(text: str) -> str:
    """Map Devanagari numerals to ASCII digits."""
    return "".join(DEVANAGARI_DIGITS.get(ch, ch) for ch in text)


def normalize_text(text: str) -> str:
    """Normalize text using Unicode NFC, collapse whitespace, map Devanagari digits."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = devanagari_to_ascii_digits(text)
    # Normalize quotation marks
    text = re.sub(r'[""«»“”]', '"', text)
    text = re.sub(r"[''`’‘]", "'", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_inr(text: str) -> dict | None:
    """
    Parse an INR amount from string like:
    - '₹12,000/year' -> {'num': 12000, 'unit': 'INR/year'}
    - '₹6,000' -> {'num': 6000, 'unit': 'INR'}
    - 'Rs. 250 fee' -> {'num': 250, 'unit': 'INR'}
    - '2.5 lakh' -> {'num': 250000, 'unit': 'INR'}
    - '1 crore' -> {'num': 10000000, 'unit': 'INR'}
    """
    if not text:
        return None
    s = normalize_text(text).lower()

    # Determine unit
    unit = "INR"
    if "/year" in s or "प्रति वर्ष" in s or "सालाना" in s or "per year" in s or "वार्षिक" in s:
        unit = "INR/year"
    elif "/month" in s or "प्रति माह" in s or "महीना" in s or "per month" in s:
        unit = "INR/month"
    elif "one-time" in s or "एकमुश्त" in s:
        unit = "INR/one-time"

    # Match lakh / crore multipliers
    lakh_match = re.search(r'([\d\.]+)\s*(?:lakh|लाख)', s)
    if lakh_match:
        try:
            val = float(lakh_match.group(1)) * 100000
            return {"num": int(val), "unit": unit}
        except ValueError:
            pass

    crore_match = re.search(r'([\d\.]+)\s*(?:crore|करोड़)', s)
    if crore_match:
        try:
            val = float(crore_match.group(1)) * 10000000
            return {"num": int(val), "unit": unit}
        except ValueError:
            pass

    # Extract raw number with commas - supports Indian numbering (e.g. 5,00,000) and standard grouping
    num_match = re.search(r'(?:₹|rs\.?|inr|रु\.?|रुपये)\s*([0-9][0-9,]*)(?:\.\d+)?(?:\s*/-)?', s)
    if not num_match:
        # Check trailing currency marker: 6,000/- or 6000 rs
        num_match = re.search(r'([0-9][0-9,]*)\s*(?:/-|rs\.?|inr|रुपये)', s)
    if num_match:
        raw_num = num_match.group(1).replace(",", "")
        try:
            return {"num": int(raw_num), "unit": unit}
        except ValueError:
            pass

    return None


def parse_date(text: str) -> str | None:
    """
    Parse date from string to ISO-8601 (YYYY-MM-DD).
    Handles:
    - 2026-11-15
    - 15/11/2026 or 15-11-2026
    - 15 Nov 2026 / 15 November 2026
    - 15 नवंबर 2026
    """
    if not text:
        return None
    s = normalize_text(text)

    # ISO format YYYY-MM-DD
    iso_match = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', s)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        try:
            return date(y, m, d).isoformat()
        except ValueError:
            return None

    # DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', s)
    if dmy_match:
        d, m, y = int(dmy_match.group(1)), int(dmy_match.group(2)), int(dmy_match.group(3))
        try:
            return date(y, m, d).isoformat()
        except ValueError:
            return None

    # Hindi month names: e.g. "15 नवंबर 2026"
    for hi_month, m_val in HINDI_MONTHS.items():
        if hi_month in s:
            pattern = rf'(\d{{1,2}})\s+{re.escape(hi_month)}\s+(\d{{4}})'
            match = re.search(pattern, s)
            if match:
                d, y = int(match.group(1)), int(match.group(2))
                try:
                    return date(y, m_val, d).isoformat()
                except ValueError:
                    return None

    # English month names: e.g. "15 Nov 2026" or "November 15, 2026"
    for en_month, m_val in ENGLISH_MONTHS.items():
        pattern = rf'(\d{{1,2}})\s+{re.escape(en_month)}[a-z]*\s+(\d{{4}})'
        match = re.search(pattern, s, re.IGNORECASE)
        if match:
            d, y = int(match.group(1)), int(match.group(2))
            try:
                return date(y, m_val, d).isoformat()
            except ValueError:
                return None

    return None

