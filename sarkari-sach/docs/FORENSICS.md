# FORENSICS: Sarkari Sach

Goal: produce **explainable signals**, not a black-box fake score. Each signal is `{signal_id, group, severity, score, evidence, explanation}`.

## 1. Philosophy
- **Hard** signal: strong, near-deterministic evidence (e.g., domain impersonates an official one and is not on the allowlist).
- **Soft** signal: suggestive, can occur in genuine files (e.g., PDF produced by a consumer editor).
- **Info**: context only.
- `FORGED` needs **≥2 hard signals from different groups** (LINK, DOCUMENT, IDENTIFIER, PROVENANCE) or an official debunk match.
- Soft signals produce warnings and lower confidence; they never alone produce `FORGED`.
- A check that couldn't run produces an `info` signal ("unavailable"), never evidence.

## 2. Signal catalog

### 2.1 LINK group
| signal_id | Severity | Trigger |
|---|---|---|
| `LINK_NOT_OFFICIAL` | info→soft | Registered domain not in `official_domains` (soft only if claim cites govt benefit) |
| `LINK_LOOKALIKE` | **hard** | Edit-distance/token similarity to official domain ≥ threshold AND not official; or contains official brand token (`pmkisan`, `gov`, `nic`) in non-official registrable domain |
| `LINK_HOMOGLYPH` | **hard** | Punycode (`xn--`) or mixed-script label/confusables resolving to official-looking string |
| `LINK_TLD_SUSPECT` | soft | `.xyz .top .shop .click .online .site .icu .live .cfd .in.net` etc. with govt claim |
| `LINK_SHORTENER` | soft | bit.ly/tinyurl/etc.; unwrapped and re-evaluated |
| `LINK_REDIRECT_OFFSITE` | soft→hard | Chain ends on a different registrable domain than shown; hard if end is non-official but claims official |
| `LINK_NEW_DOMAIN` | soft (hard when <30 d and lookalike) | WHOIS/RDAP creation age |
| `LINK_TLS_MISMATCH` | soft | Cert subject/issuer anomalies (self-signed, free CA + brand word), no HTTPS |
| `LINK_APK_DOWNLOAD` | **hard** | Link/response serves `.apk`/`application/vnd.android.package-archive` for govt claim |
| `LINK_FORM_COLLECTS_SENSITIVE` | soft | Landing page form asks for Aadhaar/OTP/UPI PIN/card number |
| `LINK_QR_TARGET` | inherits | QR payload evaluated as a link |

### 2.2 DOCUMENT group (PDF/image)
| signal_id | Severity | Trigger |
|---|---|---|
| `PDF_PRODUCER_CONSUMER` | soft | Producer/Creator = Canva, WPS, Photoshop, Word Online, mobile "Scanner" apps on a doc claiming Gazette/ministry origin |
| `PDF_DATE_INCONSISTENT` | soft | `ModDate` far after `CreationDate`, or PDF creation date earlier than the notification date printed inside it (a file cannot be created before the date it states). Soft only: portals re-save files, so never sufficient alone |
| `PDF_INCREMENTAL_UPDATE` | soft | Multiple `%%EOF` revisions → edited after creation |
| `PDF_FONT_MIX` | soft | Unusual font substitutions on numbers/dates vs. body (text edited) |
| `PDF_NO_TEXT_LAYER_FLAT_IMAGE` | info | Image-only PDF (common in scans and fakes) |
| `IMG_LETTERHEAD_MISMATCH` | soft→hard | pHash/ORB similarity to reference official letterhead below threshold while text claims that issuer; hard only if emblem region is malformed AND issuer claimed |
| `IMG_TEXT_OVERLAY` | soft | Locally different JPEG compression/noise around numeric regions (ELA/noise residual) |
| `IMG_EXIF_EDITOR` | info | EXIF software = Photoshop/Canva/PicsArt etc. |
| `IMG_SCREENSHOT_OF_SCREENSHOT` | info | Resolution/UI-chrome heuristics |

> ELA/noise are **weak** and noisy on WhatsApp-recompressed images. They are `soft` only and clearly labeled in the UI.

### 2.3 IDENTIFIER group
| signal_id | Severity | Trigger |
|---|---|---|
| `ID_FORMAT_INVALID` | soft→hard | File/notification number doesn't match any learned pattern for the claimed issuer (hard only when the issuer's pattern set has ≥30 samples and 0 matches) |
| `ID_NOT_FOUND_IN_CORPUS` | soft | Identifier absent from Gazette corpus *within coverage window*; **never hard** if outside coverage |
| `ID_DATE_IMPLAUSIBLE` | soft→hard | Future-dated, weekday inconsistent with "dated" statement, non-existent date (31 Feb) |
| `ID_ISSUER_MISMATCH` | **hard** | Identifier belongs to a real document with different issuer/subject than claimed |
| `FEE_CONTRADICTION` | **hard** | Claim demands fee/charge; official doc for that scheme states free/no fee |
| `DEADLINE_PRESSURE` | soft | Urgency language + payment demand ("today only", "आज ही") |
| `CONTACT_SUSPECT` | soft | Personal mobile number/WhatsApp/UPI VPA as official contact |

### 2.4 PROVENANCE group
| signal_id | Severity | Trigger |
|---|---|---|
| `DEBUNK_MATCH` | **hard** | Nearest PIB Fact Check claim score ≥0.85 + entity overlap |
| `DEBUNK_NEAR` | info | 0.7-0.85, shown as "similar to a debunked claim" |

## 3. Reference implementations

### 3.1 Link analysis
```python
import tldextract, idna, ipaddress
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein
from confusable_homoglyphs import confusables

OFFICIAL_SUFFIXES = ("gov.in", "nic.in")  # plus explicit entries from official_domains

def registrable(url): 
    e = tldextract.extract(url); return f"{e.domain}.{e.suffix}", e

def is_official(host_reg: str, official: set[str]) -> bool:
    return host_reg in official or host_reg.endswith(OFFICIAL_SUFFIXES)

def lookalike(host_reg: str, official: set[str]) -> tuple[bool, dict]:
    label = host_reg.split(".")[0]
    best = None
    for off in official:
        off_label = off.split(".")[0]
        d = Levenshtein.distance(label, off_label)
        sim = fuzz.partial_ratio(label.replace("-", ""), off_label)
        brand_in = off_label in label.replace("-", "") and not is_official(host_reg, official)
        if brand_in or (d <= 2 and label != off_label) or sim >= 90:
            cand = {"official": off, "candidate": host_reg, "edit_distance": d, "partial_ratio": sim, "brand_in": brand_in}
            if best is None or d < best["edit_distance"]: best = cand
    return (best is not None, best or {})

def homoglyph(host: str) -> bool:
    if "xn--" in host: return True
    try:
        decoded = idna.decode(host)
    except Exception:
        return False
    return bool(confusables.is_dangerous(decoded))

GOVT_BRAND_TOKENS = {"pmkisan","pmay","ayushman","aadhaar","uidai","scholarship","nsp","epfo","gst","incometax","fastag","sarkari","yojana","gov"}
def brand_squat(label: str) -> list[str]:
    flat = label.replace("-", "")
    return [t for t in GOVT_BRAND_TOKENS if t in flat]
```

Rule: `LINK_LOOKALIKE` fires hard if `not is_official` and (`lookalike` true **or** (`brand_squat` non-empty AND TLD not in official suffixes)). Example: `pmkisan-yojana.in` → hard; `my-blog.com` → none.

### 3.2 Safe redirect tracing (SSRF-guarded)
```python
import httpx, socket, ipaddress
from urllib.parse import urlparse

BLOCKED_NETS = [ipaddress.ip_network(n) for n in
  ("127.0.0.0/8","10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","169.254.0.0/16","::1/128","fc00::/7","fe80::/10")]

def assert_public(url: str):
    p = urlparse(url)
    if p.scheme not in ("http","https"): raise ValueError("scheme")
    for fam,_,_,_,addr in socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme=="https" else 80)):
        ip = ipaddress.ip_address(addr[0])
        if any(ip in n for n in BLOCKED_NETS): raise ValueError("blocked_ip")

async def trace(url: str, max_hops=6, timeout=6.0):
    chain = []
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout,
                                 headers={"User-Agent":"SarkariSachBot/1.0"}) as c:
        cur = url
        for _ in range(max_hops):
            assert_public(cur)                 # re-check every hop (DNS rebinding defense: resolve once, connect to IP in prod)
            r = await c.get(cur)
            chain.append({"url": cur, "status": r.status_code, "ctype": r.headers.get("content-type","")})
            if r.is_redirect and "location" in r.headers:
                cur = str(httpx.URL(cur).join(r.headers["location"]))
            else:
                return chain, r
        return chain, None
```
Never execute JS from suspect pages in the main process. If JS rendering is needed, use an isolated Playwright container with no network access to internal ranges and no credentials; extract only text/forms/URL.

### 3.3 Domain age
```python
import httpx, datetime as dt
async def domain_age_days(reg: str) -> int | None:
    try:
        r = await httpx.AsyncClient(timeout=5).get(f"https://rdap.org/domain/{reg}")
        ev = {e["eventAction"]: e["eventDate"] for e in r.json().get("events", [])}
        created = dt.datetime.fromisoformat(ev["registration"].replace("Z","+00:00"))
        return (dt.datetime.now(dt.timezone.utc) - created).days
    except Exception:
        return None  # emits info signal "age unavailable"
```
`.in` RDAP availability varies; fall back to `python-whois`; else emit `info`.

### 3.4 PDF analysis
```python
import pikepdf, re, datetime as dt

CONSUMER = re.compile(r"canva|wps|photoshop|illustrator|word online|camscanner|adobe scan|ilovepdf|smallpdf|sejda|libreoffice|microsoft.*word", re.I)

def analyze_pdf(path: str, printed_date: dt.date | None):
    sig = []
    with pikepdf.open(path) as pdf:
        info = {str(k): str(v) for k, v in (pdf.docinfo or {}).items()}
        prod = info.get("/Producer","") + " " + info.get("/Creator","")
        if CONSUMER.search(prod):
            sig.append(("PDF_PRODUCER_CONSUMER","soft",{"producer":prod.strip()}))
        c, m = info.get("/CreationDate"), info.get("/ModDate")
        cd, md = parse_pdf_date(c), parse_pdf_date(m)
        if cd and md and (md - cd).days > 1:
            sig.append(("PDF_DATE_INCONSISTENT","soft",{"created":str(cd),"modified":str(md)}))
        if cd and printed_date and cd.date() < printed_date - dt.timedelta(days=1):
            sig.append(("PDF_DATE_INCONSISTENT","soft",{"note":"file created before the date printed in it"}))
    raw = open(path,"rb").read()
    if raw.count(b"%%EOF") > 1:
        sig.append(("PDF_INCREMENTAL_UPDATE","soft",{"revisions":raw.count(b"%%EOF")}))
    if b"/JavaScript" in raw or b"/JS" in raw or b"/Launch" in raw:
        sig.append(("PDF_ACTIVE_CONTENT","soft",{}))
    return sig
```
Important nuance: genuine Gazette PDFs can be produced by many tools and re-saved by portals. **Document-level signals are mostly soft.** They become hard only in combination with identifier/issuer mismatch, and are never the sole basis for `FORGED`.

### 3.5 Image checks
```python
import imagehash, cv2, numpy as np
from PIL import Image, ImageChops
import io

def ela_score(img: Image.Image, q=90) -> float:
    buf = io.BytesIO(); img.convert("RGB").save(buf, "JPEG", quality=q); buf.seek(0)
    resaved = Image.open(buf)
    diff = ImageChops.difference(img.convert("RGB"), resaved)
    arr = np.asarray(diff).astype("float32")
    return float(arr.std() / (arr.mean() + 1e-6))       # heterogeneity; calibrate on dev set

def letterhead_similarity(img: Image.Image, refs: list[Image.Image]) -> float:
    h = imagehash.phash(img.crop((0,0,img.width,int(img.height*0.2))))
    return 1 - min(h - imagehash.phash(r) for r in refs) / 64.0
```
Calibration: compute ELA/letterhead distributions on genuine PIB/Gazette screenshots **after WhatsApp-style recompression** (simulate: JPEG q=60-75, resize 0.5-0.8) to set thresholds; otherwise false alarms.

### 3.6 QR
```python
import cv2
def decode_qr(img_bgr):
    d = cv2.QRCodeDetector()
    val, pts, _ = d.detectAndDecode(img_bgr)
    return val or None
```

### 3.7 Identifier patterns (learned)
At ingest, mine `doc_number` strings per issuer; store regex families and sample counts. Validator:
```python
def id_format_check(issuer: str, ident: str, patterns: dict[str, list[re.Pattern]], n_samples: dict[str,int]):
    pats = patterns.get(issuer, [])
    if n_samples.get(issuer,0) < 30: return ("unknown", None)    # insufficient basis, never hard
    return ("valid", None) if any(p.fullmatch(ident) for p in pats) else ("invalid", None)
```

### 3.8 Fee contradiction
Compare `claim.fields["fee"]` to scheme provisions: if provision `fee` says `free|no fee|nil|निःशुल्क|कोई शुल्क नहीं` (validated quote) and claim demands a payment → `FEE_CONTRADICTION` (hard, IDENTIFIER group).

## 4. Combining signals (examples)

| Scenario | Signals | Result |
|---|---|---|
| Fake scheme poster, `pmkisan-yojana.in`, ₹250 fee | LINK_LOOKALIKE (hard, LINK) + FEE_CONTRADICTION (hard, IDENTIFIER) | `FORGED` |
| Genuine PIB screenshot recompressed by WhatsApp | IMG_TEXT_OVERLAY (soft), no official-link issue, matches corpus | `CONFIRMED` |
| Real notice, changed deadline | No hard signals; field mismatch on deadline | `ALTERED` |
| Odd link, no scheme found in corpus | LINK_NOT_OFFICIAL + TLD soft; no evidence | `UNVERIFIABLE` + warning "suspicious link" |
| Lookalike link only, nothing else | One hard signal (LINK) | `UNVERIFIABLE` + strong warning (**not** FORGED) |

> The last row is deliberate: one hard group alone can't produce `FORGED`. Optionally allow `LINK_LOOKALIKE + LINK_NEW_DOMAIN(<30d)` as the same group → still one group. If you want lookalike alone to be `FORGED`, make that a configurable policy flag, default off, and document the false-positive trade-off.

## 5. Safety of the analyzers
- Uploaded PDFs/images parsed in a sandboxed worker (non-root, read-only FS, no network, CPU/mem/time limits).
- Never open links in a real user browser profile; headless isolated container only.
- Strip active content; never render untrusted HTML directly in the app; sanitize extracted text.
- Treat OCR/PDF text as untrusted input to the LLM (prompt-injection defense, see PROMPTS.md).

## 6. Unit tests (must exist)
`test_lookalike.py` (≥40 domain pairs), `test_homoglyph.py`, `test_redirect_ssrf.py` (private IP, DNS rebinding mock, `file://`), `test_pdf_signals.py` (fixtures: genuine, Canva-made, incrementally edited), `test_fee_contradiction.py`, `test_signal_combination.py` (matrix above).
