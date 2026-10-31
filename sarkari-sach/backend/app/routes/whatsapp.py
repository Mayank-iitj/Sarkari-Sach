from __future__ import annotations
from fastapi import APIRouter, Form, Response
from app.db import SyncSessionLocal
from app.models import Check
from app.routes.checks import gen_public_id
from app.pipeline.run import run_verification_pipeline

router = APIRouter(prefix="/v1/whatsapp", tags=["whatsapp"])


@router.post("/webhook")
async def whatsapp_webhook(
    Body: str = Form(""),
    From: str = Form(""),
    MediaUrl0: str = Form(None)
):
    """
    Twilio WhatsApp incoming webhook handler.
    Creates a check, processes it, and responds with TwiML XML.
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

    # TwiML response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>*सरकारी सच (Sarkari Sach) निर्णय:* {verdict_str}

{expl_text}

जाँच रिपोर्ट व प्रमाण: sach.app/c/{res.public_id}</Body>
    </Message>
</Response>"""

    return Response(content=twiml, media_type="application/xml")

