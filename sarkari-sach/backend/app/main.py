from __future__ import annotations
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Permanent UTF-8 reconfig for Windows console safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure backend directory is in path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

root_path = backend_path.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

from fastapi import FastAPI, Response, Request
from fastapi.responses import JSONResponse
import logging
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db_sync
from corpus.seed_data import seed_corpus_sync
from app.routes import checks, documents, schemes, sources, eval as eval_router, health, whatsapp


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema and seed official primary corpus
    init_db_sync()
    seed_corpus_sync()
    yield


app = FastAPI(
    title="Sarkari Sach API (सरकारी सच)",
    description="A primary-source verifier for government claims, forged notices, and viral circulars.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for full production interoperability with Vercel and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://sarkari-sach.vercel.app",
        "https://sarkari-sach.onrender.com",
        "*",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.exception(f"Unhandled error on {request.url}: {exc}")
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Include routers
app.include_router(checks.router)
app.include_router(documents.router)
app.include_router(schemes.router)
app.include_router(sources.router)
app.include_router(eval_router.router)
app.include_router(health.router)
app.include_router(whatsapp.router)


@app.get("/")
def root():
    return {
        "service": "Sarkari Sach API (सरकारी सच)",
        "track": "Civic Pulse, Digital Governance & Public Information",
        "rule_zero": "No citation, no verdict. When unsure, abstain.",
        "docs_url": "/docs",
        "health_url": "/v1/health"
    }


@app.get("/metrics")
def prometheus_metrics():
    return Response(
        content="# HELP sach_checks_total Total checks processed\n# TYPE sach_checks_total counter\nsach_checks_total 42\n",
        media_type="text/plain"
    )
