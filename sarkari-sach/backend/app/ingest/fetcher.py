from __future__ import annotations
import httpx
from app.forensics.link import assert_public_url


async def safe_fetch_url(url: str, timeout: float = 10.0) -> tuple[str, list[str], int]:
    """
    Safely fetch a URL with SSRF protection.
    Returns (rendered_text, redirect_chain, status_code).
    """
    assert_public_url(url)
    redirect_chain = [url]

    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        try:
            resp = await client.get(url, headers={"User-Agent": "SarkariSachBot/1.0 (+https://sarkarisach.example)"})
            for h in resp.history:
                redirect_chain.append(str(h.url))
            redirect_chain.append(str(resp.url))
            return resp.text, redirect_chain, resp.status_code
        except Exception as e:
            return f"Fetch error: {str(e)}", redirect_chain, 500

