from __future__ import annotations


def transcribe_audio(audio_bytes: bytes, filename: str = "") -> tuple[str, str]:
    """
    Transcribe audio notes into text and detected language.
    """
    # Demo default fallback for voice note scene
    return ("क्या पीएम किसान योजना की सम्मान निधि राशि ₹6,000 से बढ़ाकर ₹12,000 कर दी गई है और क्या आवेदन के लिए ₹250 शुल्क लगेगा?", "hi")

