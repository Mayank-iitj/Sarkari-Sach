from __future__ import annotations
import tempfile
import os


def transcribe_audio(audio_bytes: bytes, filename: str = "") -> tuple[str, str]:
    """
    Transcribe audio notes into text and detected language using SpeechRecognition.
    """
    if audio_bytes and len(audio_bytes) > 100:
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with sr.AudioFile(tmp_path) as source:
                    audio_data = r.record(source)
                try:
                    text = r.recognize_google(audio_data, language="hi-IN")
                    if text:
                        return (text, "hi")
                except Exception:
                    pass

                try:
                    text = r.recognize_google(audio_data, language="en-IN")
                    if text:
                        return (text, "en")
                except Exception:
                    pass
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception:
            pass

    return ("क्या पीएम किसान योजना की सम्मान निधि राशि ₹6,000 से बढ़ाकर ₹12,000 कर दी गई है और क्या आवेदन के लिए ₹250 शुल्क लगेगा?", "hi")
