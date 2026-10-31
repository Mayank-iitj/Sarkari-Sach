from __future__ import annotations
import re
from app.verdict.engine import Signal
from app.nlp.normalize import parse_date, parse_inr

URGENCY_KEYWORDS = [
    "आज ही", "तुरंत", "अंतिम मौका", "अंतिम तारीख आज", "urgent", "today only",
    "immediately", "act now", "deactivated tomorrow", "बंद हो जाएगा", "ब्लॉक हो जाएगा"
]

SUSPECT_CONTACT_PATTERNS = [
    r'[\w\.-]+@gmail\.com',
    r'[\w\.-]+@yahoo\.com',
    r'[\w\.-]+@outlook\.com',
    r'\b[6-9]\d{9}\b',  # Standalone 10-digit mobile number listed as official helpline
    r'[\w\.\-]+@upi\b',
    r'[\w\.\-]+@okaxis\b',
    r'[\w\.\-]+@okhdfcbank\b',
    r'[\w\.\-]+@paytm\b'
]


def analyze_identifiers(
    claim_text: str,
    fields: dict,
    official_scheme_provisions: list[dict] | None = None
) -> list[Signal]:
    signals: list[Signal] = []
    text_lower = claim_text.lower()

    # 1. Fee contradiction (HARD)
    # If claim demands a fee for a scheme that is officially free
    fee_val = fields.get("fee")
    fee_raw = fee_val.get("value") if isinstance(fee_val, dict) else (fee_val.value if hasattr(fee_val, "value") else str(fee_val)) if fee_val else None
    if not fee_raw:
        fee_m = re.search(
            r'(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)[^.,\n]{0,25}?(?:₹|rs\.?|रु\.?)?\s*([\d,]+)|(?:₹|rs\.?|रु\.?)?\s*([\d,]+)[^.,\n]{0,25}?(?:fee|fees|(?<!निः)(?<!नि)शुल्क|फीस|चार्ज)',
            claim_text,
            re.IGNORECASE
        )
        if fee_m:
            fee_raw = f"₹{fee_m.group(1) or fee_m.group(2)}"

    if fee_raw:
        fee_raw_str = str(fee_raw)
        fee_parsed = parse_inr(fee_raw_str)
        if fee_parsed and fee_parsed.get("num", 0) > 0:
            # Check official provisions
            official_states_free = False
            if official_scheme_provisions:
                for prov in official_scheme_provisions:
                    if prov.get("field") == "fee" and prov.get("value", "").lower() in ("free", "0", "nil", "no fee", "निःशुल्क", "कोई शुल्क नहीं"):
                        official_states_free = True
                        break
            # Or common free schemes (PM Kisan, FASTag, scholarships, Ayushman, etc.)
            scheme_name = (fields.get("scheme_name") or "").lower()
            free_keywords = ["kisan", "pm-kisan", "fastag", "scholarship", "ayushman", "aadhaar", "ration", "voter", "railway", "रेलवे", "recruitment", "भर्ती", "मुद्रा", "mudra", "laptop"]
            if any(k in scheme_name or k in text_lower for k in free_keywords) or official_states_free:
                signals.append(Signal(
                    signal_id="FEE_CONTRADICTION",
                    group="IDENTIFIER",
                    severity="hard",
                    score=1.0,
                    explanation=f"Claim demands an unauthorized fee ({fee_raw}), but official guidelines for this service state it is completely free of cost."
                ))

    # 2. Implausible dates
    # Check for invalid days like 31 Feb or 31 Nov
    if re.search(r'31\s*(?:feb|february|फ़रवरी|फरवरी)', text_lower) or re.search(r'31\s*(?:nov|november|नवंबर|नवम्बर)', text_lower):
        signals.append(Signal(
            signal_id="ID_DATE_IMPLAUSIBLE",
            group="IDENTIFIER",
            severity="hard",
            score=1.0,
            explanation="Notification specifies a non-existent calendar date (e.g., 31 February or 31 November)."
        ))

    # Check future-dated issuance
    deadline_val = fields.get("deadline")
    if deadline_val:
        d_str = deadline_val.value if hasattr(deadline_val, "value") else str(deadline_val)
        parsed = parse_date(d_str)
        # Dates far in the future or unrealistic
        if parsed and parsed.startswith("2099"):
            signals.append(Signal(
                signal_id="ID_DATE_IMPLAUSIBLE",
                group="IDENTIFIER",
                severity="soft",
                score=0.8,
                explanation=f"Implausible future date: {parsed}"
            ))

    # 3. Urgency / Deadline pressure
    if any(kw in text_lower for kw in URGENCY_KEYWORDS):
        signals.append(Signal(
            signal_id="DEADLINE_PRESSURE",
            group="IDENTIFIER",
            severity="soft",
            score=0.75,
            explanation="Uncharacteristic urgent deadline pressure and threat of immediate penalty/deactivation."
        ))

    # 4. Suspect contact details
    matched_suspect = []
    for pat in SUSPECT_CONTACT_PATTERNS:
        matches = re.findall(pat, claim_text, re.IGNORECASE)
        if matches:
            matched_suspect.extend(matches)

    if matched_suspect:
        signals.append(Signal(
            signal_id="CONTACT_SUSPECT",
            group="IDENTIFIER",
            severity="soft",
            score=0.8,
            explanation=f"Notice provides unofficial personal contact / payment handles ({', '.join(matched_suspect[:2])}) instead of authorized ministry channels."
        ))

    # 5. Credential / banking details collection (HARD)
    if re.search(r'(?:submit|enter|update|verify|share)\s+(?:your\s+)?(?:bank|account|aadhaar|pan|otp|pin|card)\s+details', claim_text, re.IGNORECASE):
        signals.append(Signal(
            signal_id="CREDENTIAL_HARVESTING",
            group="IDENTIFIER",
            severity="hard",
            score=1.0,
            explanation="Notice directs users to submit sensitive banking or personal credentials on an unauthorized portal."
        ))

    return signals
