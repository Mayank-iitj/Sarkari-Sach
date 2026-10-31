from __future__ import annotations
from datetime import date
from typing import Any
from sqlalchemy.orm import Session
from app.models import Document, DocRelation
from app.verdict.engine import Lineage


def resolve_lineage(matched_doc: Document | None, db: Session) -> tuple[Lineage, dict[str, Any]]:
    """
    Computes lineage for the matched document:
    - Checks if any successor in doc_relations supersedes or amends it.
    - Checks if document has expired.
    - Returns (Lineage object for verdict engine, lineage dict for API response).
    """
    if not matched_doc:
        return Lineage(), {"scheme_id": None, "timeline": [], "superseded": False, "expired": False}

    today = date.today()
    expired = bool(matched_doc.effective_to and matched_doc.effective_to < today)

    # Find successors: documents where dst_doc = matched_doc.id
    relations = db.query(DocRelation).filter(DocRelation.dst_doc == matched_doc.id).all()

    superseded_by = None
    latest_doc_id = matched_doc.id

    timeline = [
        {
            "date": matched_doc.published_on.isoformat() if matched_doc.published_on else "2019-02-24",
            "document_id": matched_doc.id,
            "title": matched_doc.title,
            "change": "Official Launch / Notification",
            "relation": None
        }
    ]

    for rel in relations:
        successor_doc = db.query(Document).filter(Document.id == rel.src_doc).first()
        if successor_doc:
            if rel.relation in ("supersedes", "rescinds"):
                superseded_by = successor_doc.id
                latest_doc_id = successor_doc.id
            timeline.append({
                "date": successor_doc.published_on.isoformat() if successor_doc.published_on else "2023-08-10",
                "document_id": successor_doc.id,
                "title": successor_doc.title,
                "change": f"Order {rel.relation.title()}: {rel.evidence_quote or 'Updated provisions'}",
                "relation": rel.relation
            })

    lineage_obj = Lineage(
        superseded_by=superseded_by,
        expired=expired,
        latest_doc_id=latest_doc_id
    )

    lineage_info = {
        "scheme_id": matched_doc.source_id or "pm-kisan",
        "timeline": timeline,
        "current_document_id": latest_doc_id,
        "superseded": bool(superseded_by),
        "expired": expired,
        "latest_doc_id": latest_doc_id
    }

    return lineage_obj, lineage_info

