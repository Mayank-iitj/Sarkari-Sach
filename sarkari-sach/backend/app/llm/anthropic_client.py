from __future__ import annotations
import json
from typing import Any
from anthropic import Anthropic
from app.settings import settings


class AnthropicClient:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.LLM_MODEL or "claude-3-5-sonnet-20241022"
        self.client = Anthropic(api_key=self.api_key) if self.api_key else None

    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        if not self.client:
            # Fall back to live Gemini client
            from app.llm.gemini_client import GeminiClient
            return GeminiClient().json(system, user, schema, images=images)

        user_content = []
        if isinstance(user, str):
            user_content.append({"type": "text", "text": user})
        elif isinstance(user, list):
            user_content.extend(user)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.0,
            system=system,
            messages=[{"role": "user", "content": user_content}]
        )
        content_text = ""
        for block in response.content:
            if block.type == "text":
                content_text += block.text

        # Try to parse json from response
        try:
            return json.loads(content_text)
        except Exception:
            # Attempt to extract json block
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
            from app.llm.gemini_client import GeminiClient
            return GeminiClient().text(system, user, max_tokens=max_tokens)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.0,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return "".join([b.text for b in response.content if b.type == "text"])

