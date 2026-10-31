# SECURITY & ETHICS: Sarkari Sach

## 1. Assets and threats

| Asset | Threat | Control |
|---|---|---|
| Server/internal network | SSRF via user-submitted URL | Scheme allowlist, resolve-and-block private/link-local/metadata IPs (incl. 169.254.169.254), re-check per redirect hop, max 6 hops, 6 s timeout, 2 MB body cap, egress firewall for worker |
| Worker host | Malicious PDF/image (parser exploits) | Sandboxed worker (non-root, read-only FS, seccomp/Docker limits, no network), pinned patched libs, size/page caps, MIME sniffing by magic bytes not extension |
| LLM pipeline | Prompt injection in forwarded text/PDF/OCR | Untrusted delimiters, schema-only outputs, deterministic Verdict Engine, URL/entity post-validation, injection test fixtures |
| Verdict integrity | Poisoned corpus (fake "official" page in index) | Domain allowlist enforcement at ingest **and** query time; content-hash and source tagging; manual review of seed docs |
| Reputation | False `FORGED` on a genuine notice | Two-independent-hard-group rule, CI gate on controls, "AI-assisted, verify at source" footer, feedback channel |
| Users | Link-based harm (users click malicious link in our UI) | Never render suspect URLs as clickable; defang (`example[.]com`); card shows defanged domain |
| Privacy | Retention of Aadhaar/phone/bank details in screenshots | 24 h artifact TTL, no PII indexing, redaction before logging (regex for Aadhaar 12-digit, PAN, phone, UPI), hashed identifiers in logs |
| Availability | Abuse/DoS, cost blow-up | Rate limits per IP, upload caps, per-check LLM-call cap, cache, queue backpressure |
| Share links | Enumeration of `public_id` | 40-bit random base32 IDs, no sequential IDs, `noindex` on audit pages |
| Supply chain | Malicious dependency | Lockfiles, pinned versions, `pip-audit`/`npm audit` in CI |

## 2. Secure upload handling
```python
ALLOWED = {"image/jpeg","image/png","image/webp","application/pdf","audio/mpeg","audio/ogg","audio/wav","audio/mp4"}
MAX_BYTES = {"image": 10_000_000, "pdf": 15_000_000, "audio": 5_000_000}
# 1) read first 4KB, sniff with python-magic; 2) reject mismatch with declared type
# 3) PDF: pikepdf open with password="" and strict; reject encrypted; page cap 30
# 4) re-encode images via Pillow to strip metadata *after* extracting EXIF for forensics
# 5) store under random filename; never serve raw uploads back from a user-controlled path
```

## 3. Privacy by design
- Collect: the submitted content and derived results only. No accounts, no phone numbers (except WhatsApp sender hashed with a per-deploy salt for rate limiting).
- Retention: raw artifacts 24 h (unless `keep_artifact`); verdict records keep text hash + extracted claims **with PII redacted**; audit pages show redacted text.
- Redaction regexes: Aadhaar `\b\d{4}\s?\d{4}\s?\d{4}\b`, PAN `[A-Z]{5}\d{4}[A-Z]`, Indian mobile `(?:\+91[\-\s]?)?[6-9]\d{9}`, UPI `[\w.\-]+@[a-z]+`, account/IFSC patterns.
- A "Delete my check" button deletes by `public_id` + deletion token shown once.
- Privacy notice in plain Hindi/English on the home page. Comply with India's DPDP Act 2023 principles (purpose limitation, minimal collection, deletion on request). Not legal advice; get a review before real deployment.

## 4. Responsible-AI commitments (display on `/about`)
1. **No source, no verdict.** Citations are machine-validated.
2. **We abstain** when evidence is thin and say what we searched.
3. **`FORGED` requires strong, independent evidence**, otherwise we warn without accusing.
4. **We do not judge opinions, politics, or journalism.** Government documents and claims about them only.
5. **We are not a government service** and use no official emblems; the footer states AI-assisted and links to the official source.
6. **Audit trail** for every verdict: corpus snapshot, model, prompt version, signals.
7. **Appeals/feedback**: every result has "Report wrong verdict"; corrections are logged and fed to the dev set.

## 5. Misuse analysis

| Misuse | Mitigation |
|---|---|
| Attackers use the tool to test forgeries until they pass | Rate limiting; only coarse signal categories disclosed, no thresholds in UI; forensic details are explanatory, but thresholds live in server config; verdict is corpus-grounded so a perfect forgery of a *real* notice would match the real one, which is not harmful |
| Weaponizing `FORGED` to discredit legitimate local notices | Two-group rule; coverage disclosure; `UNVERIFIABLE` by default outside corpus; "Out of coverage" explicit reason |
| Impersonating the app (fake "Sarkari Sach" cards) | Cards carry QR to canonical audit page; audit page shows full provenance; domain pinned in about page |
| Harassment (submitting a private individual's message) | Only claim-level extraction; no person-level judgments; PII redaction; report-abuse flow |

## 6. Legal & compliance checklist
- [ ] Respect `robots.txt` and each portal's terms; document in `corpus/README`.
- [ ] Attribute sources prominently; link to originals.
- [ ] No use of national emblem, Ashoka Chakra, or "Government of India" branding implying affiliation (State Emblem of India (Prohibition of Improper Use) Act, 2005 considerations).
- [ ] Disclaimer: informational; not legal advice; verify at the official source.
- [ ] Synthetic fakes watermarked "SAMPLE" in any public repo.
- [ ] Do not register/host lookalike domains; strings only in tests.
- [ ] Keep API keys in env, never in repo (`gitleaks` in CI).

## 7. Operational security checklist (before demo/deploy)
- [ ] `.env` not committed; secrets via env/secret manager.
- [ ] CORS limited to the web origin; CSP header on web app; `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] Rate limit + body size limit at proxy.
- [ ] HTTPS via Caddy; HSTS.
- [ ] DB not exposed publicly; strong passwords.
- [ ] Worker network policy blocks RFC1918 + metadata.
- [ ] Log scrubber active; no raw text at INFO level.
- [ ] Dependency audit run.

## 8. Bias & fairness
- Language parity measured and reported (Hindi vs. English).
- OCR/ASR error analysis by script and accent; show extracted text for user correction.
- Avoid reinforcing urban/English bias: voice-first, regional-language UI strings reviewed by native speakers.
- Known gap disclosure: corpus coverage is central-government-heavy; state schemes underrepresented. The UI says "Out of coverage" rather than guessing.

## 9. Incident playbook (short)
If a wrong `FORGED` is reported: (1) flip audit page to "Under review" banner; (2) add case to dev set; (3) check signals; (4) adjust thresholds/tests; (5) publish correction note on the audit page.
