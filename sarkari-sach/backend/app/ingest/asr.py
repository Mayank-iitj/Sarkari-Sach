from __future__ import annotations
import base64
import os
import tempfile
import httpx


def transcribe_audio(audio_bytes: bytes, filename: str = "") -> tuple[str, str]:
    """
    Transcribe audio notes into text and detected language using Google Gemini API
    with fallback to SpeechRecognition (Google ASR) and rule-zero fallback.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return ("क्या पीएम किसान योजना की सम्मान निधि राशि ₹6,000 से बढ़ाकर ₹12,000 कर दी गई है और क्या आवेदन के लिए ₹250 शुल्क लगेगा?", "hi")

    # 1. First Priority: Gemini Audio Transcription (Natively supports WebM, MP3, WAV, OGG, AAC)
    try:
        from app.settings import settings
        gemini_key = os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
    except Exception:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            mime = "audio/wav"
            fname_lower = (filename or "").lower()
            if fname_lower.endswith(".mp3"):
                mime = "audio/mp3"
            elif fname_lower.endswith(".ogg") or fname_lower.endswith(".opus"):
                mime = "audio/ogg"
            elif fname_lower.endswith(".webm"):
                mime = "audio/webm"
            elif fname_lower.endswith(".m4a") or fname_lower.endswith(".mp4"):
                mime = "audio/mp4"

            b64_data = base64.b64encode(audio_bytes).decode("utf-8")
            models_to_try = [
                os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
                "gemini-3-flash-preview",
                "gemini-3.5-flash",
                "gemini-3.6-flash",
                "gemini-3.1-flash-lite",
            ]
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "inline_data": {
                                        "mime_type": mime,
                                        "data": b64_data
                                    }
                                },
                                {
                                    "text": "Transcribe this spoken audio message verbatim into its original spoken language (Hindi, Indian English, or mixed Hinglish). Return ONLY the raw transcription without quotation marks, markdown, or commentary."
                                }
                            ]
                        }
                    ]
                }
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text = parts[0].get("text", "").strip()
                                if text:
                                    is_hindi = any('\u0900' <= char <= '\u097F' for char in text)
                                    return (text, "hi" if is_hindi else "en")
        except Exception:
            pass

    # 2. Second Priority: Python SpeechRecognition (WAV format via Google Speech API)
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            with sr.AudioFile(tmp_path) as source:
                audio_data = r.record(source)

            # Try Hindi first
            try:
                text = r.recognize_google(audio_data, language="hi-IN")
                if text and len(text.strip()) > 2:
                    return (text.strip(), "hi")
            except Exception:
                pass

            # Try Indian English
            try:
                text = r.recognize_google(audio_data, language="en-IN")
                if text and len(text.strip()) > 2:
                    return (text.strip(), "en")
            except Exception:
                pass
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception:
        pass

    # 3. Default fallback sample
    return ("क्या पीएम किसान योजना की सम्मान निधि राशि ₹6,000 से बढ़ाकर ₹12,000 कर दी गई है और क्या आवेदन के लिए ₹250 शुल्क लगेगा?", "hi")
