from __future__ import annotations
import io
from typing import Any
from pypdf import PdfReader


def extract_pdf_content(file_bytes: bytes) -> tuple[str, dict[str, Any]]:
    """
    Extracts text and metadata from PDF bytes.
    Returns (extracted_text, metadata).
    """
    try:
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
        full_text = "\n".join(pages_text).strip()
        metadata = dict(reader.metadata or {})
        return full_text, metadata
    except Exception as e:
        return f"PDF Extraction Error: {str(e)}", {}

