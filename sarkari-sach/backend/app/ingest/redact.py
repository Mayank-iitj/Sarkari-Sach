from __future__ import annotations
import re


def redact_pii(text: str) -> str:
    """
    Redact Aadhaar numbers, PAN numbers, credit cards, bank account numbers from logs and audit texts.
    Follows DPDP compliance principles.
    """
    if not text:
        return ""

    # Aadhaar: 12 digits (often 4 4 4)
    text = re.sub(r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b', '[REDACTED_AADHAAR]', text)
    # PAN: 5 letters, 4 digits, 1 letter
    text = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b', '[REDACTED_PAN]', text)
    # Bank Account: 9-18 consecutive digits
    text = re.sub(r'\b[0-9]{11,18}\b', '[REDACTED_ACCOUNT]', text)
    # Phone numbers
    text = re.sub(r'\b(?:\+91[- ]?)?[6-9]\d{9}\b', '[REDACTED_PHONE]', text)

    return text

