from __future__ import annotations
import re
from app.nlp.normalize import normalize_text


def clean_for_quote_match(text: str) -> str:
    """Normalize text for substring matching (collapses whitespace, strips punctuation differences)."""
    norm = normalize_text(text).lower()
    # Replace ellipsis characters and dots
    norm = norm.replace("…", " ").replace("...", " ")
    # Replace non-alphanumeric except spaces
    norm = re.sub(r'[^\w\s]', '', norm)
    return re.sub(r'\s+', ' ', norm).strip()


def validate_quote(quote: str, chunk_text: str) -> bool:
    """
    Citation validator: every quote must be a normalized substring of the chunk text.
    If the LLM provides an ellipsis '...' between segments, test that every segment is present in order.
    """
    if not quote or not chunk_text:
        return False

    q_clean = clean_for_quote_match(quote)
    c_clean = clean_for_quote_match(chunk_text)

    if not q_clean:
        return False

    # Direct substring match
    if q_clean in c_clean:
        return True

    # Segment match (split on ellipsis / sentence fragments)
    segments = [s.strip() for s in quote.split("...") if len(s.strip()) > 6]
    if len(segments) > 1:
        last_idx = 0
        for seg in segments:
            seg_clean = clean_for_quote_match(seg)
            idx = c_clean.find(seg_clean, last_idx)
            if idx == -1:
                return False
            last_idx = idx + len(seg_clean)
        return True

    return False

