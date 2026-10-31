from __future__ import annotations
import ipaddress
import socket
from urllib.parse import urlparse
import tldextract
from rapidfuzz.distance import Levenshtein
from app.verdict.engine import Signal
from app.settings import settings

OFFICIAL_SUFFIXES = ("gov.in", "nic.in", "rbi.org.in", "sebi.gov.in")
SUSPECT_TLDS = {
    "xyz", "top", "shop", "click", "online", "site", "icu", "live", "cfd", "in.net", "club", "vip", "link", "buzz"
}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly", "cutt.ly", "rb.gy"}
GOVT_BRAND_TOKENS = {
    "pmkisan", "pmay", "ayushman", "aadhaar", "uidai", "scholarship", "nsp",
    "epfo", "gst", "incometax", "fastag", "sarkari", "yojana", "gov", "nic",
    "rrb", "railway", "mudra", "recruitment", "रेलवे", "भर्ती", "मुद्रा"
}

BLOCKED_NETS = [
    ipaddress.ip_network(n) for n in (
        "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
        "169.254.0.0/16", "::1/128", "fc00::/7", "fe80::/10"
    )
]


def extract_registrable(url: str) -> tuple[str, str]:
    """Returns (registrable_domain, host)."""
    if "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0].lower()
    ext = tldextract.extract(host)
    if ext.suffix:
        reg = f"{ext.domain}.{ext.suffix}".lower()
    else:
        reg = host
    return reg, host


def is_official_domain(reg: str, host: str, official_set: set[str]) -> bool:
    if reg in official_set or host in official_set:
        return True
    return any(host.endswith(sfx) or reg.endswith(sfx) for sfx in OFFICIAL_SUFFIXES)


def assert_public_url(url: str):
    """SSRF guard: ensure host is not a private/reserved IP."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Invalid URL scheme")
    host = parsed.hostname or ""
    try:
        addrinfo = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
        for item in addrinfo:
            ip = ipaddress.ip_address(item[4][0])
            if any(ip in net for net in BLOCKED_NETS):
                raise ValueError(f"Blocked private IP: {ip}")
    except socket.gaierror:
        pass  # host might not resolve in offline mode; safe to analyze statically


def analyze_link(url: str, official_set: set[str] | None = None) -> list[Signal]:
    signals: list[Signal] = []
    if not url:
        return signals

    if official_set is None:
        official_set = settings.get_official_domains()

    reg, host = extract_registrable(url)
    ext = tldextract.extract(host)
    label = ext.domain.lower()
    suffix = ext.suffix.lower()

    # 1. Homoglyph / Punycode check
    if "xn--" in host:
        signals.append(Signal(
            signal_id="LINK_HOMOGLYPH",
            group="LINK",
            severity="hard",
            score=1.0,
            explanation=f"Domain {host} uses punycode or lookalike script impersonating official services."
        ))

    # 2. Official check
    official = is_official_domain(reg, host, official_set)

    # 3. APK download
    if url.lower().endswith(".apk") or ".apk?" in url.lower():
        signals.append(Signal(
            signal_id="LINK_APK_DOWNLOAD",
            group="LINK",
            severity="hard",
            score=1.0,
            explanation=f"Direct APK download detected ({url}); official government services do not distribute updates via raw APK links."
        ))

    # 4. Shortener check
    if reg in SHORTENERS or host in SHORTENERS:
        signals.append(Signal(
            signal_id="LINK_SHORTENER",
            group="LINK",
            severity="soft",
            score=0.8,
            explanation=f"Shortened link ({host}) conceals the real destination."
        ))

    # 5. Lookalike / Brand squat check (HARD signal when imitating govt services)
    if not official:
        matched_brand = [tok for tok in GOVT_BRAND_TOKENS if tok in label.replace("-", "")]
        is_lookalike = False
        lookalike_detail = {}

        for off in official_set:
            off_label = off.split(".")[0]
            d = Levenshtein.distance(label, off_label)
            # If close edit distance (e.g. pmkissan vs pmkisan) or brand embedded in unauthorized domain
            if (d <= 2 and label != off_label) or (off_label in label.replace("-", "") and len(off_label) >= 4):
                is_lookalike = True
                lookalike_detail = {"official": off, "candidate": reg, "edit_distance": d}
                break

        if is_lookalike or (matched_brand and not suffix.endswith("gov.in")):
            signals.append(Signal(
                signal_id="LINK_LOOKALIKE",
                group="LINK",
                severity="hard",
                score=0.95,
                explanation=f"{reg} imitates official government domain {lookalike_detail.get('official', 'official portal')} (matched tokens: {matched_brand or [label]})."
            ))

        # 6. Suspect TLD
        if suffix in SUSPECT_TLDS or any(suffix.endswith(f".{t}") for t in SUSPECT_TLDS):
            signals.append(Signal(
                signal_id="LINK_TLD_SUSPECT",
                group="LINK",
                severity="soft",
                score=0.85,
                explanation=f"Domain uses high-risk commercial TLD (.{suffix}) for an alleged government claim."
            ))

        # 7. Not official general notice
        signals.append(Signal(
            signal_id="LINK_NOT_OFFICIAL",
            group="LINK",
            severity="soft" if matched_brand else "info",
            score=0.7,
            explanation=f"{reg} is not registered in the Government of India official domain registry."
        ))

    return signals

