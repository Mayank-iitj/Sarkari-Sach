# CORPUS & LINEAGE: Sarkari Sach

The corpus is the product. Small, clean, official, and versioned beats large and noisy.

> **Caveat:** portal URLs, layouts, and access rules below are from general knowledge and were not live-verified. Phase 0 of BUILD_PLAN is a feasibility spike for each. Treat every URL pattern as "to be confirmed".

## 1. Source allowlist

| Source id | Domain(s) | What it gives | Priority |
|---|---|---|---|
| `pib` | `pib.gov.in` | Press releases, scheme announcements, **PIB Fact Check debunks** | P0 |
| `gazette` | `egazette.gov.in`, `egazette.nic.in` | Statutory notifications (G.S.R., S.O.) | P0 |
| `myscheme` | `myscheme.gov.in` | Scheme benefit, eligibility, documents required, "how to apply" | P0 |
| `indiacode` | `indiacode.nic.in` | Acts and rules (reference) | P1 |
| `rbi` | `rbi.org.in` | Circulars/notifications (banking/KYC/FASTag-adjacent claims) | P1 |
| `sebi` | `sebi.gov.in` | Circulars | P2 |
| `gst` | `gst.gov.in`, `cbic.gov.in`, `incometax.gov.in` | Compliance notices (for MSME depth domain) | P1 if MSME focus |
| `scheme-portal` | e.g. `pmkisan.gov.in`, `scholarships.gov.in` | Authoritative scheme-specific pages | P1 |

Anything outside `*.gov.in`, `*.nic.in`, and explicit exceptions in `official_domains` is **never** treated as evidence (may be analyzed as a suspect artifact).

## 2. Fallbacks if a source blocks you

| Problem | Fallback |
|---|---|
| Gazette search is captcha-gated/slow | Use PIB + ministry sites' "Notifications" pages; manually curate 30-60 Gazette PDFs relevant to demo schemes, store in `corpus/manual/` with provenance metadata |
| myScheme hard to scrape | Use scheme-specific portal + PIB; or hand-curate 15 scheme pages as saved HTML |
| Foreign IP blocked | Run ingest from Indian VM/hotspot; ship snapshot tarball |
| PIB Fact Check not machine-friendly | Scrape listing page + individual release pages; fall back to manually exporting 40-60 items to `eval/data/pib_factcheck.jsonl` |

Always keep a **manual provenance field** (`ingest_method: manual|scraped`, `retrieved_by`, `retrieved_at`, `url`) so honesty about curation is visible.

## 3. Ingestion pipeline

```
Adapter.list() → Adapter.fetch() → store raw → parse → normalize → dedupe → chunk → embed → extract provisions → build relations → snapshot
```

### 3.1 Adapter interface
```python
class SourceAdapter(Protocol):
    source_id: str
    def discover(self, since: date) -> Iterable[DocRef]: ...
    def fetch(self, ref: DocRef) -> RawDoc: ...         # bytes + headers + final_url
    def parse(self, raw: RawDoc) -> ParsedDoc: ...      # title, issuer, doc_number, dates, text, doc_type
```
Rules: robots.txt respected; ≤1 req/s/host; UA `SarkariSachBot/1.0 (+contact-email)`; conditional GET (ETag/Last-Modified); retries w/ backoff; raw cached under `data/raw/{source}/{hash}`.

### 3.2 Parsing
- HTML: `selectolax`, strip nav/footer, keep headings/lists.
- PDF: `pdfplumber` text; if sparse → `pdf2image` + OCR (`hin+eng`). Bilingual Gazette PDFs: keep both language columns, tag chunk `lang`.
- Normalize: NFC Unicode, Devanagari digits → ASCII for matching copy (keep original in `text`), unify rupee notations (`Rs.`, `₹`, `रु.`), collapse whitespace.
- Extract `doc_number` with patterns:
  - `G\.S\.R\.\s*\d+\s*\(E\)` · `S\.O\.\s*\d+\s*\(E\)` · `F\.\s*No\.\s*[\w\-\/\(\)\. ]+` · `No\.\s*[\w\-\/]+\/\d{4}`
- Extract `published_on`, `effective_from`, deadline phrases ("till", "up to", "on or before", "तक", "अंतिम तिथि").

### 3.3 Chunking
Clause-aware splitter: split on headings, numbered clauses (`^\(?\d+(\.\d+)*[\)\.]`), `(a)`, `(i)`; merge tiny pieces to 200-400 tokens; keep `clause_ref`. Never split inside a table row; tables become `key: value` lines.

### 3.4 Provision extraction (structured facts)
LLM pass per chunk of scheme/notification docs (cached, batch) → `provisions(field, value, value_norm, quote, effective_*)`. Validator: `quote` must be a substring of chunk text, else drop. Fields: `amount, deadline, eligibility, fee, benefit, documents_required, mode_of_application`.
Used for: fast field comparison, lineage diffs, and "what changed" timeline.

### 3.5 Snapshots
`snapshot_id = YYYY-MM-DD + letter`. Every document row stamped. A check stores the snapshot it ran against. `make snapshot` dumps `pg_dump` + `data/raw` tarball → reproducible demo, offline restore.

## 4. Lineage model

### 4.1 Relation extraction
1. **Regex pass** over text for cues: `in supersession of`, `in partial modification of`, `in continuation of`, `rescinds`, `vide notification No.`, `corrigendum`, `extension of`, Hindi: `के अधिक्रमण में`, `में संशोधन`, `निरस्त`.
2. Resolve referenced identifier to a `documents.doc_number` in the corpus (exact, then trigram).
3. **LLM relation checker** on unresolved/ambiguous candidates (same issuer, ±24 months, shared scheme name): returns `{relation, evidence_quote}`; quote validated by substring.
4. Insert into `doc_relations`. Manual overrides in `corpus/manual/relations.yaml` (for demo-critical chains, hand-verify 5-10 chains).

### 4.2 Scheme grouping
`schemes` table seeded from myScheme/PIB titles + aliases (Hindi/English names, acronyms, popular misspellings). Docs linked via title/alias match and LLM tagging.

### 4.3 Querying lineage
```sql
WITH RECURSIVE chain AS (
  SELECT dst_doc AS id, relation, 1 AS depth
  FROM doc_relations WHERE src_doc = :matched_doc_id   -- relation means src modifies dst; adapt direction
  UNION ALL
  SELECT r.dst_doc, r.relation, c.depth+1
  FROM doc_relations r JOIN chain c ON r.src_doc = c.id WHERE c.depth < 10
)
SELECT d.* FROM chain c JOIN documents d ON d.id = c.id ORDER BY d.published_on DESC;
```
(Define direction clearly in code: `src` = the *newer* document acting on `dst` = the *older* one. To find successors of X, select rows where `dst_doc = X`.)

### 4.4 Current-vs-claimed logic
- `superseded` if any successor with relation ∈ {supersedes, rescinds}.
- `expired` if `effective_to < today` or claimed deadline < today and official deadline equals it.
- `amended` (not superseded) shows a timeline but does not alone trigger `OUTDATED` unless amended provision differs from claim.

## 5. Debunk corpus (PIB Fact Check)
- Parse each debunk into `{claim_text, verdict_text, published_on, url}`.
- Embed `claim_text`. At check time: nearest neighbors with score ≥0.85 + fuzzy token overlap ≥0.6 on entities (scheme/amount/date) → `PROVENANCE` hard signal and `debunk_match`.
- Split: **dev debunks** (used for retrieval index and tuning) vs. **held-out test debunks** (excluded from the index at eval time; see EVALUATION.md). This avoids leakage.

## 6. Demo-critical seed set (curate by hand, 10-15 schemes)
Pick schemes where (a) an official document with clear numbers exists, and (b) a viral fake or changed rule has been documented. For each: the official doc(s) cached, 1 real forward screenshot or faithful recreation (label as recreation), verified lineage chain, Hindi name + aliases. Keep a table in `corpus/seed.md`:

| scheme | official docs | known fake/variant | lineage verified | notes |
|---|---|---|---|---|

## 7. Corpus health checks (run in CI and before demo)
- Doc count per source and last_fetched.
- % chunks with embeddings = 100%.
- % documents with `published_on` ≥ 95%.
- Lineage chains for seed schemes resolve to expected "current" doc.
- Random sample of 20 provisions: quote ⊂ chunk text = 100%.

## 8. Legal & ethical notes
Public government documents; respect `robots.txt`/ToS; low request rate; store only for verification; link back to original; do not mirror at scale. Government-works reuse terms vary by portal. Check each site's terms and cite sources prominently.
