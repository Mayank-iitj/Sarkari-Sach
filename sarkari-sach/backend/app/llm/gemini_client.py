from __future__ import annotations
import json
import os
import re
from typing import Any
import httpx
from app.settings import settings


class GeminiClient:
    """
    Native Google Gemini LLM Client (Gemini 2.5 / 3.1 Flash-Lite).
    Communicates directly with the official Google AI Studio Gemini REST API.
    """

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        """
        Calls Gemini with structured JSON output enforcement.
        """
        if not self.api_key:
            # Fall back gracefully to deterministic engine
            from app.llm.fake_client import FakeClient
            return FakeClient().json(system, user, schema, images=images)

        user_content = str(user)
        prompt = f"""System: {system}

User Request: {user_content}

CRITICAL: Return ONLY valid raw JSON matching this schema, with no markdown code fences:
{json.dumps(schema, indent=2)}"""

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json"
            }
        }

        try:
            with httpx.Client(timeout=25.0) as client:
                resp = client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_part = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                        # Clean json fences if any
                        clean_text = re.sub(r'^```json\s*', '', text_part.strip(), flags=re.MULTILINE)
                        clean_text = re.sub(r'```$', '', clean_text.strip(), flags=re.MULTILINE)
                        return json.loads(clean_text)
        except Exception as e:
            print(f"[GeminiClient] Fallback to deterministic engine due to: {e}")

        # Fallback to deterministic offline engine
        from app.llm.fake_client import FakeClient
        return FakeClient().json(system, user, schema, images=images)

    def text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 400
    ) -> str:
        """
        Calls Gemini to generate grounded plain language explanation text.
        """
        if not self.api_key:
            from app.llm.fake_client import FakeClient
            return FakeClient().text(system, user, max_tokens=max_tokens)

        payload = {
            "contents": [
                {
                    "parts": [{"text": f"System: {system}\n\nTask: {user}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": max_tokens
            }
        }

        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception as e:
            print(f"[GeminiClient] Text fallback: {e}")

        from app.llm.fake_client import FakeClient
        return FakeClient().text(system, user, max_tokens=max_tokens)

