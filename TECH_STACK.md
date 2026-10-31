# TECH STACK: Sarkari Sach

Principle: **boring, fast to ship, runs offline, every component has a fallback.**

## 1. Summary table

| Layer | Primary choice | Why | Fallback |
|---|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Fast UI, SSR audit pages with OG tags for share links | Vite + React |
| Realtime | Server-Sent Events (SSE) | Simple streaming progress, works through proxies | Polling `GET /checks/{id}` |
| Backend API | FastAPI (Python 3.11) + Pydantic v2 + uvicorn | Async, typed, auto OpenAPI | Flask |
| Task queue | `arq` (Redis) | Light, async-native | FastAPI `BackgroundTasks` (no Redis) |
| Database | PostgreSQL 16 + `pgvector` + `pg_trgm` | One store for relational, FTS, vectors, fuzzy | SQLite + FTS5 + `sqlite-vec` |
| Cache | Redis 7 | Fetch/LLM response cache, rate limits | In-process LRU |
| Object store | Local FS / MinIO | Artifacts, cards, audio | Local disk |
| LLM (extract/compare/explain) | Anthropic Claude (`claude-sonnet-5-5`, configurable via `LLM_MODEL`) | Strong multilingual, JSON-schema output, vision | Any provider behind `LLMClient` interface; local Qwen2.5-7B-Instruct via Ollama for offline demo |
| Vision OCR | Claude vision | Handles messy forwards, Indic scripts | Tesseract 5 (`hin+eng+tam+ben`), PaddleOCR |
| ASR | `faster-whisper` large-v3 (local) | Hindi/Indic voice notes, offline | AI4Bharat IndicWhisper; Sarvam ASR API |
| TTS | Sarvam Bulbul API (Indic quality) | Natural Hindi/Tamil/Bengali | `edge-tts` (hi-IN-SwaraNeural), `gTTS` |
| Embeddings | `BAAI/bge-m3` (multilingual, local) | Dense + works for Hindi/English | `intfloat/multilingual-e5-large` |
| Reranker | `BAAI/bge-reranker-v2-m3` | Cheap precision boost | Skip (RRF only) |
| Lexical search | Postgres FTS (`simple` config + trigram) | No extra service | `rank_bm25` in memory |
| Language ID | fastText `lid.176.ftz` | Offline, fast | `langdetect` |
| PDF | `pdfplumber`, `pikepdf`, `pypdf`, `pdf2image` | Text, structure, metadata | `PyMuPDF` |
| Image forensics | `Pillow`, `OpenCV`, `imagehash`, `exifread` | ELA, pHash, EXIF | none needed |
| QR | `pyzbar` / OpenCV `QRCodeDetector` | Decode QR in notices | OpenCV only |
| Domain analysis | `tldextract`, `idna`, `confusable_homoglyphs`, `rapidfuzz`, `python-whois`, `ssl` stdlib | Typosquat/homoglyph/age/cert | RDAP via `rdap.org` |
| HTTP fetch | `httpx` + custom SSRF guard, Playwright for JS pages | Safe redirect tracing | `requests` |
| Scraping | `httpx`, `selectolax`, `playwright`, `feedparser` | Fast parsing | `beautifulsoup4` |
| Card rendering | Playwright (HTML→PNG) | Pixel-perfect, Devanagari fonts | Pillow template |
| Messaging (P1) | Twilio WhatsApp Sandbox | Fastest WhatsApp demo | Telegram Bot API |
| Eval | `pytest`, `pandas`, `scikit-learn`, custom harness | Reproducible report | n/a |
| Infra | Docker Compose; deploy on a single VM (Hetzner/DO/AWS Mumbai `ap-south-1`) | Simple, India-region latency | Render/Fly.io |
| CI | GitHub Actions: lint, unit, eval gate | Prevents regressions | local `make ci` |
| Observability | `structlog`, Prometheus client, OpenTelemetry (optional) | Per-stage timings | logs only |

## 2. Why these choices (short)

- **Postgres for everything**: one container does relational + vector + FTS + trigram. Fewer moving parts than Elasticsearch + Qdrant + SQL.
- **bge-m3**: single model for Hindi/English dense retrieval; runs on CPU for small corpus (a few thousand chunks).
- **Claude for extraction/comparison**: strict JSON with schema, strong on mixed Hindi-English noisy text. The LLM never emits the final verdict.
- **faster-whisper local**: no network at demo; handles Indian-accent Hindi acceptably. Benchmark vs. IndicWhisper in Phase 0.
- **SSE over WebSockets**: one-directional progress events, trivial to implement and debug.
- **Playwright**: used both for JS-heavy portals during ingest and for card rendering, so one dependency does two jobs.

## 3. LLM abstraction

```python
class LLMClient(Protocol):
    def json(self, system: str, user: str|list, schema: dict, *, images: list[bytes]|None=None) -> dict: ...
    def text(self, system: str, user: str, *, max_tokens: int=400) -> str: ...
```
Implementations: `AnthropicClient`, `OllamaClient`, `FakeClient` (fixtures for tests). Selected by `LLM_PROVIDER`. Responses cached by `sha256(model+prompt_version+input)`.

## 4. Pinned versions (starting point; verify at install)
```
python 3.11 · fastapi ~0.115 · pydantic 2.x · uvicorn · httpx · sqlalchemy 2.x · alembic · psycopg 3
pgvector (postgres image: pgvector/pgvector:pg16) · redis 7 · arq
sentence-transformers · faster-whisper · pdfplumber · pikepdf · pdf2image · pytesseract · opencv-python-headless
imagehash · exifread · pyzbar · tldextract · rapidfuzz · confusable-homoglyphs · python-whois · fasttext-wheel
playwright · selectolax · feedparser · structlog · prometheus-client · pytest · pandas · scikit-learn
node 20 · next 14 · react 18 · tailwindcss 3 · typescript 5
```

## 5. Environment variables (`.env.example`)
```
# LLM
LLM_PROVIDER=anthropic            # anthropic | ollama | fake
ANTHROPIC_API_KEY=
LLM_MODEL=claude-sonnet-5-5
OLLAMA_URL=http://localhost:11434
# Data
DATABASE_URL=postgresql+psycopg://sach:sach@db:5432/sach
REDIS_URL=redis://redis:6379/0
STORAGE_DIR=/data
# Models
EMBED_MODEL=BAAI/bge-m3
RERANK_MODEL=BAAI/bge-reranker-v2-m3
WHISPER_MODEL=large-v3
TTS_PROVIDER=edge                 # sarvam | edge | gtts
SARVAM_API_KEY=
# Behaviour
OFFLINE_MODE=false                # true => no outbound fetch except cached
CORPUS_SNAPSHOT=latest
RETENTION_HOURS=24
RATE_LIMIT_PER_MIN=20
PUBLIC_BASE_URL=http://localhost:3000
# Messaging (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

## 6. Hardware assumptions
- Dev laptop: 16 GB RAM, CPU only works (bge-m3 + whisper `medium` fallback).
- Demo VM: 4 vCPU / 16 GB, optional GPU for whisper large-v3. If CPU-only, use `whisper medium` + `int8`.
