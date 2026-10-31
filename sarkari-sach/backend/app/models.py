from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date, DateTime, ForeignKey,
    JSON, TypeDecorator
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class FlexibleVector(TypeDecorator):
    """Adapts list[float] for SQLite (stored as JSON) or PostgreSQL vector."""
    impl = JSON
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return list(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return list(value)


def gen_uuid_str() -> str:
    return str(uuid.uuid4())


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True)  # 'pib', 'gazette', 'myscheme', 'rbi'
    name = Column(String, nullable=False)
    base_domains = Column(JSON, default=list)  # list of strings
    trust_tier = Column(Integer, default=1)
    robots_ok = Column(Boolean, default=True)

    documents = relationship("Document", back_populates="source")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    source_id = Column(String, ForeignKey("sources.id"), nullable=True)
    external_id = Column(String, nullable=True)
    doc_type = Column(String, nullable=False)  # 'notification','circular','press_release','scheme','factcheck'
    title = Column(String, nullable=False)
    issuer = Column(String, nullable=True)
    doc_number = Column(String, nullable=True, index=True)
    published_on = Column(Date, nullable=True, index=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    language = Column(String, default="en")
    url = Column(String, nullable=False)
    content_hash = Column(String, nullable=False)
    raw_path = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    snapshot_id = Column(String, nullable=False, default="latest")
    fetched_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    provisions = relationship("Provision", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    ordinal = Column(Integer, nullable=False)
    clause_ref = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    embedding = Column(FlexibleVector, nullable=True)

    document = relationship("Document", back_populates="chunks")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(String, primary_key=True)  # 'pm-kisan'
    name = Column(String, nullable=False)
    name_aliases = Column(JSON, default=list)
    issuer = Column(String, nullable=True)

    provisions = relationship("Provision", back_populates="scheme")


class Provision(Base):
    __tablename__ = "provisions"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    scheme_id = Column(String, ForeignKey("schemes.id"), nullable=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    chunk_id = Column(String, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=True)
    field = Column(String, nullable=False)  # 'amount','deadline','eligibility','fee','benefit'
    value = Column(String, nullable=False)
    value_norm = Column(JSON, nullable=True)
    quote = Column(Text, nullable=False)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)

    scheme = relationship("Scheme", back_populates="provisions")
    document = relationship("Document", back_populates="provisions")


class DocRelation(Base):
    __tablename__ = "doc_relations"

    src_doc = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    dst_doc = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    relation = Column(String, primary_key=True)  # 'amends','supersedes','rescinds','corrigendum','extends'
    evidence_quote = Column(Text, nullable=True)


class Debunk(Base):
    __tablename__ = "debunks"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    claim_text = Column(Text, nullable=False)
    verdict_text = Column(Text, nullable=True)
    published_on = Column(Date, nullable=True)
    embedding = Column(FlexibleVector, nullable=True)


class OfficialDomain(Base):
    __tablename__ = "official_domains"

    domain = Column(String, primary_key=True)
    org = Column(String, nullable=True)
    source_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)


class Check(Base):
    __tablename__ = "checks"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    public_id = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, nullable=False, default="RECEIVED")  # RECEIVED..DONE|FAILED
    input_type = Column(String, nullable=False)
    input_hash = Column(String, nullable=False, index=True)
    input_content = Column(Text, nullable=True)
    lang_detected = Column(String, default="hi")
    lang_reply = Column(String, default="hi")
    claims = Column(JSON, default=list)
    verdict = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    confidence_band = Column(String, default="Medium")
    reasons = Column(JSON, default=list)
    diffs = Column(JSON, default=list)
    lineage = Column(JSON, default=dict)
    explanation = Column(JSON, default=dict)
    warnings = Column(JSON, default=list)
    searched_sources = Column(JSON, default=list)
    corpus_snapshot = Column(String, default="latest")
    prompt_version = Column(String, default="p1.0")
    model_id = Column(String, default="claude-sonnet-5-5")
    artifact_path = Column(String, nullable=True)
    artifact_expires_at = Column(DateTime, nullable=True)
    timings_ms = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    evidence = relationship("CheckEvidence", back_populates="check", cascade="all, delete-orphan")
    signals = relationship("CheckSignal", back_populates="check", cascade="all, delete-orphan")
    events = relationship("CheckEvent", back_populates="check", cascade="all, delete-orphan")


class CheckEvidence(Base):
    __tablename__ = "check_evidence"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    check_id = Column(String, ForeignKey("checks.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    chunk_id = Column(String, ForeignKey("chunks.id", ondelete="SET NULL"), nullable=True)
    field = Column(String, nullable=False)
    comparison = Column(String, nullable=False)  # 'match','mismatch','not_stated'
    claim_value = Column(String, nullable=True)
    official_value = Column(String, nullable=True)
    quote = Column(Text, nullable=False)
    quote_valid = Column(Boolean, default=True)

    check = relationship("Check", back_populates="evidence")


class CheckSignal(Base):
    __tablename__ = "check_signals"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    check_id = Column(String, ForeignKey("checks.id", ondelete="CASCADE"), nullable=False, index=True)
    signal_id = Column(String, nullable=False)
    grp = Column(String, nullable=False)  # LINK|DOCUMENT|IDENTIFIER|PROVENANCE
    severity = Column(String, nullable=False)  # hard|soft|info
    score = Column(Float, default=1.0)
    evidence = Column(JSON, default=dict)
    explanation = Column(Text, nullable=True)

    check = relationship("Check", back_populates="signals")


class CheckEvent(Base):
    __tablename__ = "check_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    check_id = Column(String, ForeignKey("checks.id", ondelete="CASCADE"), nullable=False, index=True)
    ts = Column(DateTime, default=datetime.utcnow)
    stage = Column(String, nullable=False)
    status = Column(String, nullable=False)
    duration_ms = Column(Integer, default=0)
    payload = Column(JSON, default=dict)

    check = relationship("Check", back_populates="events")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=gen_uuid_str)
    check_id = Column(String, ForeignKey("checks.id", ondelete="CASCADE"), nullable=True)
    kind = Column(String, nullable=False)  # wrong_verdict | helpful | report_abuse
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

