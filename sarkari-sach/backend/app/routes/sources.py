from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Source, Document
from app.schemas import SourcesResponse, SourceItem
from app.forensics.link import extract_registrable, is_official_domain, analyze_link
from app.settings import settings

router = APIRouter(prefix="/v1/sources", tags=["sources"])


@router.get("", response_model=SourcesResponse)
def list_sources(db: Session = Depends(get_db)):
    sources = db.query(Source).all()
    items = []
    for s in sources:
        doc_count = db.query(Document).filter(Document.source_id == s.id).count()
        latest_doc = db.query(Document).filter(Document.source_id == s.id).order_by(Document.fetched_at.desc()).first()
        items.append(SourceItem(
            id=s.id,
            name=s.name,
            documents=doc_count,
            last_fetched=latest_doc.fetched_at.isoformat() if latest_doc and latest_doc.fetched_at else None,
            domains=s.base_domains or []
        ))

    return SourcesResponse(
        snapshot=settings.CORPUS_SNAPSHOT or "2026-10-31a",
        sources=items
    )


@router.get("/check-domain")
def check_domain(url_or_domain: str = Query(..., min_length=2)):
    """
    Checks if a domain/URL belongs to the Government of India official registry.
    Detects squatting, lookalikes, commercial TLD impersonation, and punycode attacks.
    """
    official_set = settings.get_official_domains()
    reg, host = extract_registrable(url_or_domain)
    is_off = is_official_domain(reg, host, official_set)
    signals = analyze_link(url_or_domain, official_set=official_set)

    return {
        "input": url_or_domain,
        "registrable_domain": reg,
        "host": host,
        "is_official": is_off,
        "trust_tier": 1 if is_off else 0,
        "signals": [
            {
                "signal_id": s.signal_id,
                "severity": s.severity,
                "score": s.score,
                "explanation": s.explanation
            }
            for s in signals
        ],
        "verdict": "OFFICIAL_GOVERNMENT_DOMAIN" if is_off else ("MALICIOUS_LOOKALIKE" if any(s.severity == "hard" for s in signals) else "UNAUTHORIZED_THIRD_PARTY")
    }
