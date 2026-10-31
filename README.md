# Sarkari Sach (सरकारी सच)

**A primary-source verifier for government claims and forged notices.**
Forward a viral "circular", scheme poster, deadline, or link in any Indian language. Get back a *cited* verdict, forgery forensics, and a regional-language voice reply, plus a shareable "verified card" to forward back into the same group.

> Verdicts: `CONFIRMED` · `OUTDATED` · `ALTERED` · `UNVERIFIABLE` · `FORGED`
> Rule zero: **no citation, no verdict. When unsure, abstain.**

Track: *Civic Pulse, Digital Governance & Public Information* (intersection of Problem 1: Policy Explainer and Problem 4: Fact-Verification).

---

## Doc index

| File | Purpose |
|---|---|
| `docs/PRD.md` | Problem, users, scope, features, success metrics, judging map |
| `docs/TRD.md` | Technical requirements, pipeline, verdict engine, NFRs |
| `docs/TECH_STACK.md` | Every tool chosen, why, and fallbacks |
| `docs/SYSTEM_DESIGN.md` | Architecture, data flow, DB schema, deployment |
| `docs/API.md` | REST/SSE API spec with schemas and errors |
| `docs/DESIGN.md` | UX, screens, design tokens, share card, accessibility |
| `docs/CORPUS_AND_LINEAGE.md` | Official source ingestion, parsing, lineage model |
| `docs/FORENSICS.md` | Every forgery detector, signals, weights, code |
| `docs/PROMPTS.md` | All LLM prompts and JSON schemas |
| `docs/EVALUATION.md` | Ground-truth set, metrics, harness, report format |
| `docs/SECURITY_ETHICS.md` | Threat model, SSRF, legal, responsible-use rules |
| `docs/BUILD_PLAN.md` | Phased plan, cut lines, repo layout, task list |
| `docs/DEMO_AND_PITCH.md` | 90-sec demo script, pitch, Q&A, fallback plan |

## Read order
`PRD → TRD → SYSTEM_DESIGN → BUILD_PLAN`, then the rest as you implement.

## Quickstart (target state)
```bash
git clone <repo> && cd sarkari-sach
cp .env.example .env            # add ANTHROPIC_API_KEY (or other LLM key)
docker compose up -d db redis
make ingest                     # scrape + parse + embed official corpus
make eval                       # runs ground-truth eval, writes eval/report.md
docker compose up api web       # http://localhost:3000
```

## Day-1 truth check (do this before anything else)
I could not verify live portal structures from here. Spend the first 60-90 minutes on a **corpus feasibility spike** (see `BUILD_PLAN.md` Phase 0): confirm you can fetch and parse PIB releases, the Gazette, and one scheme portal from your network. Government sites sometimes block cloud IPs or change layout. If a source fails, swap per the fallback table in `CORPUS_AND_LINEAGE.md`. Cache everything locally so the demo never depends on a live government site.
# Sarkari-Sach
