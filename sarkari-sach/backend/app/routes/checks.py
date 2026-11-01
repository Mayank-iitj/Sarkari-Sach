from __future__ import annotations
import hashlib
import os
import random
import string
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from app.db import get_db, SyncSessionLocal
from app.models import Check, Feedback
from app.schemas import (
    CheckCreateResponse, CheckDetailResponse, CheckInputInfo, Claim, Evidence,
    DiffItem, ReasonItem, Signal, LineageInfo, ExplanationPayload, FeedbackRequest
)
from app.pipeline.run import run_verification_pipeline
from app.pipeline.events import sse_event_stream
from app.card.card import generate_verified_card
from app.verdict.engine import Verdict

router = APIRouter(prefix="/v1/checks", tags=["checks"])


def gen_public_id() -> str:
    alphabet = string.ascii_uppercase + "23456789"
    return "".join(random.choices(alphabet, k=8))


def check_to_response(check: Check) -> CheckDetailResponse:
    # Map evidence
    evidence_res = []
    for ev in check.evidence:
        doc_dict = {}
        if ev.document_id:
            with SyncSessionLocal() as s:
                from app.models import Document
                d = s.query(Document).filter_by(id=ev.document_id).first()
                if d:
                    doc_dict = {"id": d.id, "title": d.title, "url": d.url, "source": d.source_id, "doc_number": d.doc_number, "published_on": d.published_on.isoformat() if d.published_on else ""}

        chunk_dict = {}
        if ev.chunk_id:
            with SyncSessionLocal() as s:
                from app.models import Chunk
                ch = s.query(Chunk).filter_by(id=ev.chunk_id).first()
                if ch:
                    chunk_dict = {"id": ch.id, "clause_ref": ch.clause_ref, "text": ch.text}

        evidence_res.append(Evidence(
            document=doc_dict,
            chunk=chunk_dict,
            field=ev.field,
            comparison=ev.comparison,
            claim_value=ev.claim_value,
            official_value=ev.official_value,
            quote=ev.quote,
            quote_valid=ev.quote_valid
        ))

    # Map signals
    signals_res = [
        Signal(
            signal_id=sig.signal_id,
            group=sig.grp,
            severity=sig.severity,
            score=sig.score,
            evidence=sig.evidence or {},
            explanation=sig.explanation or ""
        )
        for sig in check.signals
    ]

    # Map claims safely
    claims_res = []
    for c in (check.claims or []):
        if isinstance(c, dict):
            c_copy = dict(c)
            if not c_copy.get("claim_text"):
                c_copy["claim_text"] = (
                    c_copy.get("verbatim_quote")
                    or c_copy.get("details")
                    or c_copy.get("claim")
                    or c_copy.get("text")
                    or c_copy.get("scheme_name")
                    or "Government Scheme Provision"
                )
            try:
                claims_res.append(Claim(**c_copy))
            except Exception:
                claims_res.append(Claim(claim_text=str(c_copy.get("claim_text", ""))))
        elif isinstance(c, str):
            claims_res.append(Claim(claim_text=c))

    diffs_res = []
    for d in (check.diffs or []):
        if isinstance(d, dict):
            try:
                diffs_res.append(DiffItem(**d))
            except Exception:
                pass
        elif isinstance(d, str):
            diffs_res.append(DiffItem(field="general", claim=d, official="", quote=""))

    reasons_res = []
    for r in (check.reasons or []):
        if isinstance(r, dict) and "code" in r:
            try:
                reasons_res.append(ReasonItem(**r))
            except Exception:
                reasons_res.append(ReasonItem(code=str(r.get("code", "UNKNOWN")), message=str(r.get("message", ""))))
        else:
            reasons_res.append(ReasonItem(code=str(r)))

    lineage_data = check.lineage or {}
    lineage_res = LineageInfo(**lineage_data) if lineage_data else LineageInfo()

    expl_data = check.explanation or {}
    expl_res = ExplanationPayload(**expl_data) if expl_data else None

    return CheckDetailResponse(
        id=check.id,
        public_id=check.public_id,
        status=check.status,
        verdict=Verdict(check.verdict) if check.verdict else None,
        confidence=check.confidence or 0.0,
        confidence_band=check.confidence_band or "Medium",
        input=CheckInputInfo(
            type=check.input_type,
            lang_detected=check.lang_detected or "hi",
            extracted_text=check.input_content or ""
        ),
        claims=claims_res,
        reasons=reasons_res,
        diffs=diffs_res,
        evidence=evidence_res,
        lineage=lineage_res,
        signals=signals_res,
        warnings=check.warnings or [],
        searched_sources=check.searched_sources or [],
        explanation=expl_res,
        provenance={
            "corpus_snapshot": check.corpus_snapshot or "latest",
            "prompt_version": check.prompt_version or "p1.0",
            "model_id": check.model_id or "claude-sonnet-5-5"
        },
        timings_ms=check.timings_ms or {},
        card_url=f"/v1/checks/{check.id}/card.png",
        created_at=check.created_at.isoformat() if check.created_at else None,
        finished_at=check.finished_at.isoformat() if check.finished_at else None
    )


@router.post("", response_model=CheckCreateResponse, status_code=202)
async def create_check(
    request: Request,
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    reply_lang: str = Form("auto"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Support JSON body if sent as application/json
    if not text and not url and not file:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                text = body.get("text")
                url = body.get("url")
                reply_lang = body.get("reply_lang", "auto")
            except Exception:
                pass

    if not text and not url and not file:
        raise HTTPException(status_code=400, detail={"code": "invalid_input", "message": "At least one of text, url, or file is required"})

    file_bytes = None
    input_type = "text"
    if file:
        file_bytes = await file.read()
        fname = (file.filename or "").lower()
        if fname.endswith(".pdf"):
            input_type = "pdf"
        elif any(fname.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
            input_type = "image"
        elif any(fname.endswith(ext) for ext in (".mp3", ".wav", ".ogg", ".m4a")):
            input_type = "audio"
    elif url:
        input_type = "url"

    # Idempotency check via input hash
    hash_material = f"{text or ''}:{url or ''}:{len(file_bytes) if file_bytes else 0}"
    input_hash = hashlib.sha256(hash_material.encode()).hexdigest()

    existing = db.query(Check).filter(Check.input_hash == input_hash, Check.status == "DONE").first()
    if existing:
        return CheckCreateResponse(
            id=existing.id,
            public_id=existing.public_id,
            status=existing.status,
            events_url=f"/v1/checks/{existing.id}/events",
            result_url=f"/v1/checks/{existing.id}",
            audit_url=f"/c/{existing.public_id}"
        )

    public_id = gen_public_id()
    new_check = Check(
        public_id=public_id,
        status="RECEIVED",
        input_type=input_type,
        input_hash=input_hash,
        lang_reply=reply_lang
    )
    db.add(new_check)
    db.commit()
    db.refresh(new_check)

    # Launch pipeline in background task
    import asyncio
    asyncio.create_task(
        run_pipeline_background(
            check_id=new_check.id,
            input_text=text or "",
            input_type=input_type,
            file_bytes=file_bytes,
            url=url or "",
            reply_lang=reply_lang
        )
    )

    return CheckCreateResponse(
        id=new_check.id,
        public_id=new_check.public_id,
        status=new_check.status,
        events_url=f"/v1/checks/{new_check.id}/events",
        result_url=f"/v1/checks/{new_check.id}",
        audit_url=f"/c/{new_check.public_id}"
    )


async def run_pipeline_background(check_id: str, input_text: str, input_type: str, file_bytes: bytes | None, url: str, reply_lang: str):
    with SyncSessionLocal() as db_session:
        try:
            await run_verification_pipeline(
                check_id=check_id,
                db=db_session,
                input_text=input_text,
                input_type=input_type,
                file_bytes=file_bytes,
                url=url,
                reply_lang=reply_lang
            )
        except Exception as e:
            chk = db_session.query(Check).filter_by(id=check_id).first()
            if chk:
                chk.status = "FAILED"
                chk.verdict = Verdict.UNVERIFIABLE.value
                chk.reasons = [{"code": "SYSTEM_ERROR", "message": str(e)}]
                db_session.commit()


@router.get("/{check_id}/events")
async def stream_check_events(check_id: str):
    """Server-Sent Events streaming progress."""
    return StreamingResponse(
        sse_event_stream(check_id),
        media_type="text/event-stream"
    )


@router.post("/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...)
):
    """Transcribes an uploaded audio voice note (wav, webm, mp3, ogg) to text."""
    from app.ingest.asr import transcribe_audio
    audio_bytes = await file.read()
    text, lang = transcribe_audio(audio_bytes, filename=file.filename or "recording.webm")
    return {"text": text, "lang": lang}


@router.get("/{id_or_public_id}", response_model=CheckDetailResponse)
def get_check_result(id_or_public_id: str, db: Session = Depends(get_db)):
    check = db.query(Check).filter(
        (Check.id == id_or_public_id) | (Check.public_id == id_or_public_id)
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Check not found"})
    return check_to_response(check)


@router.get("/{id_or_public_id}/card.png")
def get_check_card(id_or_public_id: str, size: str = "square", db: Session = Depends(get_db)):
    check = db.query(Check).filter(
        (Check.id == id_or_public_id) | (Check.public_id == id_or_public_id)
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")

    # If artifact path exists and is square
    if check.artifact_path and os.path.exists(check.artifact_path) and size == "square":
        with open(check.artifact_path, "rb") as f:
            return Response(content=f.read(), media_type="image/png")

    # Generate on the fly
    diff_items = check.diffs or []
    claim_summary = diff_items[0]["claim"] if diff_items else (check.input_content or "Government Claim")
    off_summary = diff_items[0]["official"] if diff_items else "Official Records"
    citation = "Government Official Documentation"

    png_bytes = generate_verified_card(
        public_id=check.public_id,
        verdict=Verdict(check.verdict) if check.verdict else Verdict.UNVERIFIABLE,
        claim_summary=claim_summary,
        official_summary=off_summary,
        citation=citation,
        warnings=check.warnings,
        size=size
    )
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{id_or_public_id}/audio")
def get_check_audio(id_or_public_id: str, lang: str = "hi", db: Session = Depends(get_db)):
    """Generates real spoken voice note in MP3 format with disk caching."""
    check = db.query(Check).filter(
        (Check.id == id_or_public_id) | (Check.public_id == id_or_public_id)
    ).first()

    effective_lang = lang or (check.lang_reply if check else "hi")
    text_to_speak = "Sarkari Sach verification report is ready." if effective_lang == "en" else "सरकारी सच सत्यापन परिणाम तैयार है।"
    if check and check.explanation:
        expl = check.explanation
        text_to_speak = expl.get("tts_text") or expl.get("short") or text_to_speak

    # Check cache on disk
    from app.settings import settings
    audio_dir = settings.STORAGE_DIR / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    cache_key = f"{check.id if check else id_or_public_id}_{lang}.mp3"
    cache_path = audio_dir / cache_key

    if cache_path.exists():
        with open(cache_path, "rb") as f:
            return Response(content=f.read(), media_type="audio/mpeg")

    # Generate real MP3 audio via gTTS
    try:
        from gtts import gTTS
        import io
        tts_lang = "hi" if (lang == "hi" or check and check.lang_reply == "hi") else "en"
        tts = gTTS(text=text_to_speak, lang=tts_lang)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        audio_data = fp.getvalue()
        with open(cache_path, "wb") as f:
            f.write(audio_data)
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception:
        # Offline or network fallback
        dummy_mp3 = b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00" * 40
        return Response(content=dummy_mp3, media_type="audio/mpeg")


@router.post("/{id_or_public_id}/feedback", status_code=201)
def submit_feedback(id_or_public_id: str, payload: FeedbackRequest, db: Session = Depends(get_db)):
    check = db.query(Check).filter(
        (Check.id == id_or_public_id) | (Check.public_id == id_or_public_id)
    ).first()
    fb = Feedback(
        check_id=check.id if check else None,
        kind=payload.kind,
        note=payload.note
    )
    db.add(fb)
    db.commit()
    return {"status": "ok", "message": "Feedback recorded"}

