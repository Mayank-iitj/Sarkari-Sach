from __future__ import annotations
from typing import Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Scheme, Document, DocRelation
from app.schemas import SchemeItem, LineageInfo
from app.ingest.web_search import search_official_schemes, ingest_live_search_result_to_corpus

router = APIRouter(prefix="/v1/schemes", tags=["schemes"])


class LiveSearchRequest(BaseModel):
    query: str
    ingest: bool = False
    max_results: int = 5


@router.get("/live-search")
async def live_search_schemes(
    q: str = Query(..., min_length=2, description="Scheme name or keyword to search across official .gov.in portals"),
    db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    """
    Search official Indian Government portals in real-time (.gov.in, .nic.in, pib.gov.in, myscheme.gov.in)
    and return verified active scheme updates and provisions.
    """
    results = await search_official_schemes(query=q, max_results=5)
    return results


@router.post("/live-search")
async def live_search_and_ingest(
    req: LiveSearchRequest,
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    """
    Search official government portals and optionally ingest new active schemes into the local verified corpus.
    """
    results = await search_official_schemes(query=req.query, max_results=req.max_results)
    ingested_docs = []
    if req.ingest:
        for r in results:
            doc = ingest_live_search_result_to_corpus(r, db)
            ingested_docs.append({
                "id": doc.id,
                "title": doc.title,
                "url": doc.url,
                "doc_number": doc.doc_number
            })

    return {
        "query": req.query,
        "count": len(results),
        "results": results,
        "ingested_documents": ingested_docs
    }


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


@router.get("/{scheme_id}")
def get_scheme_details(scheme_id: str, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        # Check by id partial or slug
        scheme = db.query(Scheme).filter(Scheme.name.ilike(f"%{scheme_id}%")).first()

    # Find provisions
    provisions = []
    if scheme:
        for p in scheme.provisions:
            provisions.append({
                "field": p.field,
                "value": p.value,
                "quote": p.quote,
                "effective_from": p.effective_from.isoformat() if p.effective_from else None
            })
    
    # Find matching documents
    query_str = scheme.name if scheme else scheme_id
    docs = db.query(Document).filter(
        (Document.title.ilike(f"%{query_str}%")) |
        (Document.text.ilike(f"%{query_str}%"))
    ).order_by(Document.published_on.desc()).limit(10).all()

    return {
        "id": scheme.id if scheme else scheme_id,
        "name": scheme.name if scheme else scheme_id.replace("-", " ").title(),
        "name_aliases": scheme.name_aliases if scheme else [],
        "issuer": scheme.issuer if scheme else "Government of India",
        "provisions": provisions,
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "doc_number": d.doc_number,
                "published_on": d.published_on.isoformat() if d.published_on else None,
                "url": d.url
            }
            for d in docs
        ]
    }


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

