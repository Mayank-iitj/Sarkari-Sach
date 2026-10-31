# DESIGN: Sarkari Sach

Design goal: **a 60-year-old on a ₹8,000 phone should get a trustworthy answer in under 15 seconds, in their own language, without reading a paragraph.**

## 1. Principles
1. **Verdict first, evidence second.** Big badge + one sentence, then proof on demand.
2. **Voice and visuals before text.** Every result is speakable.
3. **Never color-only.** Each verdict has icon + word + color.
4. **Show your work.** "Why?" accordion with the exact clause and a highlighted source.
5. **Abstention looks respectable**, not like an error.
6. **Calm, not alarmist.** Even `FORGED` guides to safe action.
7. **Low-bandwidth friendly.** Result page <150 KB, no heavy fonts on first paint, system fallback for Devanagari.

## 2. Verdict language system

| Verdict | Hindi label | Icon | Color (light) | Color (dark) | Tone |
|---|---|---|---|---|---|
| CONFIRMED | सही / पुष्ट | ✔ shield-check | `#0B7A3E` on `#E6F4EA` | `#6EDC9A` on `#0F2A1B` | Reassuring |
| OUTDATED | पुराना / बदल चुका | ⟲ clock-history | `#8A5A00` on `#FFF3D6` | `#F5C451` on `#2E2406` | Informative |
| ALTERED | बदला हुआ | ≠ diff | `#B45309` on `#FFEBD5` | `#FBA55A` on `#33200C` | Cautionary |
| UNVERIFIABLE | पुष्टि नहीं हो सकी | ? help-circle | `#475569` on `#EEF2F6` | `#A8B3C2` on `#1B222B` | Neutral, honest |
| FORGED | नकली | ⚠ shield-alert | `#B3261E` on `#FDE7E5` | `#FF8A80` on `#341412` | Firm, action-oriented |

All pairs meet WCAG AA (≥4.5:1) for text.

## 3. Design tokens

```css
:root {
  --bg: #FAFAF7; --surface: #FFFFFF; --ink: #14181F; --ink-2: #4A5565; --line: #E3E6EA;
  --brand: #1F3A5F;            /* deep navy: institutional trust */
  --brand-accent: #E07A1F;     /* saffron accent used sparingly */
  --radius: 14px; --radius-lg: 20px;
  --shadow: 0 1px 2px rgba(20,24,31,.06), 0 8px 24px rgba(20,24,31,.06);
  --font-ui: "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif;
  --font-display: "Noto Serif", "Noto Serif Devanagari", Georgia, serif;
  --fs-base: 18px;             /* larger base for readability */
  --fs-verdict: clamp(32px, 8vw, 56px);
}
@media (prefers-color-scheme: dark) {
  :root { --bg:#0E1116; --surface:#161B22; --ink:#ECEFF4; --ink-2:#A9B2C0; --line:#262D38; }
}
```
Typography: Noto Sans/Serif families (Indic coverage). Min tap target 48 px. Line-height 1.55 for Indic scripts.

## 4. Information architecture

```
/                    Home: input composer + recent samples
/c/[publicId]        Result + audit trail (public by link)
/c/[publicId]/audit  Full evidence, signals, raw JSON export
/scheme/[id]         Lineage timeline for a scheme
/eval                Live accuracy dashboard
/about               Method, sources, limits, responsible-use
```

## 5. Screens

### 5.1 Home (composer)
```
┌──────────────────────────────────────────┐
│ सरकारी सच            [हिं | EN]          │
│ फॉरवर्ड आया? सच जाँचें।                    │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ संदेश यहाँ पेस्ट करें…                  │ │
│ └──────────────────────────────────────┘ │
│  [📷 फोटो] [📄 PDF] [🔗 लिंक] [🎤 बोलकर]   │
│            ( जाँचें  →  )                 │
│ ─ या आज़माएँ: [नकली योजना] [बदली तारीख]    │
└──────────────────────────────────────────┘
```
- Mic is a hold-to-record big button; waveform feedback.
- Sample chips load pre-cached demo inputs (also used in the judge demo).
- Drag-drop and paste-image supported on desktop.

### 5.2 Progress (streaming)
Vertical stepper driven by SSE:
1. 📖 पढ़ रहे हैं / Reading your message
2. 🔎 सरकारी स्रोत खोज रहे हैं / Searching official sources (shows source chips: PIB, Gazette, myScheme as they hit)
3. 🧪 लिंक और दस्तावेज़ जाँच / Inspecting link & document
4. ⚖️ मिलान / Comparing

Signals appear live as small chips ("lookalike domain found").

### 5.3 Result
```
┌────────────────────────────────────────────┐
│ [⚠]  नकली  FORGED                           │  ← full-width badge, 56px
│ यह लिंक सरकारी वेबसाइट की नकल है।              │  ← one sentence
│ ▶ सुनें (0:24)                               │
│                                            │
│ क्या करें                                    │
│  ✗ लिंक पर क्लिक न करें                       │
│  ✗ आधार/बैंक जानकारी न डालें                   │
│  ✓ असली साइट: pmkisan.gov.in                  │
│                                            │
│ [ ⤴ शेयर कार्ड ]  [ WhatsApp पर भेजें ]        │
│                                            │
│ ▾ क्यों? (Why)                               │
│   • नकली डोमेन: pmkisan-yojana.in ≈ pmkisan.gov.in │
│   • पंजीकरण 6 दिन पुराना                       │
│   • ₹250 शुल्क — आधिकारिक दिशानिर्देश: कोई शुल्क नहीं │
│ ▾ प्रमाण (Evidence) → highlighted clause     │
│ ▾ इतिहास (Lineage) → timeline                │
│ ▾ तकनीकी जाँच (Signals) → table              │
└────────────────────────────────────────────┘
```
For `ALTERED`: **Diff panel** (two columns: "आपके संदेश में / In your message" vs "सरकारी दस्तावेज़ में / Official document") with changed values highlighted and the Gazette snippet beneath.
For `OUTDATED`: Lineage timeline with "आप यहाँ देख रहे थे" marker and "अब लागू" marker.
For `UNVERIFIABLE`: "हमने ये स्रोत खोजे" list + "यहाँ खुद जाँचें" deep links + safe-behaviour tips. No confidence percentage.

### 5.4 Audit page (`/c/[id]/audit`)
Tabs: Summary · Evidence · Signals · Timeline · Provenance (snapshot id, model, prompt version, timings) · JSON. Permanent link, printable. A "How to reproduce" snippet.

### 5.5 Eval dashboard (`/eval`)
- Headline tiles: macro-F1, FORGED precision, false-FORGED rate, citation validity, abstention rate.
- Confusion matrix heatmap.
- Per-verdict P/R bars.
- Case browser (filter correct/incorrect) showing input thumbnail, expected vs. predicted, and a link to the audit page.
- "Known failures" section (honesty = credibility).

### 5.6 Lineage page
Horizontal timeline of notifications with change chips ("amount ₹6,000 → ₹6,000", "deadline extended") and a compare-two-versions view.

## 6. Verified card (shareable)

Square 1080×1080 and OG 1200×630. Template (HTML → PNG via Playwright):
```
┌──────────────────────────────────┐
│ सरकारी सच ✔ Checked against official source │
│                                  │
│  [BADGE]  ALTERED · बदला हुआ        │
│                                  │
│  संदेश: "₹12,000 सालाना"            │
│  सरकारी: "₹6,000 सालाना"            │
│  स्रोत: PIB, 24 Feb 2019, Para 2.1   │
│                                  │
│  [QR → /c/K7QX2M9A]   sach.app/K7QX2M9A │
│  AI-assisted · जाँच: 31 Oct 2026     │
└──────────────────────────────────┘
```
Rules: always includes source name + date + clause, QR to audit page, snapshot date, and an "AI-assisted, verify at source" footer. Forged cards never reproduce the malicious URL as a clickable/visible full link (show as `pmkisan-yojana[.]in`).

## 7. Components (shadcn-based)
`Composer`, `VoiceRecorder`, `StageStepper`, `SignalChip`, `VerdictBadge`, `ReplyPanel` (text + `AudioPlayer`), `DiffTable`, `EvidenceViewer` (highlighted passage), `LineageTimeline`, `SignalsTable`, `ShareSheet`, `LangToggle`, `EvalTiles`, `ConfusionMatrix`.

## 8. Interaction details
- Autodetect language; reply language selectable post-hoc ("दूसरी भाषा में सुनें").
- OCR text shown in an editable box before verification if confidence <0.7 ("क्या यह सही पढ़ा?").
- Skeleton screens; SSE reconnect; offline notice.
- Copy buttons for quote and citation. Share uses Web Share API with fallback to WhatsApp deep link `https://wa.me/?text=`.
- Motion: subtle 200 ms transitions; respect `prefers-reduced-motion`.

## 9. Accessibility checklist
- WCAG 2.1 AA; focus rings; semantic landmarks; `aria-live="polite"` on progress and verdict.
- Verdict announced by screen reader: "Result: Forged."
- Captions/transcript for audio; adjustable text size (A−/A+).
- Touch targets ≥48 px; works one-handed.
- Avoid jargon; reading level ≤ grade 6 in all verdict copy.

## 10. Content design (copy bank)

| Key | Hindi | English |
|---|---|---|
| forged.headline | यह सूचना नकली है। | This notice is fake. |
| forged.action | इस पर पैसे या जानकारी न दें। | Do not pay or share details. |
| altered.headline | असली सूचना है, पर आँकड़े बदले गए हैं। | Real notice, but the details were changed. |
| outdated.headline | यह नियम अब बदल चुका है। | This rule has changed. |
| confirmed.headline | सरकारी दस्तावेज़ से मेल खाता है। | Matches the official document. |
| unverifiable.headline | हमें इसकी पुष्टि का सरकारी स्रोत नहीं मिला। | We couldn't find an official source to confirm this. |
| footer.ai | AI की मदद से जाँचा गया। आधिकारिक साइट पर भी देखें। | AI-assisted. Please also check the official site. |

Translations for all strings reviewed by a native speaker before demo.

## 11. Brand
Name: **Sarkari Sach / सरकारी सच** (note: avoid government emblem/Ashoka lion/tricolor misuse; use own mark: shield + check). Tagline: *"Source dikhao, sach batao."* / "Show the source, get the truth."
