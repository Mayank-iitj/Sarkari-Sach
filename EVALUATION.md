# EVALUATION: Sarkari Sach

Most teams will show no numbers. A small, honest, reproducible eval is your strongest differentiator. **Honesty about how the set was built matters more than a high score.**

## 1. Test set design (target 80-100 items; minimum viable 60)

| Class | Target n | How to build | Label source |
|---|---|---|---|
| FORGED (real-world fakes) | 20-25 | PIB Fact Check debunked claims (text of the claim; screenshots where available) | PIB Fact Check verdict |
| FORGED (phishing link/poster) | 8-10 | Synthetic posters/messages pointing to **typosquatted domains you create as strings** (do not host or register them) | Constructed |
| ALTERED | 15-20 | Take real official documents, change amount/deadline/eligibility, render as forward-style image/text | Constructed (labeled `synthetic: true`) |
| OUTDATED | 10-12 | Real superseded notifications / expired deadlines from lineage chains | Official lineage + manual verification |
| CONFIRMED | 12-15 | Real, current official content re-shared (screenshot recompressed WhatsApp-style) | Official doc |
| UNVERIFIABLE | 8-10 | Claims with no official source: vague rumors, local-scheme claims outside coverage | Manual: "no official source after exhaustive search" |
| Control: genuine docs | 20 | Genuine PDFs/screenshots of official docs (any verdict CONFIRMED/OUTDATED acceptable but **never FORGED**) | Official |
| Injection / adversarial | 6-8 | Prompt-injection text, homoglyph tricks, benign-looking-but-suspicious TLDs, real `.gov.in` links with fake text | Constructed |

Item schema (`eval/data/cases.jsonl`):
```json
{"id":"F-007","split":"test","input":{"type":"image","path":"eval/data/img/F-007.jpg","text":null},
 "lang":"hi","expected_verdict":"FORGED","synthetic":false,
 "source_label":"pib_factcheck","source_url":"https://pib.gov.in/...",
 "expected_citation_doc":null,"notes":""}
```

## 2. Splits & leakage rules
- **dev (40%)**: tune thresholds, prompts, forensics calibration.
- **test (60%)**: touched **once** per reported run, never for tuning.
- Debunks used as retrieval index during test must exclude the test items' own debunk entries (`--holdout-debunks`). Otherwise `FORGED` accuracy is leakage.
- Few-shot examples never come from the test split.
- Freeze `corpus_snapshot`, `prompt_version`, `model_id` per reported run.

## 3. Metrics

| Metric | Definition |
|---|---|
| Verdict accuracy (answered) | Accuracy on items where system did not abstain |
| Macro-F1 | Over {CONFIRMED, OUTDATED, ALTERED, FORGED}, abstentions counted as incorrect for *coverage-adjusted* variant |
| Per-class precision/recall | Report especially **FORGED precision** and **ALTERED recall** |
| False-FORGED rate | FORGED predictions on control/genuine set ÷ genuine items. **Target ≤2%; hard-fail CI if >0 on controls** |
| Abstention rate | UNVERIFIABLE ÷ all; reported with correct-abstention rate on true-UNVERIFIABLE |
| Selective accuracy | Accuracy vs. coverage curve (shows value of abstaining) |
| Citation validity | % of cited quotes that are substrings of retrieved text (should be 100% by construction) **and** % judged supportive by manual review on a 30-item sample |
| Hallucinated-source rate | Cited doc/URL not in corpus → must be 0 |
| Lineage correctness | For OUTDATED set: % where reported successor equals gold successor |
| Field-diff accuracy | For ALTERED: % where reported changed field(s) equal gold changed field(s) |
| Multilingual parity | Macro-F1 Hindi vs. English subset |
| Latency | p50/p95 per input type |
| Robustness | Accuracy on recompressed (JPEG q60-75, resize) versions; injection pass rate |
| Cost | Mean LLM calls and tokens per check |

Report **bootstrap 95% CIs** (1,000 resamples). With n≈60 test items, intervals are wide; say so.

## 4. Baselines (shows value)
| Baseline | Purpose |
|---|---|
| B0: LLM-only, no retrieval ("is this real?") | Shows hallucination/overconfidence |
| B1: RAG without forensics | Shows forensics value on FORGED |
| B2: Full system without abstention (force a class) | Shows abstention value |
| B3 (optional): keyword/URL blocklist | Shows rule-only limits |

Present a single table: baseline vs. full system on macro-F1, FORGED precision, false-FORGED rate, hallucinated-source rate.

## 5. Harness

```
eval/
  data/cases.jsonl, img/, pdf/, audio/
  run.py            # runs cases through pipeline (in-process, no HTTP), writes results.jsonl
  score.py          # metrics + bootstrap CIs + confusion matrix
  report.py         # writes eval/report.md and eval/report.json (served by /v1/eval/latest)
  baselines.py
  adversarial.py    # recompress, noise, crop, injection wrappers
```
Commands:
```bash
make eval            # dev split, prints metrics
make eval-test       # test split, snapshot+prompt frozen, writes report
make eval-baselines
```
`run.py` flags: `--split dev|test`, `--no-network`, `--holdout-debunks`, `--seed 7`, `--limit N`.

## 6. Report format (`eval/report.md`)
1. Header: date, commit, snapshot, model, prompt version, n per class, synthetic share.
2. Headline table (metrics with CIs).
3. Confusion matrix.
4. Baseline comparison.
5. Selective-accuracy curve.
6. Failure analysis: top 10 errors with cause (OCR, retrieval miss, lineage gap, comparison error, threshold).
7. **Known limitations** (coverage window, languages, synthetic share, small n).
8. Reproduction instructions.

## 7. CI gates (GitHub Actions)
- Unit tests pass.
- Dev-split eval: macro-F1 not worse than baseline by >2 pts; **false-FORGED on controls = 0**; hallucinated-source = 0; citation validity = 100%.

## 8. Manual review protocol (30 items)
Two reviewers (you + teammate) independently mark: verdict correct? citation supportive? explanation faithful (no new facts)? translation preserves numbers/dates/domain? Report Cohen's κ if two reviewers.

## 9. Ethics of the eval
- Synthetic fakes are **never** published as shareable images without a watermark "SAMPLE – NOT REAL" in the repo's public data.
- Don't register or host lookalike domains; use strings only.
- Disclose synthetic share of the test set on the eval page.

## 10. What to say to judges
"We evaluated on N held-out items: M real PIB-debunked claims and K synthetic alterations. FORGED precision X, false-FORGED on genuine documents 0/20, citation validity 100% enforced by construction, abstention Y%. Here are our top failure modes."
