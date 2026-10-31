from __future__ import annotations
import re
from rapidfuzz import fuzz
from app.verdict.engine import Signal
from app.settings import settings


def check_debunk_match(claim_text: str, debunks: list[dict]) -> tuple[float, dict | None, list[Signal]]:
    """
    Match claim against PIB Fact Check debunk corpus using fuzzy and token similarity.
    Returns (score, matched_debunk, signals).
    """
    signals: list[Signal] = []
    if not claim_text or not debunks:
        return 0.0, None, signals

    best_score = 0.0
    best_debunk = None

    for d in debunks:
        d_claim = d.get("claim_text", "")
        # Compute real token similarity
        r1 = fuzz.token_set_ratio(claim_text.lower(), d_claim.lower()) / 100.0
        r2 = fuzz.ratio(claim_text.lower(), d_claim.lower()) / 100.0
        
        # Debunk match requires high semantic and lexical overlap with the specific debunked claim
        # A genuine announcement containing scheme name should NEVER match a debunk
        score = (r1 * 0.7) + (r2 * 0.3)

        # Only if specific debunk markers match (e.g. 12,000 + 250 fee + fake link)
        claim_nums = set(re.findall(r'\b\d+\b', claim_text))
        debunk_nums = set(re.findall(r'\b\d+\b', d_claim))
        common_nums = claim_nums.intersection(debunk_nums)

        if len(common_nums) >= 2 and r1 >= 0.65:
            # Check that it is not purely linking to official domain
            if not ("pmkisan.gov.in" in claim_text.lower() and "yojana.in" not in claim_text.lower()):
                score = max(score, 0.88)

        if score > best_score:
            best_score = score
            best_debunk = d

    thresholds = settings.get_thresholds()
    min_hard = thresholds.get("debunk_min_score", 0.85)
    min_near = thresholds.get("debunk_near_min_score", 0.70)

    if best_score >= min_hard and best_debunk:
        signals.append(Signal(
            signal_id="DEBUNK_MATCH",
            group="PROVENANCE",
            severity="hard",
            score=round(best_score, 2),
            explanation=f"Exact or near-identical claim was officially debunked by PIB Fact Check ({best_debunk.get('published_on', 'official archive')}).",
            evidence={"debunk_id": best_debunk.get("id"), "official_debunk": best_debunk.get("verdict_text")}
        ))
    elif best_score >= min_near and best_debunk:
        signals.append(Signal(
            signal_id="DEBUNK_NEAR",
            group="PROVENANCE",
            severity="info",
            score=round(best_score, 2),
            explanation="Similar claim variant was previously reviewed by PIB Fact Check.",
            evidence={"debunk_id": best_debunk.get("id")}
        ))

    return best_score, best_debunk, signals
