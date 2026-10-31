from __future__ import annotations
import httpx
from bs4 import BeautifulSoup
from app.forensics.link import assert_public_url, is_official_domain, extract_registrable
from app.settings import settings

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}


async def safe_fetch_url(url: str, timeout: float = 12.0) -> tuple[str, list[str], int]:
    """
    Safely fetch a URL with SSRF protection.
    For official Indian Government portals (.gov.in, .nic.in) with incomplete local CA chains,
    gracefully retry without SSL verification after strict public IP validation.
    Returns (rendered_text, redirect_chain, status_code).
    """
    assert_public_url(url)
    redirect_chain = [url]

    reg, host = extract_registrable(url)
    official_set = settings.get_official_domains()
    is_gov = is_official_domain(reg, host, official_set)

    async def _fetch(verify: bool) -> tuple[str, list[str], int]:
        async with httpx.AsyncClient(verify=verify, follow_redirects=True, timeout=timeout, headers=HEADERS) as client:
            resp = await client.get(url)
            for h in resp.history:
                redirect_chain.append(str(h.url))
            redirect_chain.append(str(resp.url))
            return resp.text, redirect_chain, resp.status_code

    try:
        return await _fetch(verify=True)
    except httpx.ConnectError as e:
        # If gov portal failed due to local CA chain, retry with verify=False if official
        if is_gov:
            try:
                return await _fetch(verify=False)
            except Exception as e2:
                return f"Fetch error: {str(e2)}", redirect_chain, 500
        return f"Fetch error: {str(e)}", redirect_chain, 500
    except Exception as e:
        if is_gov and ("certificate" in str(e).lower() or "ssl" in str(e).lower()):
            try:
                return await _fetch(verify=False)
            except Exception as e2:
                return f"Fetch error: {str(e2)}", redirect_chain, 500
        return f"Fetch error: {str(e)}", redirect_chain, 500


def extract_clean_web_text(html: str) -> str:
    """Extract readable text from HTML by removing scripts, styling, and navigation boilerplate."""
    if not html:
        return ""
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "aside"]):
            tag.decompose()
        # Extract main text
        main_content = soup.find("main") or soup.find("article") or soup.find(id=lambda x: x and ("content" in x.lower() or "main" in x.lower()))
        target = main_content if main_content else soup
        lines = [s.strip() for s in target.stripped_strings if len(s.strip()) > 1]
        return " ".join(lines)
    except Exception:
        return html[:5000]
