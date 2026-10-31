from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Form, Response, Depends
from sqlalchemy.orm import Session
from app.db import get_db, SyncSessionLocal
from app.models import Check
from app.routes.checks import gen_public_id
from app.pipeline.run import run_verification_pipeline

router = APIRouter(prefix="/v1/whatsapp", tags=["whatsapp"])


class WhatsAppSimulateRequest(BaseModel):
    message: str
    reply_lang: str = "hi"
    media_url: Optional[str] = None


@router.post("/webhook")
async def whatsapp_webhook(
    Body: str = Form(""),
    From: str = Form(""),
    MediaUrl0: str = Form(None)
):
    """
    Twilio WhatsApp incoming webhook handler.
    Processes the forwarded message and responds with compliant TwiML XML.
    """
    input_text = Body.strip()
    public_id = gen_public_id()

    with SyncSessionLocal() as db:
        c = Check(
            public_id=public_id,
            status="RECEIVED",
            input_type="image" if MediaUrl0 else "text",
            input_hash=str(hash(input_text or MediaUrl0 or "")),
            lang_reply="hi"
        )
        db.add(c)
        db.commit()
        cid = c.id

    with SyncSessionLocal() as db:
        res = await run_verification_pipeline(
            check_id=cid,
            db=db,
            input_text=input_text,
            input_type="image" if MediaUrl0 else "text",
            url=MediaUrl0 or "",
            reply_lang="hi"
        )

    verdict_str = res.verdict or "UNVERIFIABLE"
    expl_text = res.explanation.get("short", "") if res.explanation else "जाँच पूर्ण हुई।"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>*सरकारी सच (Sarkari Sach) निर्णय:* {verdict_str}

{expl_text}

जाँच रिपोर्ट व प्रमाण: sach.app/c/{res.public_id}</Body>
    </Message>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


@router.post("/simulate")
async def whatsapp_simulate(
    req: WhatsAppSimulateRequest,
    db: Session = Depends(get_db)
):
    """
    Interactive WhatsApp Simulator endpoint for judges and evaluators.
    Returns simulated chat bubbles, card image URL, voice note URL, and audit link.
    """
    public_id = gen_public_id()
    check = Check(
        public_id=public_id,
        status="RECEIVED",
        input_type="text",
        input_hash=str(hash(req.message)),
        lang_reply=req.reply_lang
    )
    db.add(check)
    db.commit()
    check_id = check.id

    res = await run_verification_pipeline(
        check_id=check_id,
        db=db,
        input_text=req.message,
        input_type="text",
        reply_lang=req.reply_lang
    )

    verdict_str = res.verdict or "UNVERIFIABLE"
    expl_text = res.explanation.get("short", "") if res.explanation else "Verification complete."
    citation = "Official Central Government Records"
    if res.evidence:
        first_ev = res.evidence[0]
        if hasattr(first_ev, "document_id"):
            from app.models import Document
            doc_rec = db.query(Document).filter(Document.id == first_ev.document_id).first()
            if doc_rec:
                citation = doc_rec.title

    formatted_bot_reply = (
        f"🏛️ *SARKARI SACH VERIFICATION REPORT*\n\n"
        f"🔍 *Verdict:* [{verdict_str}]\n\n"
        f"📌 *Fact:* {expl_text}\n\n"
        f"📜 *Citation:* {citation}\n\n"
        f"🔗 *Full Cryptographic Audit:* sach.app/c/{res.public_id}"
    )

    return {
        "check_id": check_id,
        "public_id": res.public_id,
        "verdict": verdict_str,
        "bot_reply_text": formatted_bot_reply,
        "explanation": expl_text,
        "citation": citation,
        "card_url": f"/v1/checks/{check_id}/card.png",
        "audio_url": f"/v1/checks/{check_id}/audio",
        "timings_ms": res.timings_ms or {},
        "signals_count": len(res.signals),
        "audit_url": f"/c/{res.public_id}"
    }
