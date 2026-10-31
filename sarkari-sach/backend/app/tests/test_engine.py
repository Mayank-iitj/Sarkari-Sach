from app.verdict.engine import Ctx, Match, Lineage, Signal, Verdict, decide

H = lambda sid, g: Signal(sid, g, "hard")
S = lambda sid, g: Signal(sid, g, "soft")
FIELDS = ["amount", "deadline", "fee"]
good = Match("d1", True, {"amount": "match", "deadline": "match", "fee": "match"})

def test_debunk_forged():
    assert decide(Ctx(FIELDS, debunk_score=0.9)).verdict == Verdict.FORGED

def test_two_groups_forged():
    c = Ctx(FIELDS, [H("LINK_LOOKALIKE", "LINK"), H("FEE_CONTRADICTION", "IDENTIFIER")])
    assert decide(c).verdict == Verdict.FORGED

def test_single_group_not_forged():
    c = Ctx(FIELDS, [H("LINK_LOOKALIKE", "LINK"), H("LINK_NEW_DOMAIN", "LINK")])
    d = decide(c)
    assert d.verdict == Verdict.UNVERIFIABLE and d.warnings

def test_single_group_policy_flag():
    c = Ctx(FIELDS, [H("LINK_LOOKALIKE", "LINK")])
    assert decide(c, {"allow_single_group_forged": True}).verdict == Verdict.FORGED

def test_soft_signals_never_forge():
    c = Ctx(FIELDS, [S("a", "DOCUMENT"), S("b", "LINK"), S("c", "IDENTIFIER")], best_match=good, retrieval_conf=0.9)
    assert decide(c).verdict == Verdict.CONFIRMED

def test_altered():
    m = Match("d1", True, {"amount": "mismatch", "deadline": "match", "fee": "match"})
    d = decide(Ctx(FIELDS, best_match=m, retrieval_conf=0.9))
    assert d.verdict == Verdict.ALTERED and d.detail["fields"] == ["amount"]

def test_outdated():
    c = Ctx(FIELDS, best_match=good, retrieval_conf=0.9, lineage=Lineage(superseded_by="d2", latest_doc_id="d2"))
    assert decide(c).verdict == Verdict.OUTDATED

def test_low_retrieval_abstains():
    assert decide(Ctx(FIELDS, best_match=good, retrieval_conf=0.3)).verdict == Verdict.UNVERIFIABLE

def test_no_match_abstains():
    assert decide(Ctx(FIELDS)).verdict == Verdict.UNVERIFIABLE

def test_different_scheme_not_altered_or_confirmed():
    m = Match("d9", False, {"amount": "mismatch", "deadline": "match", "fee": "match"})
    assert decide(Ctx(FIELDS, best_match=m, retrieval_conf=0.9)).verdict == Verdict.UNVERIFIABLE

def test_partial_match_abstains():
    m = Match("d1", True, {"amount": "match", "deadline": "not_stated", "fee": "not_stated"})
    assert decide(Ctx(FIELDS, best_match=m, retrieval_conf=0.9)).verdict == Verdict.UNVERIFIABLE
