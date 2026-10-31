# SYSTEM DESIGN: Sarkari Sach

## 1. Architecture overview

```
                     ┌──────────────────────────────────────────────┐
  Citizen / WhatsApp │                  Next.js Web                 │
  / Journalist  ───► │  Chat UI · Result · Audit page · Eval page   │
                     └───────────────┬──────────────────────────────┘
                                     │ REST + SSE
                     ┌───────────────▼──────────────────────────────┐
                     │                FastAPI (api)                  │
                     │  auth/rate-limit · upload guard · SSE hub     │
                     └───────┬───────────────────────┬──────────────┘
                             │ enqueue               │ read
                     ┌───────▼────────┐      ┌───────▼───────────────┐
                     │  arq workers   │      │ Postgres 16           │
                     │  (pipeline)    │◄────►│ docs · chunks(vector) │
                     └──┬───┬───┬─────┘      │ lineage · checks ·    │
                        │   │   │            │ signals · debunks     │
          ┌─────────────┘   │   └──────────┐ └───────────────────────┘
          ▼                 ▼              ▼
   ┌────────────┐   ┌──────────────┐  ┌──────────────┐     ┌────────┐
   │ Ingest     │   │ Forensics    │  │ LLM client   │     │ Redis  │
   │ OCR/ASR/   │   │ link/pdf/img │  │ extract/     │     │ cache/ │
   │ fetch      │   │ /identifier  │  │ compare/     │     │ queue  │
   └────────────┘   └──────────────┘  │ explain      │     └────────┘
                                      └──────────────┘
   ┌───────────────────────────────────────────────────────────────┐
   │ Offline job: Corpus Ingest (scrape → parse → chunk → embed →  │
   │ lineage build → snapshot)  ── runs before demo, cron later     │
   └───────────────────────────────────────────────────────────────┘
```

## 2. Components

| Component | Responsibility | Key modules |
|---|---|---|
| `api` | HTTP, validation, rate limit, SSE, file guard | `routes/checks.py`, `sse.py`, `guards.py` |
| `pipeline` | Orchestrates stages; emits events | `pipeline/run.py`, `stages/*.py` |
| `ingest` | Normalize input to text + artifacts | `ocr.py`, `asr.py`, `pdf.py`, `fetcher.py` |
| `extract` | Claim extraction | `claims.py`, `normalize.py` |
| `retrieve` | Hybrid search + rerank + identifier shortcut | `search.py`, `rrf.py` |
| `compare` | Field-wise claim vs. doc comparison + citation validator | `compare.py`, `validator.py` |
| `lineage` | Supersession graph queries | `lineage.py` |
| `forensics` | Signals emitters | `link.py`, `pdfx.py`, `imgx.py`, `ident.py`, `provenance.py` |
| `verdict` | Deterministic decision engine | `engine.py`, `thresholds.yaml` |
| `explain` | Multilingual text + TTS | `explain.py`, `tts.py` |
| `render` | Verified card PNG | `card.py` + HTML template |
| `corpus` (offline) | Scrapers/adapters per source | `corpus/adapters/{pib,gazette,myscheme,rbi}.py` |
| `eval` | Harness | `eval/run.py`, `eval/data/*.jsonl` |

## 3. Request flow (one check)

1. `POST /v1/checks` stores `check` row (`RECEIVED`), saves artifact, enqueues job, returns `check_id` + SSE URL.
2. Worker: **Normalize** (OCR/ASR/PDF/URL) → text, language, artifact meta.
3. **Extract** claims (LLM, JSON schema) → normalize numbers/dates.
4. Parallel:
   - **Retrieve**: identifier shortcut → hybrid search → rerank → top-8 chunks.
   - **Forensics**: link analysis (+QR), PDF/image analysis, identifier validation, debunk match.
5. **Compare**: LLM field-wise comparison per claim vs. top docs; validator drops invalid quotes.
6. **Lineage**: for matched doc, fetch successors/expiry.
7. **Decide**: Verdict Engine → verdict + confidence + reasons.
8. **Explain**: reply text in user language (constrained to cited facts) → TTS.
9. **Render**: card PNG + audit page snapshot.
10. Mark `DONE`; SSE `done` event with result URL.

Every stage writes `check_events` (timestamp, stage, duration, payload summary) → SSE and audit trail.

## 4. Data model (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Official corpus -------------------------------------------------
CREATE TABLE sources (
  id TEXT PRIMARY KEY,                 -- 'pib','gazette','myscheme','rbi'
  name TEXT NOT NULL,
  base_domains TEXT[] NOT NULL,        -- allowlist
  trust_tier SMALLINT NOT NULL DEFAULT 1,
  robots_ok BOOLEAN DEFAULT TRUE
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT REFERENCES sources(id),
  external_id TEXT,                    -- PIB release id / Gazette no. / scheme slug
  doc_type TEXT NOT NULL,              -- 'notification','circular','press_release','scheme','factcheck','act'
  title TEXT NOT NULL,
  issuer TEXT,                         -- ministry/department
  doc_number TEXT,                     -- 'G.S.R. 123(E)', 'F.No. ...'
  published_on DATE,
  effective_from DATE,
  effective_to DATE,                   -- expiry/deadline if any
  language TEXT,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,          -- sha256 of normalized text
  raw_path TEXT,                       -- cached raw html/pdf
  text TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,           -- corpus snapshot label
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_id, external_id, content_hash)
);
CREATE INDEX docs_num_idx ON documents (doc_number);
CREATE INDEX docs_pub_idx ON documents (published_on);
CREATE INDEX docs_title_trgm ON documents USING gin (title gin_trgm_ops);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INT NOT NULL,
  clause_ref TEXT,                     -- '3(a)', 'Para 5'
  text TEXT NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED,
  embedding vector(1024)               -- bge-m3
);
CREATE INDEX chunks_tsv_idx ON chunks USING gin (tsv);
CREATE INDEX chunks_vec_idx ON chunks USING hnsw (embedding vector_cosine_ops);

-- Lineage ---------------------------------------------------------
CREATE TABLE schemes (
  id TEXT PRIMARY KEY,                 -- slug 'pm-kisan'
  name TEXT NOT NULL,
  name_aliases TEXT[] DEFAULT '{}',
  issuer TEXT
);

CREATE TABLE provisions (              -- structured facts extracted from docs
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id TEXT REFERENCES schemes(id),
  document_id UUID REFERENCES documents(id),
  chunk_id UUID REFERENCES chunks(id),
  field TEXT NOT NULL,                 -- 'amount','deadline','eligibility','fee','benefit'
  value TEXT NOT NULL,
  value_norm JSONB,                    -- normalized {num, unit} or {date}
  quote TEXT NOT NULL,                 -- verbatim span
  effective_from DATE,
  effective_to DATE
);

CREATE TABLE doc_relations (
  src_doc UUID REFERENCES documents(id),
  dst_doc UUID REFERENCES documents(id),
  relation TEXT CHECK (relation IN ('amends','supersedes','rescinds','corrigendum','extends')),
  evidence_quote TEXT,
  PRIMARY KEY (src_doc, dst_doc, relation)
);

-- Debunks (PIB Fact Check) ---------------------------------------
CREATE TABLE debunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  claim_text TEXT NOT NULL,
  verdict_text TEXT,
  published_on DATE,
  embedding vector(1024)
);

-- Domain intelligence --------------------------------------------
CREATE TABLE official_domains (
  domain TEXT PRIMARY KEY,             -- 'pib.gov.in'
  org TEXT, source_id TEXT, notes TEXT
);

-- Checks ----------------------------------------------------------
CREATE TABLE checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE NOT NULL,      -- short id for share URLs
  status TEXT NOT NULL,                -- RECEIVED..DONE|FAILED
  input_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  lang_detected TEXT, lang_reply TEXT,
  claims JSONB, 
  verdict TEXT, confidence REAL, confidence_band TEXT,
  reasons JSONB, diffs JSONB, lineage JSONB,
  explanation JSONB,                   -- {text_by_lang, audio_path}
  corpus_snapshot TEXT, prompt_version TEXT, model_id TEXT,
  artifact_path TEXT, artifact_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ
);
CREATE TABLE check_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES checks(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  chunk_id UUID REFERENCES chunks(id),
  field TEXT, comparison TEXT,         -- match|mismatch|not_stated
  claim_value TEXT, official_value TEXT, quote TEXT, quote_valid BOOLEAN
);
CREATE TABLE check_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES checks(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL, grp TEXT NOT NULL,  -- LINK|DOCUMENT|IDENTIFIER|PROVENANCE
  severity TEXT NOT NULL, score REAL, evidence JSONB, explanation TEXT
);
CREATE TABLE check_events (
  id BIGSERIAL PRIMARY KEY,
  check_id UUID REFERENCES checks(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ DEFAULT now(), stage TEXT, status TEXT, duration_ms INT, payload JSONB
);
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES checks(id), kind TEXT, note TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
```

## 5. Retrieval design

```
query = claim.scheme_name + benefit + amount + issuer (+ original text)
 ├─ identifier shortcut: regex IDs → documents.doc_number exact/trgm
 ├─ lexical: ts_rank_cd(tsv, plainto_tsquery('simple', q)) top 30
 ├─ dense:   embedding <=> bge_m3(q) top 30
 ├─ RRF fuse (k=60) → top 20
 ├─ rerank cross-encoder → top 8
 └─ group by document; keep best 3 documents
```
Dates: apply soft filter `published_on <= today`. Hindi queries: also translate key terms to English via LLM for lexical recall (cached).

## 6. Lineage design
- Build `doc_relations` during ingest by (a) regex on text ("in supersession of", "in partial modification of", "rescinds", "vide notification No. …") and (b) LLM relation extractor on candidate pairs (same issuer + date proximity + shared identifiers).
- Query: `WITH RECURSIVE` walk successors from matched doc; latest in chain = current.
- Timeline API returns ordered versions with `provisions` diffs.

## 7. Caching & idempotency
- `input_hash` + `corpus_snapshot` + `prompt_version` → reuse completed check (instant demo replays).
- LLM responses cached in Redis (TTL 7 d). URL fetch cache (TTL 1 h).
- Pipeline stages are idempotent; retries up to 2 with backoff.

## 8. Failure handling
| Failure | Behavior |
|---|---|
| OCR/ASR fails | Ask user to retype/re-record; status `FAILED` with actionable message |
| LLM timeout/invalid JSON | Retry once with repair prompt; else `UNVERIFIABLE (system_error)` flagged, never a guess |
| Retrieval empty | `UNVERIFIABLE` with "searched sources" list |
| Forensics sub-check error | Signal omitted + `info` signal "check unavailable"; never counts as evidence |
| URL fetch blocked/slow | `info` signal; link still evaluated on static features |
| TTS fails | Text reply only |

## 9. Deployment

`docker-compose.yml` services: `db` (pgvector/pg16), `redis`, `api`, `worker`, `web`, optional `ollama`, `minio`.

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment: { POSTGRES_USER: sach, POSTGRES_PASSWORD: sach, POSTGRES_DB: sach }
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
  redis: { image: redis:7-alpine }
  api:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    env_file: .env
    depends_on: [db, redis]
    volumes: [ "./data:/data" ]
    ports: ["8000:8000"]
  worker:
    build: ./backend
    command: arq app.worker.WorkerSettings
    env_file: .env
    depends_on: [db, redis]
    volumes: [ "./data:/data" ]
  web:
    build: ./frontend
    environment: { NEXT_PUBLIC_API_URL: http://localhost:8000 }
    ports: ["3000:3000"]
volumes: { pgdata: {} }
```
Production-ish: Caddy reverse proxy with TLS, `ap-south-1`, daily DB backup, corpus snapshot tarball for offline restore.

## 10. Scaling notes (for Q&A, not built)
Stateless api/worker; scale workers horizontally; pgvector HNSW good to ~millions of chunks; move to Qdrant/OpenSearch beyond; per-source adapters isolated; verdict engine is pure and trivially testable.
