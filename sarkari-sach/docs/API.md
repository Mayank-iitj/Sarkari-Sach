# API: Sarkari Sach v1

Base URL: `/v1` · JSON unless noted · UTC ISO-8601 timestamps · Auto-generated OpenAPI at `/docs`.

## Conventions
- **Auth:** none for demo; optional `X-API-Key` for journalist/batch endpoints.
- **Rate limit:** 20 requests/min/IP (`429` with `Retry-After`).
- **IDs:** `id` (UUID, internal) and `public_id` (8-char base32, used in URLs).
- **Errors:** RFC 7807-like

```json
{ "error": { "code": "unsupported_media_type", "message": "Only jpg, png, webp, pdf, mp3, ogg, wav, m4a", "trace_id": "01HX..." } }
```

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_input` | 400 | Missing/empty input |
| `file_too_large` | 413 | Exceeds size limit |
| `unsupported_media_type` | 415 | Sniffed MIME not allowed |
| `blocked_url` | 422 | SSRF guard rejected URL |
| `not_found` | 404 | Unknown id |
| `rate_limited` | 429 | Too many requests |
| `pipeline_failed` | 500 | Unrecoverable stage failure (check has `failed_stage`) |

---

## 1. Create a check
`POST /v1/checks` · `multipart/form-data` or `application/json`

| Field | Type | Notes |
|---|---|---|
| `text` | string | Optional; forwarded message text |
| `url` | string | Optional; link to verify |
| `file` | file | Optional; image/pdf/audio (one file) |
| `reply_lang` | string | `auto` (default), `hi`, `en`, `ta`, `bn` |
| `keep_artifact` | bool | Default false (deleted after 24 h) |

At least one of `text`, `url`, `file` required.

**202 Accepted**
```json
{
  "id": "5f1c...-uuid",
  "public_id": "K7QX2M9A",
  "status": "RECEIVED",
  "events_url": "/v1/checks/5f1c.../events",
  "result_url": "/v1/checks/5f1c...",
  "audit_url": "https://sarkari-sach.example/c/K7QX2M9A"
}
```
Idempotent: identical input + corpus snapshot + prompt version returns the existing completed check (`200`).

## 2. Stream progress (SSE)
`GET /v1/checks/{id}/events` · `text/event-stream`

```
event: stage
data: {"stage":"NORMALIZED","status":"done","duration_ms":1840,"note":"Read 142 words, Hindi"}

event: stage
data: {"stage":"RETRIEVED","status":"done","duration_ms":930,"note":"8 official passages from 3 documents"}

event: signal
data: {"signal_id":"LINK_LOOKALIKE","severity":"hard","explanation":"pm-kisan-yojana.in imitates pmkisan.gov.in"}

event: done
data: {"verdict":"FORGED","result_url":"/v1/checks/5f1c..."}
```
Event types: `stage`, `signal`, `partial` (extracted claim preview), `done`, `error`. Heartbeat comment every 15 s.

## 3. Get result
`GET /v1/checks/{id}` (id or `public_id`)

**200**
```json
{
  "id": "5f1c...",
  "public_id": "K7QX2M9A",
  "status": "DONE",
  "verdict": "ALTERED",
  "confidence": 0.82,
  "confidence_band": "High",
  "input": { "type": "image", "lang_detected": "hi", "extracted_text": "…" },
  "claims": [{
    "claim_text": "...",
    "scheme_name": "PM-KISAN",
    "issuer_claimed": "Ministry of Agriculture",
    "fields": {
      "amount": { "value": "₹12,000/year", "norm": {"num": 12000, "unit": "INR/year"}, "confidence": 0.93 },
      "deadline": { "value": "15 Nov 2026", "norm": {"date": "2026-11-15"}, "confidence": 0.88 },
      "fee": { "value": "₹250 processing fee", "confidence": 0.9 }
    },
    "links": ["https://pmkisan-yojana.in/apply"]
  }],
  "reasons": [
    { "code": "FIELD_MISMATCH", "field": "amount", "claim": "₹12,000", "official": "₹6,000" }
  ],
  "diffs": [
    { "field": "amount", "claim": "₹12,000/year", "official": "₹6,000/year",
      "quote": "…financial benefit of ₹6,000 per year…", "document_id": "d1…", "clause_ref": "Para 2.1" }
  ],
  "evidence": [
    { "document": { "id": "d1…", "title": "…", "issuer": "…", "doc_number": "…", "published_on": "2019-02-24",
        "url": "https://…gov.in/…", "source": "pib" },
      "chunk": { "id": "c9…", "clause_ref": "Para 2.1", "text": "…" },
      "field": "amount", "comparison": "mismatch", "quote_valid": true }
  ],
  "lineage": {
    "scheme_id": "pm-kisan",
    "timeline": [
      { "date": "2019-02-24", "document_id": "d1…", "title": "…", "change": "Scheme launched", "relation": null },
      { "date": "2021-08-10", "document_id": "d7…", "title": "…", "change": "Guidelines revised", "relation": "amends" }
    ],
    "current_document_id": "d7…",
    "superseded": false
  },
  "signals": [
    { "signal_id": "LINK_LOOKALIKE", "group": "LINK", "severity": "hard", "score": 0.97,
      "explanation": "…", "evidence": { "official": "pmkisan.gov.in", "candidate": "pmkisan-yojana.in", "edit_distance": 7 } },
    { "signal_id": "FEE_CONTRADICTION", "group": "IDENTIFIER", "severity": "hard", "score": 1.0, "explanation": "Official guidelines state no fee" }
  ],
  "warnings": ["Do not enter Aadhaar/bank details on this link."],
  "explanation": {
    "lang": "hi",
    "short": "यह संदेश असली सूचना से अलग है…",
    "steps": ["लिंक पर क्लिक न करें", "pmkisan.gov.in पर जाँचें"],
    "audio_url": "/v1/checks/5f1c.../audio?lang=hi"
  },
  "provenance": { "corpus_snapshot": "2026-10-29a", "prompt_version": "p1.3", "model_id": "claude-sonnet-5-5" },
  "timings_ms": { "normalize": 1840, "extract": 1200, "retrieve": 930, "forensics": 2100, "compare": 2400, "total": 9100 },
  "card_url": "/v1/checks/5f1c.../card.png",
  "created_at": "2026-10-31T10:12:00Z",
  "finished_at": "2026-10-31T10:12:09Z"
}
```
For `UNVERIFIABLE`, `reasons[].code` ∈ `NO_OFFICIAL_SOURCE | LOW_RETRIEVAL_CONFIDENCE | PARTIAL_MATCH | UNCLEAR_INPUT | SOURCES_CONFLICT | SYSTEM_ERROR`, and `searched_sources[]` lists where we looked.

## 4. Card image
`GET /v1/checks/{id}/card.png?size=square|og` → `image/png` (1080×1080 or 1200×630).

## 5. Audio reply
`GET /v1/checks/{id}/audio?lang=hi` → `audio/mpeg`.

## 6. Re-explain in another language
`POST /v1/checks/{id}/explain` `{ "lang": "ta" }` → `{ "lang":"ta","short":"…","steps":[…],"audio_url":"…" }`
Regenerated from stored verdict + evidence only (no new retrieval).

## 7. Documents & lineage
- `GET /v1/documents/{id}` → metadata + full text + `chunks[]`.
- `GET /v1/documents/{id}/text?highlight=<chunk_id>` → text with highlight offsets.
- `GET /v1/schemes?q=pm kisan` → scheme search.
- `GET /v1/schemes/{scheme_id}/lineage` → ordered versions with provisions and diffs.

## 8. Sources & corpus status
`GET /v1/sources`
```json
{ "snapshot": "2026-10-29a", "sources": [
  { "id": "pib", "name": "Press Information Bureau", "documents": 4210, "last_fetched": "2026-10-29T08:00:00Z", "domains": ["pib.gov.in"] }
]}
```

## 9. Evaluation
- `GET /v1/eval/latest` → latest report JSON (metrics, confusion matrix, per-class P/R, abstention, latency, test-set size, snapshot, commit).
- `GET /v1/eval/cases?verdict=FORGED&correct=false` → per-case outcomes (for the eval page).

## 10. Feedback
`POST /v1/checks/{id}/feedback` `{ "kind": "wrong_verdict|helpful|report_abuse", "note": "…" }` → `201`.

## 11. Batch (journalists, optional)
`POST /v1/batch` (`X-API-Key`) with `items: [{text|url}]` ≤ 20 → `{ "batch_id": "…", "check_ids": ["…"] }`; `GET /v1/batch/{id}` aggregate status.

## 12. WhatsApp webhook (P1)
`POST /v1/whatsapp/webhook` (Twilio `application/x-www-form-urlencoded`, signature validated via `X-Twilio-Signature`).
Behavior: incoming text/media → create check → reply with short verdict text + card image + audio. Replies `हिंदी`/`English` toggle language.

## 13. Health & metrics
- `GET /v1/health` → `{ "status":"ok","db":true,"redis":true,"llm":true,"corpus_snapshot":"…" }`
- `GET /metrics` → Prometheus.

## 14. Pydantic schema skeletons
```python
class Verdict(str, Enum):
    CONFIRMED="CONFIRMED"; OUTDATED="OUTDATED"; ALTERED="ALTERED"; UNVERIFIABLE="UNVERIFIABLE"; FORGED="FORGED"

class Signal(BaseModel):
    signal_id: str
    group: Literal["LINK","DOCUMENT","IDENTIFIER","PROVENANCE"]
    severity: Literal["hard","soft","info"]
    score: float = Field(ge=0, le=1)
    explanation: str
    evidence: dict = {}

class FieldValue(BaseModel):
    value: str
    norm: dict | None = None
    confidence: float
    span: tuple[int,int] | None = None

class Claim(BaseModel):
    claim_text: str
    scheme_name: str | None
    issuer_claimed: str | None
    fields: dict[str, FieldValue]
    links: list[str] = []
    phone_numbers: list[str] = []
    doc_identifiers: list[str] = []

class Evidence(BaseModel):
    document_id: UUID; chunk_id: UUID; field: str
    comparison: Literal["match","mismatch","not_stated"]
    claim_value: str | None; official_value: str | None
    quote: str; quote_valid: bool
```

## 15. Example curl
```bash
curl -F "file=@fake_scheme.jpg" -F "reply_lang=auto" http://localhost:8000/v1/checks
curl -N http://localhost:8000/v1/checks/$ID/events
curl http://localhost:8000/v1/checks/$ID | jq .verdict
```
