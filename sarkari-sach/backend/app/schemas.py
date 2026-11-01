from __future__ import annotations
from enum import Enum
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field


class Verdict(str, Enum):
    CONFIRMED = "CONFIRMED"
    OUTDATED = "OUTDATED"
    ALTERED = "ALTERED"
    UNVERIFIABLE = "UNVERIFIABLE"
    FORGED = "FORGED"


class SignalGroup(str, Enum):
    LINK = "LINK"
    DOCUMENT = "DOCUMENT"
    IDENTIFIER = "IDENTIFIER"
    PROVENANCE = "PROVENANCE"


class SignalSeverity(str, Enum):
    hard = "hard"
    soft = "soft"
    info = "info"


class Signal(BaseModel):
    signal_id: str
    group: Literal["LINK", "DOCUMENT", "IDENTIFIER", "PROVENANCE"]
    severity: Literal["hard", "soft", "info"]
    score: float = Field(default=1.0, ge=0.0, le=1.0)
    explanation: str
    evidence: dict[str, Any] = Field(default_factory=dict)


class FieldValue(BaseModel):
    value: str
    norm: dict[str, Any] | None = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    span: list[int] | tuple[int, int] | None = None


class Claim(BaseModel):
    model_config = {"extra": "allow"}

    claim_text: str = ""
    scheme_name: str | None = None
    scheme_name_en: str | None = None
    issuer_claimed: str | None = None
    fields: dict[str, Any] = Field(default_factory=dict)
    links: list[str] = Field(default_factory=list)
    phone_numbers: list[str] = Field(default_factory=list)
    doc_identifiers: list[str] = Field(default_factory=list)
    claim_type: str | None = None
    amount_inr: str | None = None
    details: str | None = None
    verbatim_quote: str | None = None


class Evidence(BaseModel):
    model_config = {"extra": "allow"}

    document: dict[str, Any]
    chunk: dict[str, Any]
    field: str
    comparison: Literal["match", "mismatch", "not_stated"]
    claim_value: str | None = None
    official_value: str | None = None
    quote: str
    quote_valid: bool = True


class DiffItem(BaseModel):
    model_config = {"extra": "allow"}

    field: str = ""
    claim: str = ""
    official: str = ""
    quote: str = ""
    document_id: str | UUID | None = None
    clause_ref: str | None = None


class ReasonItem(BaseModel):
    model_config = {"extra": "allow"}

    code: str = ""
    field: str | None = None
    claim: str | None = None
    official: str | None = None
    message: str | None = None


class LineageTimelineItem(BaseModel):
    date: str | None = None
    document_id: str | UUID | None = None
    title: str | None = None
    change: str | None = None
    relation: str | None = None


class LineageInfo(BaseModel):
    scheme_id: str | None = None
    timeline: list[LineageTimelineItem] = Field(default_factory=list)
    current_document_id: str | UUID | None = None
    superseded: bool = False
    expired: bool = False
    latest_doc_id: str | UUID | None = None


class ExplanationPayload(BaseModel):
    lang: str = "hi"
    short: str
    steps: list[str] = Field(default_factory=list)
    audio_url: str | None = None


class CheckInputInfo(BaseModel):
    type: str
    lang_detected: str = "hi"
    extracted_text: str = ""


class CheckCreateResponse(BaseModel):
    id: str
    public_id: str
    status: str
    events_url: str
    result_url: str
    audit_url: str


class CheckDetailResponse(BaseModel):
    id: str
    public_id: str
    status: str
    verdict: Verdict | None = None
    confidence: float = 0.0
    confidence_band: str = "Medium"
    input: CheckInputInfo
    claims: list[Claim] = Field(default_factory=list)
    reasons: list[ReasonItem] = Field(default_factory=list)
    diffs: list[DiffItem] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    lineage: LineageInfo = Field(default_factory=LineageInfo)
    signals: list[Signal] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    searched_sources: list[str] = Field(default_factory=list)
    explanation: ExplanationPayload | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    timings_ms: dict[str, int] = Field(default_factory=dict)
    card_url: str | None = None
    created_at: str | None = None
    finished_at: str | None = None


class FeedbackRequest(BaseModel):
    kind: Literal["wrong_verdict", "helpful", "report_abuse"]
    note: str = ""


class DocumentItem(BaseModel):
    id: str
    source_id: str
    external_id: str | None = None
    doc_type: str
    title: str
    issuer: str | None = None
    doc_number: str | None = None
    published_on: str | None = None
    effective_from: str | None = None
    effective_to: str | None = None
    url: str
    text: str
    snapshot_id: str


class SchemeItem(BaseModel):
    id: str
    name: str
    name_aliases: list[str] = Field(default_factory=list)
    issuer: str | None = None


class SourceItem(BaseModel):
    id: str
    name: str
    documents: int
    last_fetched: str | None = None
    domains: list[str] = Field(default_factory=list)


class SourcesResponse(BaseModel):
    snapshot: str
    sources: list[SourceItem]


class EvalReportMetric(BaseModel):
    name: str
    value: float
    ci_lower: float | None = None
    ci_upper: float | None = None
    unit: str = "%"


class EvalReportResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    snapshot: str
    commit: str = "main"
    prompt_version: str = "p1.0"
    model_id: str = "claude-sonnet-5-5"
    n_cases: int
    synthetic_share: float
    headline_metrics: dict[str, float]
    confusion_matrix: dict[str, dict[str, int]]
    per_class_metrics: dict[str, dict[str, float]]
    baseline_comparison: list[dict[str, Any]]
    known_failures: list[dict[str, Any]]
