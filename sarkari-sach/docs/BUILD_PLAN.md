# BUILD PLAN: Sarkari Sach

You haven't said how much time you have, so this is phased with **hard cut lines**. Stop at whatever phase your deadline allows; each phase leaves a demoable product.

## 0. Repo layout
```
sarkari-sach/
├─ README.md  Makefile  docker-compose.yml  .env.example
├─ docs/                      # these documents
├─ config/
│   ├─ thresholds.yaml        # verdict thresholds, signal policy flags
│   └─ official_domains.csv
├─ backend/
│   ├─ pyproject.toml  Dockerfile
│   ├─ alembic/               # migrations (schema in SYSTEM_DESIGN.md)
│   └─ app/
│       ├─ main.py  worker.py  settings.py  db.py  models.py  schemas.py
│       ├─ routes/ checks.py documents.py schemes.py eval.py health.py whatsapp.py
│       ├─ pipeline/ run.py events.py
│       │   └─ stages/ normalize.py extract.py retrieve.py forensics.py compare.py lineage.py decide.py explain.py render.py
│       ├─ ingest/ ocr.py asr.py pdf.py fetcher.py lang.py redact.py
│       ├─ nlp/ normalize.py validator.py embed.py rerank.py
│       ├─ forensics/ link.py pdfx.py imgx.py ident.py provenance.py qr.py
│       ├─ verdict/ engine.py types.py
│       ├─ llm/ client.py anthropic_client.py ollama_client.py fake_client.py prompts.py
│       ├─ tts/ edge.py sarvam.py gtts.py
│       ├─ card/ template.html card.py
│       └─ tests/
├─ corpus/
│   ├─ adapters/ pib.py gazette.py myscheme.py rbi.py base.py
│   ├─ manual/ relations.yaml  seed.md  docs/ (hand-curated PDFs/HTML)
│   ├─ build.py  provisions.py  relations.py  snapshot.py
├─ eval/ data/ run.py score.py report.py baselines.py adversarial.py
├─ frontend/
│   ├─ app/ page.tsx  c/[id]/page.tsx  c/[id]/audit/page.tsx  scheme/[id]/page.tsx  eval/page.tsx  about/page.tsx
│   ├─ components/ ...        # see DESIGN.md §7
│   └─ locales/ en.json hi.json
└─ scripts/ demo_seed.sh  load_snapshot.sh
```

## 1. Makefile targets
```make
up:        docker compose up -d db redis
migrate:   cd backend && alembic upgrade head
ingest:    python -m corpus.build --sources pib,gazette,myscheme --since 2025-01-01
provisions:python -m corpus.provisions && python -m corpus.relations
snapshot:  python -m corpus.snapshot
api:       cd backend && uvicorn app.main:app --reload
worker:    cd backend && arq app.worker.WorkerSettings
web:       cd frontend && npm run dev
test:      cd backend && pytest -q
eval:      python -m eval.run --split dev && python -m eval.score
eval-test: python -m eval.run --split test --holdout-debunks --seed 7 && python -m eval.score --report
demo:      ./scripts/demo_seed.sh
```

## 2. Phases

### Phase 0: Feasibility spike (60-90 min) ⚠️ do first
- [ ] Fetch & parse 5 PIB releases + 3 PIB Fact Check items.
- [ ] Fetch 5 Gazette PDFs (or confirm manual curation path).
- [ ] Fetch 5 scheme pages (myScheme or portal).
- [ ] OCR test: 5 Hindi forward screenshots (vision LLM vs. Tesseract).
- [ ] ASR test: 3 Hindi voice notes (faster-whisper medium vs. large-v3).
- [ ] TTS test: Hindi sample quality (edge-tts vs. Sarvam).
- [ ] Decide: scraped vs. manual-curated corpus per source. Write decisions in `corpus/seed.md`.
- **Exit:** a go/no-go table per source and a chosen TTS/ASR.

### Phase 1: Walking skeleton (core value, text-only)
- [ ] Docker compose, DB schema, migrations, config.
- [ ] Corpus ingest for **PIB + 1 more source** (or manual seed of 15 docs), chunk, embed, snapshot.
- [ ] LLM client + extraction + comparison + citation validator.
- [ ] Hybrid retrieval + RRF.
- [ ] Verdict Engine + unit tests (matrix in FORENSICS §4).
- [ ] `POST /checks`, `GET /checks/{id}`, SSE events.
- [ ] Minimal UI: composer, progress, result with verdict + evidence.
- **Exit:** paste text → cited CONFIRMED/ALTERED/UNVERIFIABLE.

### Phase 2: Forensics + inputs
- [ ] Link analysis (+ safe tracer, homoglyph, lookalike, domain age).
- [ ] Debunk corpus + `DEBUNK_MATCH`.
- [ ] Image OCR path, PDF text + metadata path, QR.
- [ ] Fee contradiction via provisions.
- [ ] Signals UI, Forged/UNVERIFIABLE-with-warning flows.
- **Exit:** poster image with fake link → FORGED with signals; real doc → not FORGED.

### Phase 3: Lineage + languages + share
- [ ] Provision extraction + relations (regex + LLM) + manual `relations.yaml` for seed chains.
- [ ] OUTDATED verdict + timeline UI + diff panel.
- [ ] ASR voice input, Hindi reply, TTS audio.
- [ ] Verified card PNG + OG + audit page.
- **Exit:** the 4-scene demo works.

### Phase 4: Eval + polish (do not skip)
- [ ] Build test set (EVALUATION.md), run baselines, produce report, `/eval` page.
- [ ] Adversarial/injection fixtures.
- [ ] Hindi UI strings reviewed; accessibility pass; low-bandwidth check.
- [ ] Demo seed script + offline run rehearsal.
- **Exit:** numbers on screen, reproducible.

### Phase 5: Stretch (only if ahead)
WhatsApp sandbox bot · third language · scheme watch/alerts · browser extension · MSME compliance mode.

## 3. Cut lines (if time collapses)
| Time left | Cut | Keep |
|---|---|---|
| Lose 25% | WhatsApp, third language, scheme watch | Everything in Phases 1-4 |
| Lose 40% | Voice input, QR, PDF font analysis, ELA | Text/image/link, lineage, card, eval |
| Lose 60% | Image OCR path (use pasted text), TTS, Gazette scraping (use manual seed) | Text → cited verdict, link forensics, 30-item eval, audit page |
| Absolute minimum | Everything else | Retrieval + validator + verdict engine + 3 scripted demo cases + small eval table |

## 4. Parallelization (2-4 people)
| Role | Owns |
|---|---|
| A: Corpus/Data | adapters, parsing, chunking, provisions, relations, snapshots, test-set curation |
| B: Backend/ML | pipeline, LLM, retrieval, verdict, API, eval harness |
| C: Forensics/Security | link/PDF/image analysis, SSRF guard, sandbox, tests |
| D: Frontend/Design | Next.js UI, cards, audit page, i18n, demo polish |
Solo: follow phases serially; cut per table above.

## 5. Task breakdown (backlog seed)
**Backend**
1. `settings.py` (pydantic-settings) with env.
2. `db.py` + SQLAlchemy models + Alembic baseline from SYSTEM_DESIGN §4.
3. `llm/client.py` interface + Anthropic + Fake client (fixtures keyed by hash).
4. `nlp/normalize.py`: INR parser (`₹`, `Rs`, `रु`, lakh/crore, `/-`), date parser (ISO, DD/MM/YYYY, Hindi months), Devanagari digits.
5. `nlp/validator.py`: normalized substring check (NFC, whitespace, quote variants, digit mapping).
6. `pipeline/stages/*` + event emitter (Redis pub/sub → SSE).
7. `verdict/engine.py` pure function + `tests/test_engine.py` (table-driven).
8. `routes/*` with Pydantic schemas from API.md.
9. `worker.py` arq jobs; idempotency by input hash.
10. `card/card.py` Playwright render; font bundling (Noto Devanagari).
11. `routes/eval.py` serving `eval/report.json`.

**Corpus**
1. `adapters/base.py`; `pib.py` list/fetch/parse; `debunk` parse.
2. Manual docs loader (`corpus/manual/docs/*` + sidecar `.yaml` metadata).
3. Chunker with clause refs.
4. `embed.py` bge-m3 batch; HNSW index.
5. `provisions.py`, `relations.py`; manual `relations.yaml` overrides.
6. Corpus health checks script.

**Frontend**
1. Next.js scaffold + Tailwind + tokens + fonts.
2. `Composer`, `VoiceRecorder` (MediaRecorder → webm/ogg).
3. SSE hook (`useCheckEvents`) with polling fallback.
4. Result page + badge + reply + share sheet.
5. Evidence viewer, diff table, lineage timeline, signals table.
6. `/eval` dashboard (charts via Recharts).
7. i18n (`next-intl`), Hindi strings, reduced-motion, a11y audit (axe).

**Eval**
1. Case schema + loaders; 2. synthetic alteration generator (render HTML→PNG with changed values, watermark "SAMPLE"); 3. recompression augmenter; 4. scorer + bootstrap; 5. baselines; 6. report writer.

## 6. Risk register (live)
| Risk | Trigger | Response |
|---|---|---|
| Portal blocks scraping | HTTP 403/captcha in Phase 0 | Manual curation path, snapshot tarball |
| Hindi OCR weak | CER >15% on samples | Vision LLM primary; show editable OCR text |
| Latency too high | p50 >15 s | Cache, reduce compare calls (top-2 docs), skip rerank, smaller model for extraction |
| Lineage graph sparse | <5 verified chains | Hand-verify 5-8 seed chains; frame lineage as "verified for seed schemes" honestly |
| Eval too small | n<50 | Say so; add bootstrap CIs; emphasize qualitative failure analysis |
| LLM rate limits | 429s | Retry + cache + fake-client replay for demo |

## 7. Pre-demo checklist
- [ ] `make snapshot` restored on demo machine; network disabled test passes.
- [ ] 4 demo inputs pre-cached and also runnable live.
- [ ] Hindi audio plays through venue speakers (test volume).
- [ ] `/eval` shows final numbers; report committed.
- [ ] Backup video of the demo (screen recording) on local disk.
- [ ] Repo public/private as required, README quickstart verified on a clean clone.
