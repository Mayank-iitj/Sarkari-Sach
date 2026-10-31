from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Source, Document
from app.schemas import SourcesResponse, SourceItem
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

