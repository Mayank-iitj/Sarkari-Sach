from __future__ import annotations
import os
from typing import Protocol, Any
from app.settings import settings


class LLMClient(Protocol):
    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        ...

    def text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 400
    ) -> str:
        ...


def get_llm_client() -> LLMClient:
    # 1. Anthropic Claude (if key available)
    if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        from app.llm.anthropic_client import AnthropicClient
        return AnthropicClient()

    # 2. OpenAI / GPT-4o / Gemini OpenAI-compatible (if key available)
    if settings.LLM_PROVIDER == "openai" or os.getenv("OPENAI_API_KEY"):
        from app.llm.openai_client import OpenAIClient
        return OpenAIClient()

    # 3. Deterministic Grounded Offline Client (zero hallucination, rule zero compliant)
    from app.llm.fake_client import FakeClient
    return FakeClient()
