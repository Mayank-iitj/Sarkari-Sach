"""Deterministic Verdict Engine. The LLM never decides a verdict; this pure function does."""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum


class Verdict(str, Enum):
    CONFIRMED = "CONFIRMED"
    OUTDATED = "OUTDATED"
    ALTERED = "ALTERED"
    UNVERIFIABLE = "UNVERIFIABLE"
    FORGED = "FORGED"


@dataclass
class Signal:
    signal_id: str
    group: str            # LINK | DOCUMENT | IDENTIFIER | PROVENANCE
    severity: str         # hard | soft | info
    score: float = 1.0
    explanation: str = ""
    evidence: dict = field(default_factory=dict)


@dataclass
class Match:
    doc_id: str
    same_scheme: bool
    comparison: dict[str, str]          # field -> match | mismatch | not_stated


@dataclass
class Lineage:
    superseded_by: str | None = None
    expired: bool = False
    latest_doc_id: str | None = None


@dataclass
class Ctx:
    claim_fields: list[str]
    signals: list[Signal] = field(default_factory=list)
    debunk_score: float = 0.0
    best_match: Match | None = None
    retrieval_conf: float = 0.0
    lineage: Lineage = field(default_factory=Lineage)


@dataclass
class Decision:
    verdict: Verdict
    reason: str
    detail: dict = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


DEFAULTS = dict(
    retrieval_min_conf=0.55, debunk_min_score=0.85, match_ratio_for_confirmed=0.80,
    min_hard_groups_for_forged=2, allow_single_group_forged=False,
    key_fields=["amount", "deadline", "eligibility", "fee", "benefit"],
)


def _warnings(ctx: Ctx) -> list[str]:
    w = []
    if any(s.severity == "hard" and s.group == "LINK" for s in ctx.signals):
        w.append("Suspicious link: do not click or enter personal/bank details.")
    elif any(s.severity in ("hard", "soft") and s.group == "LINK" for s in ctx.signals):
        w.append("Link is not an official government domain.")
    return w


def decide(ctx: Ctx, cfg: dict | None = None) -> Decision:
    c = {**DEFAULTS, **(cfg or {})}
    hard_groups = {s.group for s in ctx.signals if s.severity == "hard"}

    # 1. Official debunk match
    if ctx.debunk_score >= c["debunk_min_score"]:
        return Decision(Verdict.FORGED, "official_debunk", {"score": ctx.debunk_score})
    # 2. Multiple independent hard signals
    if len(hard_groups) >= c["min_hard_groups_for_forged"]:
        return Decision(Verdict.FORGED, "multi_signal", {"groups": sorted(hard_groups)})
    if c["allow_single_group_forged"] and len(hard_groups) == 1 and "LINK" in hard_groups:
        return Decision(Verdict.FORGED, "single_group_policy", {"groups": sorted(hard_groups)})

    m = ctx.best_match
    # 3. No usable official evidence -> abstain, keep warnings
    if m is None or ctx.retrieval_conf < c["retrieval_min_conf"]:
        return Decision(Verdict.UNVERIFIABLE, "no_official_source", warnings=_warnings(ctx))

    keys = [f for f in c["key_fields"] if f in ctx.claim_fields]
    cmp = m.comparison
    mism = [f for f in keys if cmp.get(f) == "mismatch"]

    # 4. Altered
    if mism and m.same_scheme:
        return Decision(Verdict.ALTERED, "field_mismatch", {"fields": mism}, _warnings(ctx))
    # 5. Outdated
    if ctx.lineage.superseded_by or ctx.lineage.expired:
        return Decision(Verdict.OUTDATED, "superseded_or_expired",
                        {"superseded_by": ctx.lineage.superseded_by, "latest": ctx.lineage.latest_doc_id}, _warnings(ctx))
    # 6. Confirmed
    matched = [f for f in keys if cmp.get(f) == "match"]
    if m.same_scheme and not mism:
        if keys and len(matched) / len(keys) >= c["match_ratio_for_confirmed"]:
            return Decision(Verdict.CONFIRMED, "fields_match", {"doc": m.doc_id}, _warnings(ctx))
        elif not keys and ctx.retrieval_conf >= 0.85:
            return Decision(Verdict.CONFIRMED, "official_identifier_match", {"doc": m.doc_id}, _warnings(ctx))
    return Decision(Verdict.UNVERIFIABLE, "partial_match", warnings=_warnings(ctx))
