from __future__ import annotations
import os
from pathlib import Path
from typing import Literal
import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR / "config" if (BASE_DIR / "config").exists() else Path(__file__).resolve().parent.parent / "config"
DATA_DIR = BASE_DIR / "data" if (BASE_DIR / "data").parent.exists() else Path(__file__).resolve().parent.parent / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LLM (Strict live API integration)
    LLM_PROVIDER: Literal["gemini", "anthropic", "openai", "ollama"] = "gemini"
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-3.5-flash-lite"
    OLLAMA_URL: str = "http://localhost:11434"

    # Database
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            f"sqlite+aiosqlite:///{DATA_DIR / 'sach.db'}"
        )
    )
    SYNC_DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "SYNC_DATABASE_URL",
            f"sqlite:///{DATA_DIR / 'sach.db'}"
        )
    )

    @property
    def clean_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def clean_sync_database_url(self) -> str:
        url = self.SYNC_DATABASE_URL or self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        elif "sqlite+aiosqlite:///" in url:
            url = url.replace("sqlite+aiosqlite:///", "sqlite:///")
        elif "+asyncpg" in url:
            url = url.replace("postgresql+asyncpg://", "postgresql://")
        return url

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_IN_MEMORY_REDIS_FALLBACK: bool = True

    # Storage & Paths
    STORAGE_DIR: Path = DATA_DIR
    CONFIG_DIR: Path = CONFIG_DIR

    # Embeddings & Audio
    EMBED_MODEL: str = "BAAI/bge-m3"
    RERANK_MODEL: str = "BAAI/bge-reranker-v2-m3"
    WHISPER_MODEL: str = "large-v3"
    TTS_PROVIDER: Literal["sarvam", "edge", "gtts", "mock"] = "mock"
    SARVAM_API_KEY: str = ""

    # Behavior
    OFFLINE_MODE: bool = False
    CORPUS_SNAPSHOT: str = "latest"
    RETENTION_HOURS: int = 24
    RATE_LIMIT_PER_MIN: int = 20
    PUBLIC_BASE_URL: str = "http://localhost:3000"

    # Twilio / WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""

    # Cached Thresholds & Domains
    _thresholds: dict | None = None
    _official_domains: set[str] | None = None

    def get_thresholds(self) -> dict:
        if self._thresholds is None:
            thresholds_file = self.CONFIG_DIR / "thresholds.yaml"
            if thresholds_file.exists():
                with open(thresholds_file, "r", encoding="utf-8") as f:
                    self._thresholds = yaml.safe_load(f) or {}
            else:
                self._thresholds = {
                    "retrieval_min_conf": 0.55,
                    "debunk_min_score": 0.85,
                    "debunk_near_min_score": 0.70,
                    "match_ratio_for_confirmed": 0.80,
                    "min_hard_groups_for_forged": 2,
                    "allow_single_group_forged": False,
                    "key_fields": ["amount", "deadline", "eligibility", "fee", "benefit"],
                }
        return self._thresholds

    def get_official_domains(self) -> set[str]:
        if self._official_domains is None:
            domains: set[str] = set()
            domains_file = self.CONFIG_DIR / "official_domains.csv"
            if domains_file.exists():
                import csv
                with open(domains_file, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        domain = row.get("domain", "").strip().lower()
                        if domain:
                            domains.add(domain)
            # Default suffixes
            domains.update({"gov.in", "nic.in", "rbi.org.in", "sebi.gov.in"})
            self._official_domains = domains
        return self._official_domains


settings = Settings()
DATA_DIR.mkdir(parents=True, exist_ok=True)

