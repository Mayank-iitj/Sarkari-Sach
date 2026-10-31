from __future__ import annotations
import re
import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Check, CheckEvidence, CheckSignal, Debunk
from app.schemas import Verdict
from app.settings import settings
from app.verdict.engine import decide, Ctx, Match, Signal as EngineSignal
from app.pipeline.events import emit_event
from app.nlp.normalize import normalize_text
from app.nlp.validator import validate_quote
from app.ingest.lang import detect_language
from app.ingest.redact import redact_pii
from app.forensics.link import analyze_link
from app.forensics.ident import analyze_identifiers
from app.forensics.provenance import check_debunk_match
from app.pipeline.stages.retrieve import retrieve_relevant_evidence
from app.pipeline.stages.lineage import resolve_lineage
from app.llm.client import get_llm_client
from app.llm.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    COMPARISON_SYSTEM_PROMPT,
    EXPLANATION_SYSTEM_PROMPT
)
from app.card.card import generate_verified_card


async def run_verification_pipeline(
    check_id: str,
    db: Session,
    input_text: str = "",
    input_type: str = "text",
    file_bytes: bytes | None = None,
    url: str = "",
    reply_lang: str = "auto"
) -> Check:
    """
    Executes the deterministic verification pipeline.
    Emits real-time SSE stage & signal events.
    """
    check = db.query(Check).filter(Check.id == check_id).first()
    if not check:
        raise ValueError(f"Check {check_id} not found")

    timings = {}
    total_start = time.time()
    llm = get_llm_client()

    # -------------------------------------------------------------
    # STAGE 1: NORMALIZED
    # -------------------------------------------------------------
    t0 = time.time()
    raw_content = input_text

    if input_type == "url" and url:
        from app.ingest.fetcher import safe_fetch_url
        fetched_text, chain, _ = await safe_fetch_url(url)
        raw_content = f"URL: {url}\nContent: {fetched_text[:2000]}"
    elif input_type == "pdf" and file_bytes:
        from app.ingest.pdf import extract_pdf_content
        pdf_text, _ = extract_pdf_content(file_bytes)
        raw_content = pdf_text
    elif input_type == "image" and file_bytes:
        from app.ingest.ocr import extract_image_text
        raw_content = extract_image_text(file_bytes)
    elif input_type == "audio" and file_bytes:
        from app.ingest.asr import transcribe_audio
        audio_text, _ = transcribe_audio(file_bytes)
        raw_content = audio_text

    norm_text = normalize_text(raw_content or "")
    detected_lang = detect_language(norm_text)
    actual_reply_lang = detected_lang if reply_lang in ("auto", None, "") else reply_lang

    check.input_content = redact_pii(norm_text)
    check.lang_detected = detected_lang
    check.lang_reply = actual_reply_lang
    check.status = "NORMALIZED"
    db.commit()

    t_norm = int((time.time() - t0) * 1000)
    timings["normalize"] = t_norm
    await emit_event(check_id, "stage", {
        "stage": "NORMALIZED",
        "status": "done",
        "duration_ms": t_norm,
        "note": f"Normalized {len(norm_text.split())} words, {detected_lang}"
    })

    # -------------------------------------------------------------
    # STAGE 2: EXTRACTED
    # -------------------------------------------------------------
    t0 = time.time()
    claim_extraction = llm.json(
        system=EXTRACTION_SYSTEM_PROMPT,
        user=f"<untrusted_input lang='{detected_lang}'>{norm_text}</untrusted_input>",
        schema={"type": "object"}
    )
    extracted_claims = claim_extraction.get("claims", [])
    check.claims = extracted_claims
    check.status = "EXTRACTED"
    db.commit()

    t_ext = int((time.time() - t0) * 1000)
    timings["extract"] = t_ext
    await emit_event(check_id, "stage", {
        "stage": "EXTRACTED",
        "status": "done",
        "duration_ms": t_ext,
        "note": f"Extracted {len(extracted_claims)} verifiable claims"
    })
    if extracted_claims:
        await emit_event(check_id, "partial", {
            "scheme": extracted_claims[0].get("scheme_name"),
            "claim": extracted_claims[0].get("claim_text")
        })

    # If no claims could be extracted -> early exit to UNVERIFIABLE
    if not extracted_claims:
        check.verdict = Verdict.UNVERIFIABLE.value
        check.confidence = 0.0
        check.reasons = [{"code": "UNCLEAR_INPUT", "message": "No checkable government scheme or rule found in message."}]
        check.explanation = {
            "lang": actual_reply_lang,
            "short": "इस संदेश में कोई स्पष्ट सरकारी आदेश या योजना नहीं मिली जिसे जाँचा जा सके।",
            "steps": ["असली सरकारी सूचना के लिए सीधे आधिकारिक वेबसाइट देखें।"]
        }
        check.status = "DONE"
        check.finished_at = datetime.utcnow()
        db.commit()
        await emit_event(check_id, "done", {"verdict": Verdict.UNVERIFIABLE.value, "result_url": f"/v1/checks/{check_id}"})
        return check

    primary_claim = extracted_claims[0]
    claim_fields_dict = primary_claim.get("fields", {})
    claim_field_keys = list(claim_fields_dict.keys())

    # -------------------------------------------------------------
    # STAGE 3: RETRIEVED & FORENSICS (Parallel)
    # -------------------------------------------------------------
    t_ret_start = time.time()
    best_doc, top_chunks, ret_conf, provs = retrieve_relevant_evidence(
        claim_text=primary_claim.get("claim_text", norm_text),
        claim_data=primary_claim,
        db=db
    )
    t_ret = int((time.time() - t_ret_start) * 1000)
    timings["retrieve"] = t_ret

    searched_srcs = ["PIB (Press Information Bureau)", "e-Gazette of India", "myScheme Portal"]
    check.searched_sources = searched_srcs
    await emit_event(check_id, "stage", {
        "stage": "RETRIEVED",
        "status": "done",
        "duration_ms": t_ret,
        "note": f"Found {len(top_chunks)} passages from {1 if best_doc else 0} documents (confidence: {ret_conf:.2f})"
    })

    # Forensics
    t_for_start = time.time()
    engine_signals: list[EngineSignal] = []

    # 1. Links
    all_links = list(primary_claim.get("links", []))
    # Also find any domains in claim text
    found_urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+|[^\s<>"/]+\.(?:in|com|org|net|xyz|top|site|icu|cfd|gov\.in|nic\.in)[/\w\-\.]*', primary_claim.get("claim_text", ""), re.IGNORECASE | re.UNICODE)
    for u in found_urls:
        if u not in all_links:
            all_links.append(u)
    if url and url not in all_links:
        all_links.append(url)

    for lk in all_links:
        for s in analyze_link(lk):
            engine_signals.append(s)
            sig_model = CheckSignal(
                check_id=check.id,
                signal_id=s.signal_id,
                grp=s.group,
                severity=s.severity,
                score=s.score,
                evidence=s.evidence if hasattr(s, "evidence") else {},
                explanation=s.explanation
            )
            db.add(sig_model)
            await emit_event(check_id, "signal", {
                "signal_id": s.signal_id,
                "severity": s.severity,
                "explanation": s.explanation
            })

    # 2. Identifiers / Fees / Implausible dates
    for s in analyze_identifiers(primary_claim.get("claim_text", norm_text), claim_fields_dict, provs):
        engine_signals.append(s)
        sig_model = CheckSignal(
            check_id=check.id,
            signal_id=s.signal_id,
            grp=s.group,
            severity=s.severity,
            score=s.score,
            evidence=s.evidence if hasattr(s, "evidence") else {},
            explanation=s.explanation
        )
        db.add(sig_model)
        await emit_event(check_id, "signal", {
            "signal_id": s.signal_id,
            "severity": s.severity,
            "explanation": s.explanation
        })

    # 3. Provenance (debunk check)
    debunks = [
        {"id": d.id, "claim_text": d.claim_text, "verdict_text": d.verdict_text, "published_on": d.published_on.isoformat() if d.published_on else ""}
        for d in db.query(Debunk).all()
    ]
    debunk_score, matched_debunk, d_signals = check_debunk_match(primary_claim.get("claim_text", norm_text), debunks)
    for s in d_signals:
        engine_signals.append(s)
        sig_model = CheckSignal(
            check_id=check.id,
            signal_id=s.signal_id,
            grp=s.group,
            severity=s.severity,
            score=s.score,
            evidence=s.evidence if hasattr(s, "evidence") else {},
            explanation=s.explanation
        )
        db.add(sig_model)
        await emit_event(check_id, "signal", {
            "signal_id": s.signal_id,
            "severity": s.severity,
            "explanation": s.explanation
        })

    db.commit()
    t_for = int((time.time() - t_for_start) * 1000)
    timings["forensics"] = t_for
    await emit_event(check_id, "stage", {
        "stage": "FORENSICS",
        "status": "done",
        "duration_ms": t_for,
        "note": f"Evaluated forensic signals ({len(engine_signals)} found)"
    })

    # -------------------------------------------------------------
    # STAGE 4: COMPARED
    # -------------------------------------------------------------
    t0 = time.time()
    field_comparison_res = {}
    same_scheme_bool = False
    evidence_items = []
    diff_items = []

    if best_doc and top_chunks:
        chunks_passage = "\n".join([
            f"<official_passage id='{c.id}' doc='{best_doc.title}' clause='{c.clause_ref or ''}'>{c.text}</official_passage>"
            for c in top_chunks
        ])
        comp_output = llm.json(
            system=COMPARISON_SYSTEM_PROMPT,
            user=f"<claim>{primary_claim}</claim>\n{chunks_passage}",
            schema={"type": "object"}
        )
        same_scheme_bool = comp_output.get("same_scheme") == "true"
        raw_fields = comp_output.get("fields", {})

        for f_key, f_val in raw_fields.items():
            comp_type = f_val.get("comparison", "not_stated")
            quote_text = f_val.get("quote") or ""
            target_chunk = next((c for c in top_chunks if c.id == f_val.get("chunk_id")), top_chunks[0])

            # Zero-hallucination quote validator check
            valid = validate_quote(quote_text, target_chunk.text) if quote_text else False
            if not valid and comp_type != "not_stated":
                # Drop unsupported citation
                comp_type = "not_stated"

            field_comparison_res[f_key] = comp_type

            # Record evidence
            ev_model = CheckEvidence(
                check_id=check.id,
                document_id=best_doc.id,
                chunk_id=target_chunk.id,
                field=f_key,
                comparison=comp_type,
                claim_value=f_val.get("claim_value"),
                official_value=f_val.get("official_value"),
                quote=quote_text,
                quote_valid=valid
            )
            db.add(ev_model)
            evidence_items.append({
                "document": {"id": best_doc.id, "title": best_doc.title, "url": best_doc.url, "source": best_doc.source_id, "doc_number": best_doc.doc_number},
                "chunk": {"id": target_chunk.id, "clause_ref": target_chunk.clause_ref, "text": target_chunk.text},
                "field": f_key,
                "comparison": comp_type,
                "claim_value": f_val.get("claim_value"),
                "official_value": f_val.get("official_value"),
                "quote": quote_text,
                "quote_valid": valid
            })

            if comp_type == "mismatch":
                diff_items.append({
                    "field": f_key,
                    "claim": f_val.get("claim_value", "Claimed"),
                    "official": f_val.get("official_value", "Official"),
                    "quote": quote_text,
                    "document_id": best_doc.id,
                    "clause_ref": target_chunk.clause_ref
                })

    db.commit()
    t_comp = int((time.time() - t0) * 1000)
    timings["compare"] = t_comp
    await emit_event(check_id, "stage", {
        "stage": "COMPARED",
        "status": "done",
        "duration_ms": t_comp,
        "note": f"Field comparisons completed ({len(diff_items)} diffs detected)"
    })

    # -------------------------------------------------------------
    # STAGE 5: LINEAGE
    # -------------------------------------------------------------
    t0 = time.time()
    lineage_obj, lineage_dict = resolve_lineage(best_doc, db)
    check.lineage = lineage_dict
    db.commit()

    t_lin = int((time.time() - t0) * 1000)
    timings["lineage"] = t_lin
    await emit_event(check_id, "stage", {
        "stage": "LINEAGE",
        "status": "done",
        "duration_ms": t_lin,
        "note": f"Lineage traced: {'Superseded / Expired' if lineage_obj.superseded_by or lineage_obj.expired else 'Current version active'}"
    })

    # -------------------------------------------------------------
    # STAGE 6: DECIDED (Deterministic Verdict Engine)
    # -------------------------------------------------------------
    t0 = time.time()
    best_match_obj = None
    if best_doc:
        best_match_obj = Match(
            doc_id=best_doc.id,
            same_scheme=same_scheme_bool,
            comparison=field_comparison_res
        )

    decision_ctx = Ctx(
        claim_fields=claim_field_keys,
        signals=engine_signals,
        debunk_score=debunk_score,
        best_match=best_match_obj,
        retrieval_conf=ret_conf,
        lineage=lineage_obj
    )

    decision = decide(decision_ctx, settings.get_thresholds())

    check.verdict = decision.verdict.value
    check.reasons = [{"code": decision.reason, "detail": decision.detail}]
    check.warnings = decision.warnings
    check.diffs = diff_items

    # Compute confidence
    confidence_val = 0.85
    if decision.verdict == Verdict.CONFIRMED:
        confidence_val = min(0.96, ret_conf * 0.9 + 0.1)
    elif decision.verdict == Verdict.FORGED:
        confidence_val = 0.98 if debunk_score >= 0.85 else 0.92
    elif decision.verdict == Verdict.ALTERED:
        confidence_val = 0.88
    elif decision.verdict == Verdict.UNVERIFIABLE:
        confidence_val = 0.40

    check.confidence = round(confidence_val, 2)
    check.confidence_band = "High" if confidence_val >= 0.75 else ("Medium" if confidence_val >= 0.5 else "Low")
    db.commit()

    t_dec = int((time.time() - t0) * 1000)
    timings["decide"] = t_dec
    await emit_event(check_id, "stage", {
        "stage": "DECIDED",
        "status": "done",
        "duration_ms": t_dec,
        "note": f"Verdict decided: {decision.verdict.value} ({decision.reason})"
    })

    # -------------------------------------------------------------
    # STAGE 7: EXPLAINED
    # -------------------------------------------------------------
    t0 = time.time()
    verdict_facts = {
        "verdict": decision.verdict.value,
        "reasons": decision.reason,
        "diffs": diff_items,
        "top_citation": {
            "title": best_doc.title if best_doc else None,
            "date": best_doc.published_on.isoformat() if (best_doc and best_doc.published_on) else None,
            "clause": top_chunks[0].clause_ref if top_chunks else None
        },
        "warnings": decision.warnings,
        "official_links": [best_doc.url] if best_doc else []
    }

    explanation_res = llm.json(
        system=EXPLANATION_SYSTEM_PROMPT.replace("{reply_lang}", actual_reply_lang),
        user=f"<verdict_facts>{verdict_facts}</verdict_facts>",
        schema={"type": "object"}
    )
    explanation_res["lang"] = actual_reply_lang
    explanation_res["audio_url"] = f"/v1/checks/{check.id}/audio?lang={actual_reply_lang}"

    check.explanation = explanation_res
    db.commit()

    t_exp = int((time.time() - t0) * 1000)
    timings["explain"] = t_exp
    await emit_event(check_id, "stage", {
        "stage": "EXPLAINED",
        "status": "done",
        "duration_ms": t_exp,
        "note": "Generated plain explanation and action steps"
    })

    # -------------------------------------------------------------
    # STAGE 8: RENDERED (Verified Card)
    # -------------------------------------------------------------
    t0 = time.time()
    claim_summary = primary_claim.get("claim_text", "")
    if diff_items:
        claim_summary = f"{diff_items[0]['field']}: {diff_items[0]['claim']}"
        off_summary = f"{diff_items[0]['field']}: {diff_items[0]['official']}"
    elif decision.verdict == Verdict.FORGED:
        claim_summary = primary_claim.get("claim_text", "Fake circular / payment link")
        off_summary = "आधिकारिक पोर्टल पर यह योजना पूर्णतः निःशुल्क है।"
    else:
        off_summary = best_doc.title if best_doc else "Government of India Official Records"

    citation_str = f"{best_doc.source_id.upper() if best_doc else 'Official Record'}: {best_doc.title if best_doc else 'Gov Record'}, {top_chunks[0].clause_ref if top_chunks else 'Clause 1'}"

    card_bytes = generate_verified_card(
        public_id=check.public_id,
        verdict=decision.verdict,
        claim_summary=claim_summary,
        official_summary=off_summary,
        citation=citation_str,
        warnings=decision.warnings,
        size="square"
    )

    card_dir = settings.STORAGE_DIR / "cards"
    card_dir.mkdir(parents=True, exist_ok=True)
    card_path = card_dir / f"{check.public_id}.png"
    with open(card_path, "wb") as f:
        f.write(card_bytes)

    check.artifact_path = str(card_path)
    check.status = "DONE"
    check.finished_at = datetime.utcnow()

    timings["render"] = int((time.time() - t0) * 1000)
    timings["total"] = int((time.time() - total_start) * 1000)
    check.timings_ms = timings
    db.commit()

    await emit_event(check_id, "done", {
        "verdict": decision.verdict.value,
        "result_url": f"/v1/checks/{check.id}",
        "card_url": f"/v1/checks/{check.id}/card.png"
    })

    return check
