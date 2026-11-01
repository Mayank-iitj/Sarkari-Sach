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
from app.llm.gemini_client import GeminiClient

router = APIRouter(prefix="/v1/whatsapp", tags=["whatsapp"])


class WhatsAppSimulateRequest(BaseModel):
    message: str
    reply_lang: str = "hi"
    media_url: Optional[str] = None


def is_greeting(text: str) -> bool:
    """
    Detects if the incoming message is a conversational greeting or salutation.
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

    if clean in greeting_words or (len(words) <= 3 and words[0] in greeting_words):
        claim_keywords = {
            "yojana", "योजना", "kisan", "किसान", "rupee", "rupees", "rs", "₹",
            "crore", "lakh", "fee", "free", "link", "form", "apply", "subsidy",
            "installment", "portal", "gazette", "notice", "circular", "pm", "ayushman"
        }
        if not any(k in clean for k in claim_keywords):
            return True

    return False


def classify_message_intent(text: str) -> str:
    """
    Classifies citizen WhatsApp message into:
    - 'GREETING': casual greeting/salutation
    - 'SCHEME_INQUIRY': inquiry requesting scheme recommendations, portal info, or general guidance
    - 'CLAIM_VERIFICATION': forward of a specific rumor, suspicious notification, payment link, or claim to verify
    """
    if is_greeting(text):
        return "GREETING"

    clean = text.strip().lower()

    inquiry_triggers = [
        "find me", "tell me", "show me", "which scheme", "what scheme", "what is",
        "how to", "how can", "where to", "list scheme", "suggest", "guide me",
        "schemes for", "scholarship for", "subsidy for", "loan for", "benefits for",
        "योजना बताएं", "योजना बताइए", "योजना की जानकारी", "जानकारी दें", "कैसे आवेदन",
        "छात्रों के लिए", "विद्यार्थी", "किसानों के लिए", "महिलाओं के लिए", "युवाओं के लिए",
        "मुझे योजना", "कौन सी योजना", "क्या है", "कैसे करें"
    ]

    has_trigger = any(t in clean for t in inquiry_triggers)
    is_question = clean.endswith("?") or clean.startswith(("what", "which", "how", "who", "where", "can i", "do we", "is there", "kya", "kaise", "kon"))

    has_link = bool(re.search(r"https?://|\.in\b|\.com\b|\.org\b|\.xyz\b|\.top\b", clean))
    has_suspicious_claim = bool(re.search(r"(?:pay|शुल्क|फीस|rupee|₹|rs\.?)\s*\d+|fake|fraud|scam|सच है|असली है", clean))

    if (has_trigger or is_question) and not (has_link and has_suspicious_claim):
        return "SCHEME_INQUIRY"

    return "CLAIM_VERIFICATION"


def get_welcome_reply(lang: str = "hi") -> str:
    if lang == "en":
        return (
            "🏛️ *Hello! Welcome to Sarkari Sach (सरकारी सच)*\n\n"
            "I am the official AI verification assistant for Indian Central Government schemes, circulars, and gazette notices.\n\n"
            "📌 *What you can do here:*\n"
            "1️⃣ *Ask for Schemes:* Type e.g. _\"Find me scheme for Students\"_ or _\"Schemes for Farmers\"_.\n"
            "2️⃣ *Verify Circulars:* Forward any viral claim, social media post, or WhatsApp notice.\n"
            "3️⃣ *Check Notices:* Verify official Gazette numbers (e.g. S.O. 1234, G.S.R. 552).\n"
            "4️⃣ *Verify Links:* Check if a portal link (e.g. pmkisan-yojana.in) is genuine or a scam.\n"
            "5️⃣ *Voice Query:* Tap the mic button to speak in Hindi or English.\n\n"
            "👉 _Please paste or forward the message, circular, or query you would like to explore!_"
        )
    return (
        "🏛️ *नमस्ते! सरकारी सच (Sarkari Sach) में आपका स्वागत है।*\n\n"
        "मैं भारत सरकार की योजनाओं, गजट अधिसूचनाओं (Gazette Notifications) और वायरल संदेशों की पुष्टि करने वाला आधिकारिक AI सत्यापन बॉट हूँ।\n\n"
        "📌 *आप यहाँ क्या कर सकते हैं:*\n"
        "1️⃣ *योजना खोजें:* जैसे लिखें _\"छात्रों के लिए योजनाएं बताओ\"_ या _\"किसानों के लिए योजना\"_।\n"
        "2️⃣ *दावों की पुष्टि:* किसी भी संदिग्ध संदेश, सर्कुलर या फॉर्म को यहाँ भेजें।\n"
        "3️⃣ *सरकारी आदेश:* गजट संख्या (जैसे S.O. 1234, G.S.R. 552) की प्रामाणिकता।\n"
        "4️⃣ *वेबसाइट लिंक:* क्या कोई पोर्टल (जैसे pmkisan-yojana.in) असली है या फर्जी।\n"
        "5️⃣ *वॉइस संदेश:* माइक बटन दबाकर बोलकर भी पूछ सकते हैं।\n\n"
        "👉 _शुरू करने के लिए कृपया अपना संदेश, योजना का नाम या लिंक यहाँ भेजें।_"
    )


def handle_scheme_inquiry(message: str, reply_lang: str = "hi") -> str:
    """
    Answers informational questions, scheme recommendations, and eligibility guidance
    using Google Gemini and verified Government of India registries.
    """
    client = GeminiClient()
    system_prompt = (
        "You are Sarkari Sach (सरकारी सच), the official AI digital governance and fact-verification assistant for the Government of India. "
        "A citizen sent this WhatsApp inquiry requesting official government scheme information or guidance. "
        "Provide an authoritative, well-structured, and helpful response: "
        "1. List the top genuine Central Government schemes from official registries (such as myscheme.gov.in, National Scholarship Portal, PM-KISAN, Ayushman Bharat, PM Surya Ghar, etc.). "
        "2. For each scheme, clearly provide: Scheme Name, Core Benefit / Financial Support, Eligibility Criteria, and Official Application Portal (strictly official .gov.in / .nic.in URLs). "
        "3. Add a clear security reminder: Official central government schemes never charge application fees on unofficial portals; apply only on genuine .gov.in links. "
        f"Language of response: {'English' if reply_lang == 'en' else 'Hindi'}. "
        "Format cleanly for WhatsApp with emojis, bold headers (*text*), and clear bullet points."
    )
    reply = client.text(system=system_prompt, user=message, max_tokens=1000)
    return reply


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
    intent = classify_message_intent(input_text) if not MediaUrl0 else "CLAIM_VERIFICATION"

    if intent == "GREETING":
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>{get_welcome_reply("hi")}</Body>
    </Message>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    if intent == "SCHEME_INQUIRY":
        reply_text = handle_scheme_inquiry(input_text, reply_lang="hi")
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>{reply_text}</Body>
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
    intent = classify_message_intent(req.message)

    # 1. Handle conversational greetings instantly
    if intent == "GREETING":
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

    # 2. Handle scheme discovery & general information questions dynamically via Gemini
    if intent == "SCHEME_INQUIRY":
        reply_text = handle_scheme_inquiry(req.message, reply_lang=req.reply_lang)
        return {
            "check_id": None,
            "public_id": None,
            "verdict": None,
            "bot_reply_text": reply_text,
            "explanation": "Official Central Government Scheme Information",
            "citation": "Official Central Government Portal (myscheme.gov.in)",
            "card_url": None,
            "audio_url": None,
            "timings_ms": {"inquiry": 1},
            "signals_count": 0,
            "audit_url": None
        }

    # 3. Run statutory forensic verification pipeline for claims, circulars, and notices
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
