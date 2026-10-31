from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Document, Chunk
from app.schemas import DocumentItem

router = APIRouter(prefix="/v1/documents", tags=["documents"])


@router.get("", response_model=list[DocumentItem])
def list_documents(
    q: str | None = None,
    doc_type: str | None = None,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Document).order_by(Document.published_on.desc())
    if q:
        query = query.filter(
            (Document.title.ilike(f"%{q}%")) |
            (Document.doc_number.ilike(f"%{q}%")) |
            (Document.text.ilike(f"%{q}%"))
        )
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    
    docs = query.limit(limit).all()
    return [
        DocumentItem(
            id=d.id,
            source_id=d.source_id or "pib",
            external_id=d.external_id,
            doc_type=d.doc_type,
            title=d.title,
            issuer=d.issuer,
            doc_number=d.doc_number,
            published_on=d.published_on.isoformat() if d.published_on else None,
            effective_from=d.effective_from.isoformat() if d.effective_from else None,
            effective_to=d.effective_to.isoformat() if d.effective_to else None,
            url=d.url,
            text=d.text[:2000] if len(d.text) > 2000 else d.text,
            snapshot_id=d.snapshot_id
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentItem)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentItem(
        id=doc.id,
        source_id=doc.source_id or "pib",
        external_id=doc.external_id,
        doc_type=doc.doc_type,
        title=doc.title,
        issuer=doc.issuer,
        doc_number=doc.doc_number,
        published_on=doc.published_on.isoformat() if doc.published_on else None,
        effective_from=doc.effective_from.isoformat() if doc.effective_from else None,
        effective_to=doc.effective_to.isoformat() if doc.effective_to else None,
        url=doc.url,
        text=doc.text,
        snapshot_id=doc.snapshot_id
    )


@router.get("/{doc_id}/text")
def get_document_text(doc_id: str, highlight: str | None = None, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    highlight_span = None
    if highlight:
        chunk = db.query(Chunk).filter(Chunk.id == highlight).first()
        if chunk and chunk.text:
            idx = doc.text.find(chunk.text[:50])
            if idx != -1:
                highlight_span = [idx, idx + len(chunk.text)]

    return {
        "id": doc.id,
        "title": doc.title,
        "text": doc.text,
        "highlight_chunk_id": highlight,
        "highlight_span": highlight_span
    }
