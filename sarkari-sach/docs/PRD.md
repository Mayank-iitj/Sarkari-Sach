# PRD: Sarkari Sach

Version 1.0 · Track: Civic Pulse, Digital Governance & Public Information

---

## 1. One-line pitch
Forward any government claim, get back a verdict that cites the exact clause of the official document, or an honest "I can't verify this."

## 2. Problem

### 2.1 What actually spreads in India
The most damaging misinformation in governance is rarely a deepfake. It is:

- **Fake circulars/notices** with copied letterheads ("PM Yojana: ₹5,000 for every woman, apply by Friday").
- **Fake schemes with fee/phishing links** (lookalike `.gov`-style domains, APK downloads).
- **Altered real notices** (real document, changed amount, deadline, or eligibility).
- **Outdated rules** shared as current (superseded notifications, withdrawn schemes, expired deadlines).
- **Fake penalties/deadlines** ("Aadhaar will be blocked", "FASTag deactivated tomorrow").

### 2.2 Why current tools fail
| Tool | Gap |
|---|---|
| Manual fact-checkers (PIB Fact Check, media desks) | Slow, only cover viral claims, not queryable by a citizen at 11 pm |
| Generic "fake news" classifiers | Judge writing style or popularity, not the primary source; hallucinate |
| Deepfake detectors | Wrong threat: most forgeries are plain edited images/PDFs |
| Scheme explainer chatbots | Answer from model memory; no clause citation; no "what changed" |
| Search | Returns SEO sites and the forged page itself |

### 2.3 Who is hurt
Rural and semi-urban citizens (scam losses, missed real benefits), small business owners (acting on wrong compliance deadlines), students (fake scholarship links), and elderly users on WhatsApp.

## 3. Product vision
A **verifier of record**: it never decides from vibes; it decides from official documents, shows its work, and says "unverifiable" when it cannot.

## 4. Target users & personas

| Persona | Need | Channel |
|---|---|---|
| **Sunita**, 48, kirana shop owner, Hindi | "Is this GST/penalty message real?" | Voice note / photo |
| **Ravi**, 20, student, Tamil/English | "Is this scholarship link real?" | Link + screenshot |
| **Ramesh uncle**, 62, WhatsApp groups | Verify forwards, forward the verified answer back | Share card |
| **Priya**, journalist / fact-checker | Fast triage with an audit trail | Web, export |
| **Judge/evaluator** | See rigor, numbers, safety | Demo + eval report |

Primary persona for design: **Sunita** (low literacy tolerance, voice-first, Hindi-first).

## 5. Goals & non-goals

### Goals (v1)
1. Accept text, image, PDF, URL, and voice note input.
2. Extract structured claim(s) from the input.
3. Retrieve from **primary official sources only**.
4. Output one of five verdicts with clause-level citations, or abstain.
5. Run forgery forensics on artifacts and links.
6. Show **claim lineage** (what the rule said before vs. now).
7. Reply in the user's language (text + voice) and produce a shareable verified card.
8. Publish measurable accuracy on a labeled test set.

### Non-goals (v1)
- General fact-checking of political opinions, news, or non-government claims.
- Deepfake video/audio detection (explicitly out of scope; documented).
- Legal advice. We verify against documents; we do not interpret rights for individual cases.
- Covering all states. v1 = central govt + one scheme portal + optionally one state.
- Auto-reporting to authorities (v2).

## 6. Verdict definitions (contract)

| Verdict | Meaning | Minimum evidence |
|---|---|---|
| `CONFIRMED` | Claim matches a current official document | ≥1 official doc, clause quoted, all key fields match, not superseded |
| `OUTDATED` | Was true, superseded or expired | Official doc found + later doc/expiry that supersedes, both cited |
| `ALTERED` | Real source exists but claim differs on key fields | Matched official doc + field-level diff (amount/date/eligibility) |
| `FORGED` | Artifact/link is fabricated or impersonates an official source | **≥2 independent hard signals** OR a match to an official debunk (PIB Fact Check) |
| `UNVERIFIABLE` | Not enough official evidence | Default when retrieval confidence is low or sources conflict |

**Hard rule:** `FORGED` is the highest-cost error. It requires two independent hard forensic signals or an official debunk match. Anything weaker downgrades to `UNVERIFIABLE` with a **risk flag** ("suspicious link; do not enter details").

## 7. Features

### P0: must work in the demo
| ID | Feature | Acceptance |
|---|---|---|
| F1 | Multimodal ingest (text, image, PDF, URL, voice) | Each type produces normalized text + artifact record |
| F2 | Claim extraction | Returns scheme, benefit, amount, deadline, eligibility, fee, link, issuing authority, with confidence |
| F3 | Primary-source hybrid retrieval | Top-k from official corpus only; each hit has doc id, URL, date |
| F4 | Clause-grounded verdict | JSON verdict; every statement cites doc + span; invalid citation → abstain |
| F5 | Forensics: link | Lookalike/typosquat, non-gov TLD, redirect chain, domain age flag |
| F6 | Forensics: document | PDF metadata, font/producer anomalies, file-number/date pattern check, QR decode |
| F7 | Regional-language reply | Hindi + English (v1), text + audio |
| F8 | Verified card | PNG 1080×1080 + OG link with verdict, citation, QR to audit page |
| F9 | Audit trail page | Every verdict has a permanent page with evidence and signals |
| F10 | Eval dashboard | Precision, recall, abstention, false-FORGED rate from the real test set |

### P1: strong differentiators
| ID | Feature |
|---|---|
| F11 | **Claim lineage timeline** (versions of a rule, effective dates, diffs) |
| F12 | Side-by-side field diff (claim vs. official) |
| F13 | Third language (Tamil or Bengali) |
| F14 | WhatsApp sandbox bot (Twilio) |
| F15 | "Watch this scheme": notify when official source changes (v1.5) |

### P2: stretch
Browser extension, batch mode for journalists, state portal #2, community "report forged" feed with moderation.

## 8. User flows

**Flow A: Citizen with a forward**
1. Open app (or WhatsApp) → paste/upload/record.
2. See streaming progress ("Reading… Finding official sources… Checking link…").
3. Result: big verdict badge, 2-line plain explanation in their language, "Listen" button, evidence accordion, share button.
4. Share card goes back to the group.

**Flow B: Journalist**
Upload → verdict → open audit page → export JSON/PDF evidence.

**Flow C: Abstain**
Low confidence → `UNVERIFIABLE` → show what was searched, where to check officially, and safe-behaviour tips (don't pay, don't click).

## 9. Success metrics

### Product (demo-time, measured on the test set)
| Metric | Target |
|---|---|
| Verdict macro-F1 (excluding UNVERIFIABLE) | ≥ 0.80 |
| FORGED precision | ≥ 0.95 |
| False-FORGED rate on genuine docs | ≤ 2% |
| Citation validity (cited span actually supports claim) | ≥ 95% |
| Hallucinated-source rate | 0% (enforced by validator) |
| Abstention rate | 10-25% (reported, not hidden) |
| p50 latency (text) | ≤ 10 s; (image/PDF) ≤ 20 s |

### Adoption (post-hackathon)
Checks/day, share-card forward rate, % users who return, % of "Forged" verdicts later confirmed by official debunk.

## 10. Judging map

| Likely criterion | How Sarkari Sach answers |
|---|---|
| Problem relevance / track alignment | Hits #1 (plain-language explain) + #4 (verification) directly, plus civic grievance of scams |
| Innovation | Primary-source + lineage + forensics + abstention; not a generic classifier |
| Technical depth | Hybrid retrieval, deterministic verdict engine, citation validator, forensics suite |
| Real-world feasibility | Uses public official sources; works on WhatsApp-style forwards |
| Measurable impact | Published eval numbers on real PIB-debunked claims |
| Responsible AI | Abstention, audit trail, `FORGED` double-evidence rule, no personal data retention |
| Demo quality | 90-sec scripted flow, reproducible with cached corpus |

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Official portals block scraping or change layout | Cache corpus; adapter per source; fallback sources table |
| LLM hallucinated citation | Validator: every quote must be a substring of retrieved text |
| False `FORGED` harms reputation | Two-signal rule; downgrade path; human-readable signals |
| OCR errors in regional text | Vision-LLM OCR + Tesseract cross-check; show extracted text for user correction |
| Corpus too small to be convincing | Narrow domain (see §12), go deep over wide |
| Time | Cut lines in `BUILD_PLAN.md` |

## 12. Scope decision (v1 corpus)
- **PIB** press releases (fact checks + announcements)
- **e-Gazette** notifications (subset: last 12-18 months, selected ministries)
- **One scheme portal** (myScheme or equivalent) for scheme eligibility/benefit data
- Optional depth domain: **MSME compliance** (GST/MSME/Udyam/EPFO notices) if time allows

Languages v1: Hindi, English. v1.5: Tamil or Bengali.

## 13. Open questions
1. Which exact schemes/notices to seed the demo with (choose ones with documented viral fakes).
2. Hosting region for latency to Indian govt sites (some block foreign IPs).
3. TTS provider quality for Hindi (benchmark in Phase 0).
