# DEMO & PITCH: Sarkari Sach

## 1. Positioning (say this first)
> "Most misinformation in Indian governance isn't a deepfake. It's a forwarded fake circular, a changed deadline, a lookalike link. Fact-checkers can't scale to every forward, and chatbots hallucinate rules. Sarkari Sach checks a forward against the **primary source**, shows the **exact clause**, and when it can't verify, it **says so**."

## 2. 90-second live demo

| t | Scene | Input | What judges see | Say |
|---|---|---|---|---|
| 0:00 | Hook | – | Home screen, Hindi UI | "This landed in a family WhatsApp group." |
| 0:08 | **Scene 1: FORGED** | Image: fake scheme poster ("₹12,000, ₹250 fee, apply on pmkisan-yojana[.]in") | Stepper → signals pop in live → FORGED badge, defanged lookalike domain, fee contradiction vs. official clause | "Two independent signals: lookalike domain and a fee the official guideline says doesn't exist. Not a vibe, evidence." |
| 0:30 | **Scene 2: ALTERED** | Real notice screenshot with a changed deadline/amount | Diff panel: claim vs. Gazette/PIB text, highlighted clause | "A real notice, but someone changed the number. Here's the original, clause and date." |
| 0:50 | **Scene 3: OUTDATED + voice** | Hindi voice note: "kya ye niyam abhi bhi lagu hai?" | Transcript → lineage timeline → Hindi voice reply | "Old rule, superseded in 2023. The lineage shows exactly what changed." |
| 1:10 | **Scene 4: Abstain** | Vague rumor | UNVERIFIABLE with "we searched PIB, Gazette, myScheme; none found" + official links | "It abstains rather than invents." |
| 1:20 | Numbers | `/eval` | Tiles: FORGED precision, false-FORGED 0/20 on genuine docs, citation validity 100%, abstention % + baseline comparison | "We tested on N held-out items. Baseline LLM hallucinated sources X% of the time; we hallucinate 0 by construction." |
| 1:30 | Close | Share card | Card forwarded back to group | "Verified answer goes back where the lie spread." |

**Rehearsal rules:** every scene pre-cached (instant) and runnable live. Disable network once to prove offline mode. Have a screen recording as backup.

## 3. Three-minute pitch structure
1. **Problem (30 s):** real examples of fake circulars; harm (scams, missed benefits, MSME penalties).
2. **Insight (20 s):** verify against primary sources, not popularity; abstain when unsure.
3. **Solution (30 s):** what it does, pipeline in one sentence.
4. **Demo (90 s):** above.
5. **Tech credibility (20 s):** hybrid retrieval + deterministic verdict engine + citation validator + forensics; LLM never decides.
6. **Impact & roadmap (20 s):** WhatsApp bot, more states/languages, scheme-watch alerts, partnership with fact-checkers / consumer-help organisations.
7. **Ask (10 s).**

## 4. Slide outline (8 slides max)
1. Title + tagline
2. "The forward problem" with 3 real-style examples
3. Why existing approaches fail (table)
4. How it works (diagram from SYSTEM_DESIGN §1, simplified)
5. Verdicts + the two-signal `FORGED` rule + abstention
6. Live demo (or screenshots)
7. Results table + baselines + failure modes
8. Roadmap + responsible-use commitments

## 5. Judge Q&A prep

| Question | Answer |
|---|---|
| *How is this different from PIB Fact Check / Alt News?* | They are manual, post-hoc, and cover viral items. We're an on-demand, instant, primary-source check with clause-level citations and lineage; we also *use* PIB Fact Check as a signal and ground truth. |
| *Why not just ask ChatGPT?* | Baseline B0 in our eval: LLM-only hallucinated sources and over-asserted. We force every statement to a validated quote and abstain. |
| *What if the forgery is perfect?* | If a forged copy of a *real* notice has identical content, the content is true to the source; if content differs, we flag ALTERED. Forensics add independent evidence, but we never rely on one weak signal. |
| *Can it falsely accuse?* | `FORGED` needs two independent hard signals or an official debunk. Controls: 0 false-FORGED on N genuine docs. Residual risk acknowledged, with feedback + audit trail. |
| *What about languages?* | Hindi/English now, parity measured; architecture is language-agnostic (bge-m3, LLM, ASR/TTS provider swap). |
| *Coverage?* | Central-government sources first; UI says "out of coverage" instead of guessing. State portals via adapters. |
| *Scalability?* | Stateless workers; pgvector HNSW fine to millions of chunks; switch to dedicated vector DB beyond. Biggest cost is LLM calls: cached, ≤6 per check. |
| *Privacy?* | 24 h artifact TTL, PII redaction in logs, no accounts, deletion tokens, DPDP-aligned principles. |
| *Business/sustainability?* | Free for citizens; B2B/NGO APIs for banks, telcos, and newsrooms; sponsored by consumer-protection bodies; open-source core. |
| *What are the limits?* | Image forensics is weak after WhatsApp recompression; lineage verified for seed schemes; eval small and partly synthetic (disclosed). |
| *Why trust your numbers?* | Frozen snapshot/prompt/model, held-out test, bootstrap CIs, reproducible `make eval-test`. |

## 6. Judging-criteria checklist (map to what you show)
- [ ] **Alignment with track:** Explainer (#1) + verification (#4) explicitly named in slide 2/3.
- [ ] **Novelty:** primary-source + lineage + abstention + forensics combo.
- [ ] **Technical depth:** show the pipeline diagram and signals table on screen for 5 s.
- [ ] **Working demo:** zero-network run.
- [ ] **Evidence of impact:** eval numbers, baselines, failure modes.
- [ ] **Responsible AI:** two-signal rule, audit trail, privacy.
- [ ] **Polish:** Hindi UI, voice reply, share card.

## 7. Fallback plan (demo day)
| Failure | Plan |
|---|---|
| LLM API down | `LLM_PROVIDER=fake` replay cache for the four scripted cases; or local Ollama model |
| Wi-Fi dead | `OFFLINE_MODE=true`; everything cached; TTS cached MP3s |
| TTS fails | Pre-generated MP3s for demo cases |
| Laptop dies | Screen recording + deployed copy + slides with screenshots |
| Judge brings a new input | Run live; if UNVERIFIABLE, narrate it as the feature: "this is exactly the abstention path" |

## 8. README "Project story" blurb (copy-paste)
> **Sarkari Sach** verifies forwarded government claims against primary sources (PIB, e-Gazette, official scheme portals). It extracts the claim, retrieves the governing clause, runs forgery forensics on the link and document, and returns one of five verdicts with citations, or abstains. Replies come in the user's language as text and voice, with a shareable verified card. Accuracy is measured on a held-out set built from PIB-debunked claims and controlled alterations, with 0 hallucinated citations enforced by a quote validator.
