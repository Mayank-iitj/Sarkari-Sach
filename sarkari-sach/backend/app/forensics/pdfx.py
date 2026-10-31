from __future__ import annotations
from app.verdict.engine import Signal

SUSPECT_PRODUCERS = {"canva", "photoshop", "wps", "word online", "camscanner", "scanner", "picsart", "ilovepdf"}


def analyze_pdf_metadata(metadata: dict | None) -> list[Signal]:
    signals: list[Signal] = []
    if not metadata:
        return signals

    producer = str(metadata.get("Producer", "")).lower()
    creator = str(metadata.get("Creator", "")).lower()

    if any(sp in producer or sp in creator for sp in SUSPECT_PRODUCERS):
        signals.append(Signal(
            signal_id="PDF_PRODUCER_CONSUMER",
            group="DOCUMENT",
            severity="soft",
            score=0.75,
            explanation=f"Document metadata reveals creation with consumer graphics/editing software ({producer or creator}) rather than official government publication tools."
        ))

    return signals

