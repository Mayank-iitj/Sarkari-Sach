from __future__ import annotations
import re
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


def is_greeting(text: str) -> bool:
    """
    Detects if the incoming message is a conversational greeting, salutation, or help query,
    rather than a claim requiring statutory forensic verification.
    """
    if not text:
        return False
    clean = re.sub(r"[^\w\s\u0900-\u097F]", "", text.strip().lower(), flags=re.UNICODE)
    words = clean.split()
    if not words or len(words) > 6:
        return False

    greeting_words = {
        "hi", "hello", "hey", "hlo", "hii", "hiii", "hola", "heya",
        "namaste", "namaskar", "pranam", "jai hind", "jai shree ram",
        "नमस्ते", "नमस्कार", "प्रणाम", "हाय", "हेलो", "जय हिन्द",
        "help", "menu", "start", "info", "about",
        "मदद", "सहायता", "जानकारी", "शुरू",
        "who are you", "kya hai", "kaise ho", "how are you", "what is this",
        "good morning", "good afternoon", "good evening"
    }

    # Match exact greeting phrase or starting word
    if clean in greeting_words or (len(words) <= 3 and words[0] in greeting_words):
        # Exclude if it mentions any specific scheme or claim words
        claim_keywords = {
            "yojana", "योजना", "kisan", "किसान", "rupee", "rupees", "rs", "₹",
            "crore", "lakh", "fee", "free", "link", "form", "apply", "subsidy",
            "installment", "portal", "gazette", "notice", "circular", "pm", "ayushman"
        }
        if not any(k in clean for k in claim_keywords):
            return True

    return False


def get_welcome_reply(lang: str = "hi") -> str:
    if lang == "en":
        return (
            "🏛️ *Hello! Welcome to Sarkari Sach (सरकारी सच)*\n\n"
            "I am the official AI verification assistant for Indian Central Government schemes, circulars, and gazette notices.\n\n"
            "📌 *What you can do here:*\n"
            "1️⃣ *Forward Claims:* Send any suspected WhatsApp message, circular, or post to verify its truth.\n"
            "2️⃣ *Check Notices:* Verify official Gazette numbers (e.g. S.O. 1234, G.S.R. 552).\n"
            "3️⃣ *Verify Links:* Check if a portal link (e.g. pmkisan-yojana.in) is genuine or a scam.\n"
            "4️⃣ *Voice Query:* Tap the mic button to speak in Hindi or English.\n\n"
            "👉 _Please paste or forward the message, circular, or link you would like to verify!_"
        )
    return (
        "🏛️ *नमस्ते! सरकारी सच (Sarkari Sach) में आपका स्वागत है।*\n\n"
        "मैं भारत सरकार की योजनाओं, गजट अधिसूचनाओं (Gazette Notifications) और वायरल संदेशों की पुष्टि करने वाला आधिकारिक AI सत्यापन बॉट हूँ।\n\n"
        "📌 *आप यहाँ क्या जाँच सकते हैं:*\n"
        "1️⃣ *व्हाट्सएप्प दावे:* किसी भी संदिग्ध संदेश, सर्कुलर या फॉर्म को यहाँ भेजें।\n"
        "2️⃣ *सरकारी आदेश:* गजट संख्या (जैसे S.O. 1234, G.S.R. 552) की प्रामाणिकता।\n"
        "3️⃣ *वेबसाइट लिंक:* क्या कोई पोर्टल (जैसे pmkisan-yojana.in) असली है या फर्जी।\n"
        "4️⃣ *वॉइस संदेश:* माइक बटन दबाकर बोलकर भी पूछ सकते हैं।\n\n"
        "👉 _जाँच शुरू करने के लिए कृपया अपना संदेश, योजना का नाम या लिंक यहाँ भेजें।_"
    )


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

    # Handle greetings / help requests conversationally
    if not MediaUrl0 and is_greeting(input_text):
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>{get_welcome_reply("hi")}</Body>
    </Message>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

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
    # 1. Handle conversational greetings instantly without running forensic pipeline
    if is_greeting(req.message):
        welcome_text = get_welcome_reply(req.reply_lang)
        return {
            "check_id": None,
            "public_id": None,
            "verdict": None,
            "bot_reply_text": welcome_text,
            "explanation": "Welcome to Sarkari Sach verification bot.",
            "citation": "The Gazette of India & Official Central Registries",
            "card_url": None,
            "audio_url": None,
            "timings_ms": {"greet": 1},
            "signals_count": 0,
            "audit_url": None
        }

    # 2. Run statutory verification pipeline for real claims
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
    citation = "The Gazette of India & Official Central Registries"
    if res.evidence:
        first_ev = res.evidence[0]
        if hasattr(first_ev, "document_id"):
            from app.models import Document
            doc_rec = db.query(Document).filter(Document.id == first_ev.document_id).first()
            if doc_rec:
                citation = doc_rec.title
    elif check.searched_sources:
        citation = check.searched_sources[0]

    steps_block = ""
    if res.explanation and isinstance(res.explanation, dict) and res.explanation.get("steps"):
        steps = res.explanation.get("steps", [])
        if steps:
            steps_block = "\n\n📋 *Official Action Steps:*\n" + "\n".join([f"• {s}" for s in steps])

    formatted_bot_reply = (
        f"🏛️ *SARKARI SACH VERIFICATION REPORT*\n\n"
        f"🔍 *Verdict:* [{verdict_str}]\n\n"
        f"📌 *Fact:* {expl_text}"
        f"{steps_block}\n\n"
        f"📜 *Official Citation:* {citation}\n\n"
        f"🔗 *Full Cryptographic Audit:* http://localhost:3000/c/{res.public_id}"
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
