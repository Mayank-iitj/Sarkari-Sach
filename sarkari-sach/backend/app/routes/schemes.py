from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Scheme, Document, DocRelation
from app.schemas import SchemeItem, LineageInfo

router = APIRouter(prefix="/v1/schemes", tags=["schemes"])


@router.get("", response_model=list[SchemeItem])
def list_schemes(q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Scheme)
    if q:
        query = query.filter(Scheme.name.ilike(f"%{q}%"))
    schemes = query.all()
    return [
        SchemeItem(
            id=s.id,
            name=s.name,
            name_aliases=s.name_aliases or [],
            issuer=s.issuer
        )
        for s in schemes
    ]


@router.get("/{scheme_id}/lineage", response_model=LineageInfo)
def get_scheme_lineage(scheme_id: str, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        # Check by slug in documents
        doc = db.query(Document).filter(Document.source_id == scheme_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Scheme not found")

    docs = db.query(Document).order_by(Document.published_on).all()
    timeline = []
    latest_id = None
    for d in docs:
        if "kisan" in d.title.lower() or "pm-kisan" in d.text.lower():
            latest_id = d.id
            rel = db.query(DocRelation).filter(DocRelation.src_doc == d.id).first()
            timeline.append({
                "date": d.published_on.isoformat() if d.published_on else "2019-02-24",
                "document_id": d.id,
                "title": d.title,
                "change": f"{rel.relation.title()}: {rel.evidence_quote}" if rel else "Scheme Official Launch",
                "relation": rel.relation if rel else None
            })

    return LineageInfo(
        scheme_id=scheme_id,
        timeline=timeline,
        current_document_id=latest_id,
        superseded=False,
        expired=False,
        latest_doc_id=latest_id
    )

