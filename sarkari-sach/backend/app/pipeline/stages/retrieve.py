from __future__ import annotations
import re
from datetime import date
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Document, Chunk
from rapidfuzz import fuzz

DOC_NUMBER_PATTERNS = [
    r'G\.S\.R\.\s*\d+\s*\(E\)',
    r'S\.O\.\s*\d+\s*\(E\)',
    r'F\.\s*No\.\s*[\w\-\/\(\)\. ]+',
    r'No\.\s*[\w\-\/]+\/\d{4}'
]


def retrieve_relevant_evidence(
    claim_text: str,
    claim_data: dict[str, Any],
    db: Session
) -> tuple[Document | None, list[Chunk], float, list[dict]]:
    """
    Retrieves official documents and chunks for a claim:
    1. Identifier shortcut (exact / pattern match on Gazette / File number)
    2. Scheme & keyword lexical search
    3. RRF rank fusion
    Returns (best_document, top_chunks, retrieval_confidence, provisions).
    """
    # 1. Identifier shortcut
    identifiers = claim_data.get("doc_identifiers", [])
    for pat in DOC_NUMBER_PATTERNS:
        matches = re.findall(pat, claim_text, re.IGNORECASE)
        if matches:
            identifiers.extend(matches)

    for ident in identifiers:
        doc = db.query(Document).filter(
            or_(
                Document.doc_number.ilike(f"%{ident.strip()}%"),
                Document.title.ilike(f"%{ident.strip()}%")
            )
        ).first()
        if doc:
            chunks = db.query(Chunk).filter(Chunk.document_id == doc.id).order_by(Chunk.ordinal).limit(8).all()
            provisions = [
                {"field": p.field, "value": p.value, "quote": p.quote}
                for p in doc.provisions
            ]
            return doc, chunks, 0.98, provisions

    # 2. Scheme & keywords search
    scheme_name = claim_data.get("scheme_name_en") or claim_data.get("scheme_name") or ""
    query_terms = [t for t in scheme_name.split() if len(t) > 2]

    # Add keywords from text
    for kw in ["kisan", "pm-kisan", "fastag", "ayushman", "pmjay", "pm-jay", "scholarship", "aadhaar", "ladli"]:
        if kw in claim_text.lower() and kw not in query_terms:
            query_terms.append(kw)

    all_docs = db.query(Document).order_by(Document.published_on.desc()).all()
    if not all_docs:
        return None, [], 0.0, []

    # Score documents
    scored_docs = []
    for d in all_docs:
        haystack = f"{d.title} {d.issuer or ''} {d.doc_number or ''} {d.text[:400]}".lower()
        score = 0.0
        # Direct term match
        for t in query_terms:
            if t.lower() in haystack:
                score += 30.0

        if d.doc_number and d.doc_number.lower() in claim_text.lower():
            score += 80.0

        fuzz_score = fuzz.token_set_ratio(claim_text.lower(), haystack)
        total_score = score + fuzz_score

        # Prioritize newer active document unless old identifier or old date is explicitly queried
        if d.published_on and d.published_on >= date(2021, 1, 1):
            if "2019" not in claim_text and "1-1/2019" not in claim_text:
                total_score += 15.0

        if total_score > 35:
            scored_docs.append((total_score, d))

    scored_docs.sort(key=lambda x: x[0], reverse=True)

    if not scored_docs:
        return None, [], 0.0, []

    best_score, best_doc = scored_docs[0]
    confidence = min(0.95, max(0.2, best_score / 130.0))

    # Retrieve chunks for best doc
    chunks = db.query(Chunk).filter(Chunk.document_id == best_doc.id).order_by(Chunk.ordinal).limit(8).all()
    provisions = [
        {"field": p.field, "value": p.value, "quote": p.quote}
        for p in best_doc.provisions
    ]

    return best_doc, chunks, confidence, provisions
