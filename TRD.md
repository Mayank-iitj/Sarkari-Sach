# TRD: Sarkari Sach

Version 1.0

---

## 1. Technical objectives
1. Deterministic, auditable verdicts. The LLM *extracts* and *compares*; a rule-based **Verdict Engine** *decides*.
2. Every claim in the output is traceable to an official document span.
3. Works offline from a pre-ingested corpus (no live dependency on government sites at demo time).
4. Fast enough for chat UX (streaming progress).

## 2. Functional requirements

### 2.1 Ingestion (input normalization)
| ID | Requirement |
|---|---|
| TR-I1 | Accept: `text`, `image` (jpg/png/webp ≤10 MB), `pdf` (≤15 MB, ≤30 pages), `url`, `audio` (ogg/mp3/wav/m4a ≤5 MB, ≤90 s) |
| TR-I2 | Image → OCR via vision LLM primary; Tesseract (`hin+eng+tam`) as cross-check; store both |
| TR-I3 | PDF → text layer via `pdfplumber`; if no text layer, rasterize and OCR |
| TR-I4 | Audio → ASR (Whisper large-v3 / faster-whisper) with language ID; return transcript + detected language |
| TR-I5 | URL → fetch through hardened fetcher (see SECURITY_ETHICS), capture final URL, redirect chain, headers, rendered text |
| TR-I6 | Persist original artifact hash (SHA-256) and discard raw bytes after TTL (default 24 h) unless user opts to keep |
| TR-I7 | Detect language (fastText `lid.176` or `langdetect`) for reply language |

### 2.2 Claim extraction
| ID | Requirement |
|---|---|
| TR-C1 | LLM extracts 1-5 claims as strict JSON (schema in PROMPTS.md) |
| TR-C2 | Fields: `scheme_name`, `issuer_claimed`, `benefit`, `amount`, `currency`, `deadline`, `eligibility[]`, `fee_demanded`, `links[]`, `phone_numbers[]`, `doc_identifiers[]` (file no., G.S.R./S.O. number, date), `claim_text` |
| TR-C3 | Normalize numbers (₹ lakh/crore, Devanagari digits), dates (DD/MM/YYYY, Hindi month names) before comparison |
| TR-C4 | Each field carries `confidence` and `source_span` (char offsets in normalized text) |
| TR-C5 | If extraction confidence < 0.4 on all key fields → `UNVERIFIABLE` early exit with "unclear input" reason |

### 2.3 Retrieval
| ID | Requirement |
|---|---|
| TR-R1 | Corpus restricted to allowlisted official domains (see CORPUS_AND_LINEAGE.md) |
| TR-R2 | Hybrid search: Postgres FTS (BM25-like `ts_rank_cd`) + pgvector cosine over multilingual embeddings; fuse with Reciprocal Rank Fusion (k=60) |
| TR-R3 | Pre-filter by metadata when extractable (issuer, date window, doc type) |
| TR-R4 | Chunking: clause-aware (split on numbered clauses/headings), 200-400 tokens, 15% overlap, parent doc id kept |
| TR-R5 | Return top-8 chunks + parent doc metadata; rerank top-20 → 8 with a cross-encoder (`bge-reranker-v2-m3`) if latency budget allows |
| TR-R6 | Retrieval confidence = f(top score, margin, field coverage); below threshold → `UNVERIFIABLE` |
| TR-R7 | Identifier shortcut: exact match on G.S.R./S.O./F.No. bypasses semantic search |

### 2.4 Verification (claim vs. source)
| ID | Requirement |
|---|---|
| TR-V1 | For each claim × top docs, LLM performs **field-wise comparison** returning per-field `match | mismatch | not_stated` with a verbatim quote from the chunk |
| TR-V2 | **Citation validator**: every quote must be a normalized substring of the retrieved chunk text; failing items are dropped; if remaining evidence is insufficient → abstain |
| TR-V3 | Supersession check: query lineage graph for later docs that amend/supersede/rescind the matched doc, and for expiry dates |
| TR-V4 | Verdict Engine (§4) computes the verdict from structured inputs only |
| TR-V5 | LLM writes the human explanation **after** the verdict, constrained to cited facts |

### 2.5 Forensics
Described in FORENSICS.md. Requirements:
| ID | Requirement |
|---|---|
| TR-F1 | Link analysis: TLD/allowlist, punycode/homoglyph, edit distance to official domains, redirect chain, URL shorteners, WHOIS age flag, TLS cert subject/issuer, path/keyword heuristics |
| TR-F2 | PDF analysis: metadata (Producer/Creator/dates), fonts, incremental updates, embedded images, JS, XMP anomalies |
| TR-F3 | Image analysis: EXIF presence/tool markers, ELA (weak signal), letterhead perceptual-hash similarity, text-overlay inconsistency |
| TR-F4 | Identifier validation: file-number & date format against learned official patterns; weekday/holiday plausibility; future-dated checks |
| TR-F5 | QR decode (`pyzbar`/OpenCV); QR target passes through link analysis |
| TR-F6 | Each signal emits `{id, severity: hard|soft|info, score, evidence, explanation}`; no opaque ML score |
| TR-F7 | Provenance: match claim against official debunk corpus (PIB Fact Check) via semantic + fuzzy match |

### 2.6 Output generation
| ID | Requirement |
|---|---|
| TR-O1 | Reply text in detected language (Hindi/English v1), reading level ≤ grade 6 |
| TR-O2 | TTS audio (≤ 40 s) for reply |
| TR-O3 | Verified card PNG (1080×1080) rendered server-side (Playwright or Pillow + template) |
| TR-O4 | Audit page `/c/{id}` is public-by-link, immutable once finalized, contains signals + evidence + corpus snapshot id |
| TR-O5 | Export JSON evidence bundle |

## 3. Pipeline (state machine)

```
RECEIVED → NORMALIZED → EXTRACTED → [RETRIEVED ∥ FORENSICS] → COMPARED → DECIDED → EXPLAINED → RENDERED → DONE
                 ↘ (any stage) → FAILED | ABSTAINED
```
`RETRIEVED` and `FORENSICS` run in parallel. Each transition emits an SSE event.

## 4. Verdict Engine (deterministic)

Inputs:
- `claims[]` with fields
- `matches[]`: best official doc(s), per-field comparison, retrieval confidence
- `lineage`: later docs that supersede/amend, expiry
- `signals[]`: forensic signals (hard/soft)
- `debunk_match`: bool + doc

Decision order (first rule that fires wins):

```python
def decide(ctx) -> Verdict:
    hard = [s for s in ctx.signals if s.severity == "hard"]
    indep_groups = {s.group for s in hard}          # e.g. LINK, DOCUMENT, IDENTIFIER, PROVENANCE
    # 1. Official debunk match
    if ctx.debunk_match and ctx.debunk_match.score >= 0.85:
        return FORGED(reason="official_debunk", evidence=ctx.debunk_match)
    # 2. Two independent hard signals
    if len(indep_groups) >= 2:
        return FORGED(reason="multi_signal")
    # 3. Need official evidence for anything else
    m = ctx.best_match
    if m is None or ctx.retrieval_conf < T_RETRIEVE:   # T_RETRIEVE = 0.55
        return UNVERIFIABLE(flags=risk_flags(ctx))      # soft/hard signals become warnings
    cmp = m.field_comparison
    key_fields = [f for f in ("amount","deadline","eligibility","fee","benefit") if f in ctx.claim_fields]
    mism = [f for f in key_fields if cmp[f] == "mismatch"]
    # 4. Altered
    if mism and m.doc_is_same_scheme:
        return ALTERED(diffs=mism)
    # 5. Outdated
    if ctx.lineage.superseded_by or ctx.lineage.expired:
        return OUTDATED(old=m.doc, new=ctx.lineage.latest)
    # 6. Confirmed
    matched = [f for f in key_fields if cmp[f] == "match"]
    if len(matched) / max(1, len(key_fields)) >= 0.8 and not mism:
        return CONFIRMED(doc=m.doc)
    return UNVERIFIABLE(reason="partial_match")
```

Notes:
- A **fee demanded** for a scheme whose official doc says "free / no fee" is a hard `IDENTIFIER`-group signal ("fee_contradiction").
- Soft signals never change the verdict class; they appear as warnings and lower retrieval/verdict confidence.
- Thresholds are config in `config/thresholds.yaml` and tuned on the dev split, never on the test split.

### 4.1 Confidence
`confidence = 0.4*retrieval_conf + 0.3*field_match_ratio + 0.2*citation_validity + 0.1*(1 - conflict_ratio)`; displayed as Low/Medium/High (<0.5 / <0.75 / ≥0.75). UNVERIFIABLE shows no percentage.

## 5. Non-functional requirements

| Category | Requirement |
|---|---|
| Latency | p50 ≤10 s text, ≤20 s image/PDF; SSE first event ≤1 s |
| Throughput | 20 concurrent checks on a single 4-vCPU VM (demo) |
| Availability | Demo mode runs fully from local cache and local models/LLM fallback |
| Accuracy | Targets in PRD §9 |
| Determinism | Same input + same corpus snapshot → same verdict (temperature 0, fixed seeds, pinned prompts) |
| Reproducibility | Corpus snapshot id + prompt version + model id stored with every verdict |
| Privacy | No PII persisted by default; raw uploads auto-deleted ≤24 h; phone numbers hashed in logs |
| Security | SSRF-safe fetcher, upload type sniffing, size limits, rate limiting, no code execution on uploaded files |
| Accessibility | WCAG 2.1 AA; voice-first; low-bandwidth mode (<150 KB result page) |
| Observability | Structured logs, per-stage timings, trace id per check, `/metrics` Prometheus endpoint |
| i18n | UI strings in `locales/{en,hi}.json`; reply language independent from UI language |
| Testing | Unit (verdict engine, normalizers, validators), integration (pipeline on fixtures), eval harness (CI gate) |

## 6. Constraints & assumptions
- LLM provider is pluggable; temperature 0; JSON-schema-constrained outputs.
- Internet egress for scraping only in the ingest job; the API server uses cached data plus the hardened URL fetcher for user-submitted links.
- Government sites may rate-limit: respect `robots.txt`, ≤1 req/s per host, descriptive User-Agent with contact.

## 7. Definition of done (v1)
- [ ] All P0 features pass acceptance in PRD.
- [ ] `make eval` produces a report with numbers meeting targets (or honestly reports shortfalls).
- [ ] Demo script (DEMO_AND_PITCH.md) runs end-to-end with network disabled.
- [ ] Citation validator has 100% unit-test coverage.
- [ ] `FORGED` never emitted on the "genuine documents" control set.
