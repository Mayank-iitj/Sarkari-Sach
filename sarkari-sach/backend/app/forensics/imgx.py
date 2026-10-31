from __future__ import annotations
from app.verdict.engine import Signal

SUSPECT_IMAGE_SOFTWARE = {"photoshop", "canva", "picsart", "snapseed", "lightroom", "pixlr"}


def analyze_image_heuristics(exif_data: dict | None, image_bytes: bytes | None = None) -> list[Signal]:
    signals: list[Signal] = []
    if not exif_data:
        return signals

    software = str(exif_data.get("Software", "")).lower()
    if any(sw in software for sw in SUSPECT_IMAGE_SOFTWARE):
        signals.append(Signal(
            signal_id="IMG_EXIF_EDITOR",
            group="DOCUMENT",
            severity="info",
            score=0.6,
            explanation=f"Image metadata indicates manipulation using photo editing software ({software})."
        ))

    return signals

