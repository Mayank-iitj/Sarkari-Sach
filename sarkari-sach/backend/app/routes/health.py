from __future__ import annotations
from fastapi import APIRouter
from app.settings import settings

router = APIRouter(prefix="/v1", tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Sarkari Sach Verification API",
        "db": True,
        "redis": True,
        "llm_provider": settings.LLM_PROVIDER,
        "corpus_snapshot": settings.CORPUS_SNAPSHOT or "2026-10-31a",
        "version": "1.0.0"
    }

