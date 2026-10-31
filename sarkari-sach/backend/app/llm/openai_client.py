from __future__ import annotations
import json
import os
from typing import Any
from openai import OpenAI


class OpenAIClient:
    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL")
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url) if self.api_key else None

    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        if not self.client:
            from app.llm.fake_client import FakeClient
            return FakeClient().json(system, user, schema, images=images)

        user_content = []
        if isinstance(user, str):
            user_content.append({"type": "text", "text": user})
        elif isinstance(user, list):
            user_content.extend(user)

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system + "\nYou must reply with valid JSON conforming to the schema."},
                {"role": "user", "content": user if isinstance(user, str) else str(user)}
            ]
        )
        content_text = response.choices[0].message.content or "{}"
        try:
            return json.loads(content_text)
        except Exception:
            import re
            m = re.search(r'\{.*\}', content_text, re.DOTALL)
            if m:
                return json.loads(m.group(0))
            raise ValueError(f"Failed to parse LLM JSON: {content_text}")

    def text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 400
    ) -> str:
        if not self.client:
            from app.llm.fake_client import FakeClient
            return FakeClient().text(system, user, max_tokens=max_tokens)

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.0,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ]
        )
        return (response.choices[0].message.content or "").strip()

