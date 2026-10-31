from __future__ import annotations
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.settings import settings
from app.models import Base, Source, OfficialDomain

# Async engine for FastAPI routes and worker
db_url = settings.clean_database_url
sync_db_url = settings.clean_sync_database_url

async_engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync engine for scripts/eval
sync_engine = create_engine(
    sync_db_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in sync_db_url else {}
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


def get_db():
    with SyncSessionLocal() as session:
        try:
            yield session
        finally:
            session.close()


def init_db_sync():
    """Create all tables and seed official domains/sources synchronously."""
    Base.metadata.create_all(bind=sync_engine)
    with SyncSessionLocal() as session:
        # Seed core sources if missing
        sources = [
            ("pib", "Press Information Bureau", ["pib.gov.in"], 1),
            ("gazette", "e-Gazette of India", ["egazette.gov.in", "egazette.nic.in"], 1),
            ("myscheme", "myScheme", ["myscheme.gov.in"], 1),
            ("rbi", "Reserve Bank of India", ["rbi.org.in"], 1),
            ("scheme-portal", "Official Scheme Portals", ["pmkisan.gov.in", "scholarships.gov.in", "uidai.gov.in"], 1),
        ]
        for sid, name, domains, tier in sources:
            existing = session.query(Source).filter_by(id=sid).first()
            if not existing:
                session.add(Source(id=sid, name=name, base_domains=domains, trust_tier=tier))

        # Seed official domains from config
        off_domains = settings.get_official_domains()
        for dom in off_domains:
            existing_dom = session.query(OfficialDomain).filter_by(domain=dom).first()
            if not existing_dom:
                session.add(OfficialDomain(domain=dom, org="Government of India"))

        session.commit()


async def init_db():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, init_db_sync)
