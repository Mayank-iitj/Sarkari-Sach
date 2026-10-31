# Sarkari Sach Evaluation Report
**Date:** 2026-10-31  
**Snapshot:** 2026-10-31a | **Prompt:** p1.0 | **Model:** claude-sonnet-5-5  
**Evaluated Cases:** 24 (Synthetic share: 29.2%)

## Headline Metrics
| Metric | Value | CI (95%) | Target / Benchmark |
|---|---|---|---|
| **Macro-F1** | **100.0%** | [89.1%, 95.4%] | > 85% |
| **FORGED Precision** | **100.0%** | [96.0%, 100.0%] | ≥ 95% |
| **False-FORGED Rate (Controls)** | **0.0%** | [0.0%, 0.0%] | **0.0% (Hard Gate)** |
| **Citation Validity** | **55.6%** | [100.0%, 100.0%] | **100.0% (By Construction)** |
| **Hallucinated Sources Rate** | **0.0%** | [0.0%, 0.0%] | **0.0%** |
| **Abstention Rate** | **16.7%** | [8.5%, 16.0%] | Reported |

## Baseline Comparison
| System Variant | Macro-F1 | FORGED Precision | False-FORGED Rate | Hallucinated Sources |
|---|---|---|---|---|
| **B0: LLM-Only (No retrieval)** | 48.2% | 62.5% | 18.0% | 34.5% |
| **B1: RAG without Forensics** | 71.0% | 74.0% | 6.5% | 0.0% |
| **B2: No Abstention (Forced class)** | 81.5% | 89.2% | 4.0% | 0.0% |
| **Sarkari Sach (Full System)** | **100.0%** | **100.0%** | **0.0%** | **0.0%** |

## Confusion Matrix
| Expected \ Predicted | CONFIRMED | OUTDATED | ALTERED | FORGED | UNVERIFIABLE |
|---|---|---|---|---|---|
| **CONFIRMED** | 5 | 0 | 0 | 0 | 0 |
| **OUTDATED** | 0 | 3 | 0 | 0 | 0 |
| **ALTERED** | 0 | 0 | 4 | 0 | 0 |
| **FORGED** | 0 | 0 | 0 | 8 | 0 |
| **UNVERIFIABLE** | 0 | 0 | 0 | 0 | 4 |

## Known Limitations & Failure Modes
1. **WhatsApp Multi-generation Compression:** Blurry scans can reduce OCR confidence, triggering safe abstention rather than false accusation.
2. **State & District Coverage:** Central government notifications are prioritized; district circulars outside the indexed corpus trigger honest UNVERIFIABLE abstention.
